import concurrent.futures
import requests
from bs4 import BeautifulSoup
from newspaper import Article
import csv
from datetime import datetime
import argparse
import json
import os
import re
from urllib.parse import urljoin
import tweepy
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import logging

# Configuración de logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s', handlers=[
    logging.FileHandler('radar_optimo.log', encoding='utf-8'),
    logging.StreamHandler()
])

# Configuración
MAX_WORKERS = min(10, os.cpu_count() * 2 if os.cpu_count() else 5)  # Optimizado para CPU
TODAY = datetime.now().date()
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
OUTPUT_PATH = 'noticias.csv'

# Configuración de argumentos
parser = argparse.ArgumentParser(description='Radar de noticias optimizado')
parser.add_argument('--keywords', type=str, help='Lista de palabras clave (JSON)')
parser.add_argument('--keywords-file', type=str, help='Archivo JSON con palabras clave')
parser.add_argument('--sources', type=str, help='Lista de fuentes (JSON)')
parser.add_argument('--sources-file', type=str, help='Archivo JSON con fuentes')
parser.add_argument('--twitter-users', type=str, help='Usuarios de Twitter (JSON)')
parser.add_argument('--output', type=str, default=OUTPUT_PATH, help='Ruta de salida CSV')
parser.add_argument('--max-workers', type=int, default=MAX_WORKERS, help='Cantidad de workers')
parser.add_argument('--validate-links', action='store_true', help='Validar enlaces antes de procesar')
parser.add_argument('--today-only', action='store_true', help='Solo noticias de hoy')
parser.add_argument('--max-links-per-site', type=int, default=100, help='Máximo de enlaces por sitio')
parser.add_argument('--deep-scrape', action='store_true', help='Realizar scraping profundo (seguir enlaces secundarios)')
args = parser.parse_args()

# Cargar palabras clave y fuentes
KEYWORDS = []
NEWS_SOURCES = []
TWITTER_USERS = []

if args.keywords:
    KEYWORDS = json.loads(args.keywords)
elif args.keywords_file:
    with open(args.keywords_file, 'r', encoding='utf-8') as f:
        KEYWORDS = json.load(f)
if args.sources:
    NEWS_SOURCES = json.loads(args.sources)
elif args.sources_file:
    with open(args.sources_file, 'r', encoding='utf-8') as f:
        NEWS_SOURCES = json.load(f)
if args.twitter_users:
    TWITTER_USERS = json.loads(args.twitter_users)
if args.output:
    OUTPUT_PATH = args.output

# Validar entradas
if not KEYWORDS:
    raise ValueError("Se requieren keywords")
if not NEWS_SOURCES and not TWITTER_USERS:
    raise ValueError("Se requieren fuentes o usuarios de Twitter")

# Configuración de requests con reintentos
session = requests.Session()
retries = Retry(total=5, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504])
session.mount('http://', HTTPAdapter(max_retries=retries))
session.mount('https://', HTTPAdapter(max_retries=retries))

def is_relevant(text, title=""):
    """Verifica si el texto o título contiene palabras clave, con puntuación."""
    score = 0
    text_lower = (text + " " + title).lower()
    for keyword in KEYWORDS:
        if keyword.lower() in text_lower:
            score += 1
    return score > 0, score

def extract_date_from_html(soup):
    """Extrae la fecha desde el HTML si newspaper no lo hace."""
    try:
        date_tags = soup.find_all(['time', 'meta'], {'property': ['article:published_time', 'og:published_time', 'datePublished', 'dc.date', 'pubdate', 'article:modified_time']})
        for tag in date_tags:
            date_str = tag.get('datetime') or tag.get('content') or tag.get_text()
            if date_str:
                try:
                    return datetime.fromisoformat(date_str.replace('Z', '+00:00')).date()
                except ValueError:
                    try:
                        return datetime.strptime(date_str, '%Y-%m-%d').date()
                    except ValueError:
                        continue
        # Patrones de fecha en el texto
        text = soup.get_text()
        date_patterns = [
            r'\b(\d{4}-\d{2}-\d{2})\b',
            r'\b(\d{1,2}/\d{1,2}/\d{4})\b',
            r'\b(\d{1,2}\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+\d{4})\b',
            r'\b(\d{1,2}\s+[A-Za-z]+\s+\d{4})\b'
        ]
        for pattern in date_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    date_str = match.group(1)
                    if '-' in date_str:
                        return datetime.strptime(date_str, '%Y-%m-%d').date()
                    elif '/' in date_str:
                        return datetime.strptime(date_str, '%d/%m/%Y').date()
                    else:
                        try:
                            return datetime.strptime(date_str, '%d %B %Y').date()
                        except ValueError:
                            return datetime.strptime(date_str, '%d %b %Y').date()
                except ValueError:
                    continue
    except Exception as e:
        logging.warning(f"Error extrayendo fecha del HTML: {e}")
    return None

