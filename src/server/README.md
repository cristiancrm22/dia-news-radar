
# Servidor Python Executor

Este servidor Node.js ejecuta el script de Python para el scraping de noticias.

## Instalación

1. Navegar al directorio del servidor:
```bash
cd src/server
```

2. Instalar dependencias:
```bash
npm install
```

## Ejecutar el servidor

```bash
npm start
```

El servidor se ejecutará en el puerto 8000.

## Configuración del script de Python

1. Asegúrate de que el script `news_scraper.py` esté en el mismo directorio que este servidor
2. Instala las dependencias de Python necesarias:
```bash
pip install requests beautifulsoup4 newspaper3k snscrape concurrent.futures
```

## Endpoints disponibles

- `POST /api/scraper/execute` - Ejecutar el script de Python
- `GET /api/scraper/status?pid=<process_id>` - Consultar estado del script
- `GET /api/scraper/csv?path=<csv_path>` - Obtener contenido del CSV
- `GET /api/health` - Health check

## Uso con el frontend

El frontend está configurado para conectarse a `http://localhost:8000`. Asegúrate de que el servidor esté ejecutándose antes de usar la aplicación.
