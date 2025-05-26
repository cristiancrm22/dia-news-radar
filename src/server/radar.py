import concurrent.futures
import requests
from bs4 import BeautifulSoup
from newspaper import Article
import csv
from datetime import datetime
import argparse
import json
import os

# Intentar importar snscrape
try:
    import snscrape.modules.twitter as sntwitter
    SN_AVAILABLE = True
except Exception as e:
    print("Twitter desactivado (snscrape no disponible o incompatible con Python 3.12).")
    SN_AVAILABLE = False

# Configuración
MAX_WORKERS = 5
KEYWORDS = ["Magario", "Kicillof", "Espinosa"]
TODAY = datetime.now().date()
HEADERS = {'User-Agent': 'Mozilla/5.0'}

# Fuentes
NEWS_SOURCES = [
    "https://www.clarin.com",
    "https://www.lanacion.com.ar",
    "https://www.pagina12.com.ar",
    "https://www.infobae.com",
    "https://www.ambito.com",
    "https://www.cronista.com",
    "https://www.perfil.com",
    "https://www.eldia.com",
    "https://diariohoy.net",
    "https://www.latecla.info",
    "https://infocielo.com",
    "https://www.lanueva.com",
    "https://www.bahianoticias.com",
    "https://diputadosbsas.com.ar"
]

TWITTER_USERS = [
    "Senado_BA",
    "VeronicaMagario",
    "BAProvincia",
    "DiputadosBA"
]

parser = argparse.ArgumentParser()
parser.add_argument('--keywords', type=str, help='Lista de palabras clave (JSON)')
parser.add_argument('--sources', type=str, help='Lista de fuentes (JSON)')
parser.add_argument('--twitter-users', type=str, help='Usuarios de Twitter (JSON)')
parser.add_argument('--output', type=str, default='resultados.csv', help='Ruta de salida CSV')
parser.add_argument('--max-workers', type=int, default=5, help='Cantidad de workers')
parser.add_argument('--validate-links', action='store_true')
parser.add_argument('--today-only', action='store_true')
args = parser.parse_args()

if args.keywords:
    KEYWORDS = json.loads(args.keywords)
if args.sources:
    NEWS_SOURCES = json.loads(args.sources)
if args.twitter_users:
    TWITTER_USERS = json.loads(args.twitter_users)
if args.output:
    OUTPUT_PATH = args.output
else:
    OUTPUT_PATH = 'resultados.csv'
if args.max_workers:
    MAX_WORKERS = args.max_workers
else:
    MAX_WORKERS = 5

def is_relevant(text):
    return any(keyword.lower() in text.lower() for keyword in KEYWORDS)

def process_article(url):
    try:
        article = Article(url)
        article.download()
        article.parse()
        if article.publish_date:
            publish_date = article.publish_date.date()
        else:
            publish_date = TODAY
        if publish_date == TODAY and is_relevant(article.text):
            return {
                "titulo": article.title,
                "fecha": publish_date,
                "url": url,
                "resumen": article.text[:300].replace('\n', ' ')
            }
    except Exception as e:
        print(f"Error procesando {url}: {e}")
    return None

def scrape_site(source_url):
    try:
        response = requests.get(source_url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        links = set(a['href'] for a in soup.find_all('a', href=True) if a['href'].startswith('http'))
        results = []
        for link in links:
            article_data = process_article(link)
            if article_data:
                print(f"Noticia: {article_data['titulo']}")
                results.append(article_data)
        return results
    except Exception as e:
        print(f"Error accediendo a {source_url}: {e}")
        return []

# def scrape_twitter():
#     results = []
#     if not SN_AVAILABLE:
#         return results
#
#     for user in TWITTER_USERS:
#         try:
#             for tweet in sntwitter.TwitterUserScraper(user).get_items():
#                 tweet_date = tweet.date.date()
#                 if tweet_date != TODAY:
#                     break
#                 if is_relevant(tweet.content):
#                     print(f"Tweet relevante de @{user}: {tweet.content[:50]}...")
#                     results.append({
#                         "titulo": f"Tweet de @{user}",
#                         "fecha": tweet_date,
#                         "url": f"https://twitter.com/{user}/status/{tweet.id}",
#                         "resumen": tweet.content[:300].replace('\n', ' ')
#                     })
#         except Exception as e:
#             print(f"Error accediendo a tweets de @{user}: {e}")
#     return results

def main():
    all_results = []

    print("Iniciando radar de noticias...\n")

    # Noticias web
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(scrape_site, url): url for url in NEWS_SOURCES}
        for future in concurrent.futures.as_completed(futures):
            results = future.result()
            all_results.extend(results)

    # Twitter si disponible
    # if SN_AVAILABLE:
    #     twitter_results = scrape_twitter()
    #     all_results.extend(twitter_results)

    # Crear carpeta de salida si no existe
    output_dir = os.path.dirname(OUTPUT_PATH)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Guardar resultados (con campos en inglés para el frontend)
    with open(OUTPUT_PATH, "w", newline='', encoding="utf-8") as f:
        # Escribe el header manualmente para evitar problemas de BOM o espacios
        f.write("title,date,url,description\n")
        english_results = [
            {
                "title": str(r["titulo"]),
                "date": str(r["fecha"]),
                "url": str(r["url"]),
                "description": str(r["resumen"])
            }
            for r in all_results
        ]
        writer = csv.DictWriter(
            f,
            fieldnames=["title", "date", "url", "description"],
            lineterminator='\n'
        )
        # No vuelvas a escribir el header
        writer.writerows(english_results)

    print(f"\nTotal de noticias encontradas: {len(all_results)}")

if __name__ == "__main__":
    main()