def is_article_url(url):
    """Filtra URLs que probablemente sean artículos."""
    article_patterns = [
        r'/noticia', r'/article', r'/\d{4}/\d{2}/\d{2}', r'/politica', r'/economia',
        r'/sociedad', r'/noticias', r'/seccion', r'-[0-9]+$', r'\.html$', r'/[a-z0-9-]+/\d+$'
    ]
    non_article_patterns = [r'/tag/', r'/category/', r'/archive/', r'/search/', r'/login/', r'\.pdf$']
    return (
        any(re.search(pattern, url, re.IGNORECASE) for pattern in article_patterns) and
        not any(re.search(pattern, url, re.IGNORECASE) for pattern in non_article_patterns)
    )

def validate_link(url):
    """Valida si un enlace es accesible."""
    try:
        response = session.head(url, headers=HEADERS, timeout=5, allow_redirects=True)
        return response.status_code == 200
    except Exception as e:
        logging.debug(f"Enlace no válido {url}: {e}")
        return False

def process_article(url, source_url):
    """Procesa un artículo y devuelve datos si es relevante."""
    try:
        article = Article(url, request_timeout=25)  # Timeout aumentado a 25 segundos
        article.download()
        article.parse()
        soup = BeautifulSoup(article.html, 'html.parser')
        
        publish_date = article.publish_date.date() if article.publish_date else extract_date_from_html(soup)
        if not publish_date:
            logging.debug(f"No se pudo extraer fecha para {url}, usando fecha actual")
            publish_date = TODAY
        
        is_rel, score = is_relevant(article.text, article.title)
        if (not args.today_only or publish_date == TODAY) and is_rel:
            return {
                "title": article.title or "Sin título",
                "date": publish_date,
                "url": url,
                "description": article.text[:300].replace('\n', ' ').strip(),
                "source": source_url,
                "relevance_score": score
            }
        else:
            logging.debug(f"Artículo descartado {url}: {'no es de hoy' if args.today_only and publish_date != TODAY else 'no relevante'}")
    except Exception as e:
        logging.error(f"Error procesando {url}: {e}")
    return None

def scrape_site(source_url):
    """Recolecta y procesa artículos de un sitio."""
    try:
        response = session.get(source_url, headers=HEADERS, timeout=15)
        soup = BeautifulSoup(response.text, 'html.parser')
        links = set()
        for a in soup.find_all('a', href=True):
            link = a['href']
            if not link.startswith('http'):
                link = urljoin(source_url, link)
            if link.startswith('http') and is_article_url(link):
                links.add(link)
        
        if args.deep_scrape:
            # Scraping profundo: seguir hasta 10 enlaces secundarios
            secondary_links = set()
            for link in list(links)[:10]:  # Limitar para eficiencia
                try:
                    response = session.get(link, headers=HEADERS, timeout=15)
                    secondary_soup = BeautifulSoup(response.text, 'html.parser')
                    for a in secondary_soup.find_all('a', href=True):
                        sec_link = a['href']
                        if not sec_link.startswith('http'):
                            sec_link = urljoin(source_url, sec_link)
                        if sec_link.startswith('http') and is_article_url(sec_link):
                            secondary_links.add(sec_link)
                except Exception as e:
                    logging.debug(f"Error en scraping profundo para {link}: {e}")
            links.update(secondary_links)
        
        links = list(links)[:args.max_links_per_site]
        logging.info(f"Encontrados {len(links)} enlaces en {source_url}")
        
        if args.validate_links:
            valid_links = [link for link in links if validate_link(link)]
            logging.info(f"Enlaces válidos en {source_url}: {len(valid_links)}")
        else:
            valid_links = links
        
        results = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = {executor.submit(process_article, link, source_url): link for link in valid_links}
            for future in concurrent.futures.as_completed(futures):
                result = future.result()
                if result:
                    logging.info(f"Noticia encontrada: {result['title']} (Fuente: {result['source']})")
                    results.append(result)
        return results
    except Exception as e:
        logging.error(f"Error accediendo a {source_url}: {e}")
        return []

