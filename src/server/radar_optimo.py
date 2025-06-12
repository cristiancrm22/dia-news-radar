
import asyncio
import aiohttp
from aiohttp import ClientSession, ClientTimeout
from bs4 import BeautifulSoup
from newspaper import Article
import csv
from datetime import datetime, timedelta
import argparse
import json
import os
import re
from urllib.parse import urljoin, urlparse
import logging
import pickle
from collections import defaultdict
import random

# Configuración de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('radar_optimo_v3.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)

# Configuración
TODAY = datetime.now().date()
YESTERDAY = TODAY - timedelta(days=1)
OUTPUT_PATH = 'noticias.csv'
PROCESSED_URLS = set()  # Caché global de URLs
DOMAIN_SEMAPHORES = defaultdict(asyncio.Semaphore, {k: asyncio.Semaphore(5) for k in []})  # 5 solicitudes por dominio
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.96 Safari/537.36'
]

# Argumentos
parser = argparse.ArgumentParser(description='Radar de noticias optimizado v3')
parser.add_argument('--keywords', type=str, help='Lista de palabras clave (JSON)')
parser.add_argument('--keywords-file', type=str, help='Archivo JSON con palabras clave')
parser.add_argument('--sources', type=str, help='Lista de fuentes (JSON)')
parser.add_argument('--sources-file', type=str, help='Archivo JSON con fuentes')
parser.add_argument('--twitter-users', type=str, help='Usuarios de Twitter (JSON)')
parser.add_argument('--output', type=str, default=OUTPUT_PATH, help='Ruta de salida CSV')
parser.add_argument('--validate-links', action='store_true', help='Validar enlaces antes de procesar')
parser.add_argument('--today-only', action='store_true', help='Solo noticias de hoy')
parser.add_argument('--include-yesterday', action='store_true', help='Incluir noticias de ayer')
parser.add_argument('--max-links-per-site', type=int, default=50, help='Máximo de enlaces por sitio')
parser.add_argument('--deep-scrape', action='store_true', help='Realizar scraping profundo')
parser.add_argument('--max-results', type=int, default=0, help='Máximo de resultados totales (0 para sin límite)')
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

# Caché de resultados
CACHE_FILE = 'radar_cache.pkl'
if os.path.exists(CACHE_FILE):
    with open(CACHE_FILE, 'rb') as f:
        PROCESSED_URLS.update(pickle.load(f))

def is_relevant(text, title=""):
    """Verifica si el texto o título contiene palabras clave."""
    score = 0
    text_lower = (text + " " + title).lower()
    for keyword in KEYWORDS:
        if keyword.lower() in text_lower:
            score += 1
    return score > 0, score

def extract_date_from_html(soup):
    """Extrae la fecha desde el HTML."""
    try:
        date_tags = soup.find_all(['time', 'meta'], {
            'property': ['article:published_time', 'og:published_time', 'datePublished'],
            'name': ['pubdate', 'dc.date']
        })
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
        date_patterns = [
            r'\b(\d{4}-\d{2}-\d{2})\b',
            r'\b(\d{1,2}/\d{1,2}/\d{4})\b',
            r'\b(\d{1,2}-\d{1,2}-\d{4})\b',
            r'publicado\s+el\s+(\d{1,2}/\d{1,2}/\d{4})'
        ]
        text = soup.get_text()[:2000]  # Limitar texto para rapidez
        for pattern in date_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    date_str = match.group(1)
                    if '-' in date_str and len(date_str.split('-')[0]) == 4:
                        return datetime.strptime(date_str, '%Y-%m-%d').date()
                    elif '/' in date_str:
                        return datetime.strptime(date_str, '%d/%m/%Y').date()
                    elif '-' in date_str:
                        return datetime.strptime(date_str, '%d-%m-%Y').date()
                except ValueError:
                    continue
    except Exception as e:
        logging.warning(f"Error extrayendo fecha del HTML: {e}")
    return None

def is_article_url(url):
    """Filtra URLs que probablemente sean artículos."""
    article_patterns = [
        r'/noticia', r'/article', r'/\d{4}/\d{2}/\d{2}', r'/politica', r'/economia',
        r'/sociedad', r'/noticias', r'-[0-9]+$', r'\.html$',
        r'/[a-z0-9-]+/\d+$', r'/[a-z0-9-]+/[a-z0-9-]+$', r'/[a-z0-9-]+$'  # Más flexibles
    ]
    non_article_patterns = [
        r'/login/', r'\.pdf$', r'/tag/', r'/category/', r'/search/',
        r'twitter\.com', r'x\.com', r't\.co', r'bitly\.ws', r'facebook\.com',
        r'instagram\.com', r'youtube\.com', r'whatsapp\.com'
    ]
    parsed_url = urlparse(url)
    return (
        parsed_url.scheme in ['http', 'https'] and
        any(re.search(pattern, parsed_url.path, re.IGNORECASE) for pattern in article_patterns) and
        not any(re.search(pattern, url, re.IGNORECASE) for pattern in non_article_patterns)
    )

async def validate_link(session, url):
    """Valida si un enlace es accesible."""
    try:
        headers = {'User-Agent': random.choice(USER_AGENTS)}
        async with session.head(url, headers=headers, timeout=5, allow_redirects=True) as response:
            return response.status == 200
    except Exception:
        return False

async def fetch_html(session, url, domain):
    """Obtiene el HTML de una URL con control de tasa."""
    async with DOMAIN_SEMAPHORES[domain]:
        try:
            headers = {'User-Agent': random.choice(USER_AGENTS)}
            await asyncio.sleep(0.5)  # Retraso para evitar 429
            async with session.get(url, headers=headers, timeout=10) as response:
                if response.status == 200:
                    return await response.text()
                elif response.status == 429:
                    logging.warning(f"429 Too Many Requests para {url}, esperando 5s")
                    await asyncio.sleep(5)
                    return None
                elif response.status == 403:
                    logging.warning(f"403 Forbidden para {url}, omitiendo")
                    return None
                else:
                    logging.debug(f"Error {response.status} para {url}")
                    return None
        except Exception as e:
            logging.debug(f"Error fetching {url}: {e}")
            return None

async def process_article(session, url, source_url):
    """Procesa un artículo y devuelve datos si es relevante."""
    if url in PROCESSED_URLS:
        return None
    PROCESSED_URLS.add(url)

    try:
        article = Article(url, request_timeout=15)
        article.download()
        article.parse()
        soup = BeautifulSoup(article.html, 'html.parser')

        publish_date = article.publish_date.date() if article.publish_date else extract_date_from_html(soup)
        if not publish_date:
            logging.debug(f"No se pudo extraer fecha para {url}, usando fecha actual")
            publish_date = TODAY

        if args.today_only and publish_date != TODAY and (not args.include_yesterday or publish_date != YESTERDAY):
            logging.debug(f"Artículo descartado {url}: fecha {publish_date} no es de hoy ni de ayer")
            return None

        is_rel, score = is_relevant(article.text, article.title)
        if is_rel:
            return {
                "title": article.title or "Sin título",
                "date": publish_date,
                "url": url,
                "description": article.text[:300].replace('\n', ' ').strip(),
                "source": source_url,
                "relevance_score": score
            }
        else:
            logging.debug(f"Artículo descartado {url}: no relevante")
    except Exception as e:
        logging.error(f"Error procesando {url}: {e}")
    return None

async def scrape_site(session, source_url):
    """Recolecta y procesa artículos de un sitio."""
    domain = urlparse(source_url).netloc
    try:
        html = await fetch_html(session, source_url, domain)
        if not html:
            return []

        soup = BeautifulSoup(html, 'html.parser')
        links = set()
        for a in soup.find_all('a', href=True):
            link = a['href']
            if not link.startswith('http'):
                link = urljoin(source_url, link)
            if link.startswith('http') and is_article_url(link):
                links.add(link)

        if args.deep_scrape:
            secondary_links = set()
            for link in list(links)[:15]:  # Limitar a 15 enlaces primarios
                html = await fetch_html(session, link, domain)
                if html:
                    secondary_soup = BeautifulSoup(html, 'html.parser')
                    for a in secondary_soup.find_all('a', href=True):
                        sec_link = a['href']
                        if not sec_link.startswith('http'):
                            sec_link = urljoin(source_url, sec_link)
                        if sec_link.startswith('http') and is_article_url(sec_link):
                            secondary_links.add(sec_link)
            links.update(secondary_links)

        links = list(links)[:args.max_links_per_site]
        logging.info(f"Encontrados {len(links)} enlaces en {source_url}")

        if args.validate_links:
            valid_links = []
            for link in links:
                if await validate_link(session, link):
                    valid_links.append(link)
            logging.info(f"Enlaces válidos en {source_url}: {len(valid_links)}")
        else:
            valid_links = links

        results = []
        for link in valid_links:
            result = await process_article(session, link, source_url)
            if result:
                logging.info(f"Noticia encontrada: {result['title']} (Fuente: {result['source']})")
                results.append(result)
                if args.max_results > 0 and len(results) >= args.max_results:
                    break
        return results
    except Exception as e:
        logging.error(f"Error accediendo a {source_url}: {e}")
        return []

async def main():
    all_results = []
    async with ClientSession(timeout=ClientTimeout(total=60)) as session:
        logging.info("Iniciando radar de noticias optimizado v3...")
        tasks = [scrape_site(session, url) for url in NEWS_SOURCES]
        for future in asyncio.as_completed(tasks):
            results = await future
            all_results.extend(results)
            if args.max_results > 0 and len(all_results) >= args.max_results:
                all_results = all_results[:args.max_results]
                break

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

    # Guardar en JSON
    json_output = OUTPUT_PATH.replace('.csv', '.json')
    with open(json_output, 'w', encoding='utf-8') as f:
        json.dump(
            [{**result, "date": result["date"].isoformat()} for result in all_results],
            f, ensure_ascii=False, indent=2
        )

    # Guardar caché
    with open(CACHE_FILE, 'wb') as f:
        pickle.dump(PROCESSED_URLS, f)

    # Resumen de errores
    logging.info(f"Total de noticias encontradas: {len(all_results)}")
    logging.info(f"Resultados guardados en: {OUTPUT_PATH} y {json_output}")

if __name__ == "__main__":
    asyncio.run(main())