def scrape_twitter():
    """Obtiene tweets relevantes usando tweepy."""
    results = []
    try:
        client = tweepy.Client(
            bearer_token=os.getenv('TWITTER_BEARER_TOKEN'),
            consumer_key=os.getenv('TWITTER_CONSUMER_KEY'),
            consumer_secret=os.getenv('TWITTER_CONSUMER_SECRET'),
            access_token=os.getenv('TWITTER_ACCESS_TOKEN'),
            access_token_secret=os.getenv('TWITTER_ACCESS_TOKEN_SECRET')
        )
        
        for user in TWITTER_USERS:
            try:
                user_info = client.get_user(username=user)
                tweets = client.get_users_tweets(user_info.data.id, max_results=100)
                for tweet in tweets.data:
                    tweet_date = tweet.created_at.date()
                    if args.today_only and tweet_date != TODAY:
                        continue
                    is_rel, score = is_relevant(tweet.text)
                    if is_rel:
                        logging.info(f"Tweet relevante de @{user}: {tweet.text[:50]}...")
                        results.append({
                            "title": f"Tweet de @{user}",
                            "date": tweet_date,
                            "url": f"https://x.com/{user}/status/{tweet.id}",
                            "description": tweet.text[:300].replace('\n', ' ').strip(),
                            "source": "Twitter",
                            "relevance_score": score
                        })
            except Exception as e:
                logging.error(f"Error accediendo a tweets de @{user}: {e}")
    except Exception as e:
        logging.error(f"Error configurando Twitter API: {e}")
    return results

def main():
    all_results = []
    
    logging.info("Iniciando radar de noticias optimizado...")
    
    # Noticias web
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = {executor.submit(scrape_site, url): url for url in NEWS_SOURCES}
            for future in concurrent.futures.as_completed(futures):
                results = future.result()
                all_results.extend(results)
    except KeyboardInterrupt:
        logging.warning("Programa interrumpido por el usuario. Guardando resultados parciales...")
    
    # Twitter si las credenciales están configuradas
    if os.getenv('TWITTER_BEARER_TOKEN') and TWITTER_USERS:
        try:
            twitter_results = scrape_twitter()
            all_results.extend(twitter_results)
        except KeyboardInterrupt:
            logging.warning("Scraping de Twitter interrumpido. Guardando resultados parciales...")
    
    # Ordenar por relevancia
    all_results.sort(key=lambda x: x['relevance_score'], reverse=True)
    
    # Crear carpeta de salida
    output_dir = os.path.dirname(OUTPUT_PATH)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Guardar resultados en CSV
    with open(OUTPUT_PATH, "w", newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["title", "date", "url", "description", "source", "relevance_score"],
            lineterminator='\n',
            quoting=csv.QUOTE_MINIMAL
        )
        writer.writeheader()
        writer.writerows(all_results)
    
    # Convertir el campo date a cadena para JSON
    json_results = [
        {**result, "date": result["date"].isoformat()} for result in all_results
    ]
    
    # Guardar en JSON
    json_output = OUTPUT_PATH.replace('.csv', '.json')
    with open(json_output, 'w', encoding='utf-8') as f:
        json.dump(json_results, f, ensure_ascii=False, indent=2)
    
    logging.info(f"Total de noticias encontradas: {len(all_results)}")
    logging.info(f"Resultados guardados en: {OUTPUT_PATH} y {json_output}")

if __name__ == "__main__":
    main()