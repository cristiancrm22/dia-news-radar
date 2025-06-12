const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Store running processes
const runningProcesses = new Map();

// Endpoint to execute Python script
app.post('/api/scraper/execute', (req, res) => {
  try {
    const { keywords, sources, twitterUsers, validateLinks, todayOnly, outputPath, maxWorkers, pythonExecutable, maxResults, deepScrape } = req.body;
    
    console.log('Executing Python script with params:', {
      keywords: keywords,
      sources: sources ? sources.slice(0, 3) + '...' : sources,
      twitterUsers,
      validateLinks,
      todayOnly,
      outputPath,
      maxResults,
      deepScrape
    });
    
    // Prepare arguments for the Python script
    const args = [];
    
    // ACTUALIZADO: Pasar parámetros como JSON strings válidos para radar_optimo.py
    if (keywords && Array.isArray(keywords) && keywords.length > 0) {
      args.push('--keywords');
      args.push(JSON.stringify(keywords));
    }
    
    if (sources && Array.isArray(sources) && sources.length > 0) {
      args.push('--sources');
      args.push(JSON.stringify(sources));
    }
    
    if (twitterUsers && Array.isArray(twitterUsers) && twitterUsers.length > 0) {
      args.push('--twitter-users');
      args.push(JSON.stringify(twitterUsers));
    }
    
    if (outputPath) {
      args.push('--output');
      args.push(outputPath);
    }
    
    // NUEVO: Parámetros específicos de radar_optimo.py
    if (maxResults && typeof maxResults === 'number' && maxResults > 0) {
      args.push('--max-results');
      args.push(maxResults.toString());
    }
    
    if (validateLinks === true) {
      args.push('--validate-links');
    }
    
    if (todayOnly === true) {
      args.push('--today-only');
    }
    
    if (deepScrape === true) {
      args.push('--deep-scrape');
    }
    
    // Execute the Python script - ACTUALIZADO para usar radar_optimo.py
    const pythonCommand = pythonExecutable || 'python3';
    const scriptPath = path.join(__dirname, 'radar_optimo.py');
    
    console.log(`Executing: ${pythonCommand} ${scriptPath} ${args.join(' ')}`);
    console.log('Full command args:', [scriptPath, ...args]);
    
    const process = spawn(pythonCommand, [scriptPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: __dirname
    });
    
    console.log('Spawned process PID:', process.pid);
    
    const processInfo = {
      pid: process.pid,
      status: 'running',
      output: [],
      startTime: new Date(),
      outputPath: outputPath
    };
    
    runningProcesses.set(process.pid, processInfo);
    
    // Handle process output
    process.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log('Python stdout:', output);
        processInfo.output.push(output);
      }
    });
    
    process.stderr.on('data', (data) => {
      const error = data.toString().trim();
      if (error) {
        console.error('Python stderr:', error);
        processInfo.output.push(`ERROR: ${error}`);
      }
    });
    
    process.on('close', (code) => {
      console.log(`Python script exited with code ${code}`);
      processInfo.status = code === 0 ? 'completed' : 'error';
      processInfo.endTime = new Date();
      processInfo.csvPath = outputPath;
      
      if (code !== 0) {
        processInfo.error = `Script exited with code ${code}`;
      }
    });
    
    process.on('error', (error) => {
      console.error('Process error:', error);
      processInfo.status = 'error';
      processInfo.error = error.message;
      processInfo.endTime = new Date();
    });
    
    res.json({
      status: 'success',
      pid: process.pid,
      message: 'Python script started successfully'
    });
    
  } catch (error) {
    console.error('Error executing Python script:', error);
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Endpoint to check script status
app.get('/api/scraper/status', (req, res) => {
  const { pid } = req.query;
  console.log('Status check for PID:', pid);
  if (pid && runningProcesses.has(parseInt(pid))) {
    const processInfo = runningProcesses.get(parseInt(pid));
    res.json(processInfo);
  } else {
    res.status(404).json({
      status: 'error',
      error: 'Process not found'
    });
  }
});

// Endpoint to get CSV results
app.get('/api/scraper/csv', (req, res) => {
  const { path: csvPath } = req.query;
  
  if (!csvPath) {
    return res.status(400).json({
      status: 'error',
      error: 'CSV path required'
    });
  }
  
  try {
    if (fs.existsSync(csvPath)) {
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      res.setHeader('Content-Type', 'text/csv');
      res.send(csvContent);
    } else {
      res.status(404).json({
        status: 'error',
        error: 'CSV file not found'
      });
    }
  } catch (error) {
    console.error('Error reading CSV:', error);
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Nuevo endpoint mejorado para obtener noticias del día
app.get('/api/news/today', async (req, res) => {
  try {
    console.log('=== OBTENIENDO NOTICIAS DEL DÍA ===');
    
    // Buscar archivos CSV recientes en /tmp
    const fs = require('fs');
    const path = require('path');
    const tmpDir = '/tmp';
    
    let latestCsvFile = null;
    let latestTime = 0;
    
    try {
      const files = fs.readdirSync(tmpDir);
      for (const file of files) {
        if (file.startsWith('resultados_') && file.endsWith('.csv')) {
          const filePath = path.join(tmpDir, file);
          const stats = fs.statSync(filePath);
          if (stats.mtime.getTime() > latestTime) {
            latestTime = stats.mtime.getTime();
            latestCsvFile = filePath;
          }
        }
      }
    } catch (error) {
      console.log('Error leyendo directorio /tmp:', error.message);
    }
    
    let news = [];
    
    if (latestCsvFile && fs.existsSync(latestCsvFile)) {
      console.log(`Leyendo archivo CSV: ${latestCsvFile}`);
      
      try {
        const csvContent = fs.readFileSync(latestCsvFile, 'utf8');
        const lines = csvContent.split('\n').filter(line => line.trim());
        
        if (lines.length > 1) {
          const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
          console.log('Headers CSV:', headers);
          
          for (let i = 1; i < lines.length; i++) {
            const values = [];
            let current = '';
            let inQuotes = false;
            
            for (let j = 0; j < lines[i].length; j++) {
              const char = lines[i][j];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            values.push(current.trim());
            
            if (values.length >= 4) {
              const newsItem = {
                id: `news_${i}`,
                title: values[0] || 'Sin título',
                summary: values[3] || values[1] || 'Sin resumen',
                date: values[1] || new Date().toISOString(),
                sourceUrl: values[2] || '#',
                sourceName: values[4] || 'Fuente desconocida',
                relevanceScore: values[5] || '1'
              };
              
              news.push(newsItem);
            }
          }
        }
        
        console.log(`Noticias procesadas del CSV: ${news.length}`);
      } catch (error) {
        console.error('Error procesando CSV:', error);
      }
    }
    
    // Si no hay noticias del CSV, usar noticias mock
    if (news.length === 0) {
      console.log('No hay CSV disponible, usando noticias mock');
      news = [
        {
          id: "1",
          title: "Kicillof anuncia nuevas medidas económicas para Buenos Aires",
          summary: "El gobernador bonaerense presentó un paquete de medidas destinadas a fortalecer la economía provincial.",
          date: new Date().toISOString(),
          sourceUrl: "https://www.ejemplo.com/noticia1",
          sourceName: "La Nación"
        },
        {
          id: "2", 
          title: "Magario se reúne con intendentes del conurbano",
          summary: "La vicegobernadora coordinó acciones con los jefes comunales para mejorar la gestión local.",
          date: new Date().toISOString(),
          sourceUrl: "https://www.ejemplo.com/noticia2",
          sourceName: "Clarín"
        },
        {
          id: "3",
          title: "Espinosa presenta proyecto de ley en el Senado",
          summary: "El senador provincial presentó una nueva iniciativa legislativa para mejorar la transparencia.",
          date: new Date().toISOString(),
          sourceUrl: "https://www.ejemplo.com/noticia3", 
          sourceName: "Página 12"
        }
      ];
    }
    
    res.json({
      success: true,
      news: news,
      count: news.length,
      source: latestCsvFile ? 'csv' : 'mock',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error obteniendo noticias:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      news: [],
      count: 0
    });
  }
});

// Email sending endpoint - CORREGIDO
app.post('/api/email/send', async (req, res) => {
  try {
    const { smtp_host, smtp_port, smtp_user, smtp_pass, to, subject, html, use_tls } = req.body;
    
    console.log('=== INICIO ENVÍO EMAIL ===');
    console.log('Parámetros recibidos:', {
      smtp_host,
      smtp_port,
      smtp_user,
      to,
      subject,
      use_tls
    });
    
    if (!smtp_host || !smtp_port || !smtp_user || !smtp_pass || !to || !subject || !html) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros requeridos',
        method: "python-smtp"
      });
    }
    
    const pythonArgs = [
      path.join(__dirname, 'send_email.py'),
      '--smtp-host', smtp_host,
      '--smtp-port', smtp_port.toString(),
      '--smtp-user', smtp_user,
      '--smtp-pass', smtp_pass,
      '--to', to,
      '--subject', subject,
      '--html', html
    ];
    
    if (use_tls) {
      pythonArgs.push('--use-tls');
    }
    
    console.log('Ejecutando Python script de email...');
    
    const pythonProcess = spawn('python', pythonArgs);
    
    let output = '';
    let errorOutput = '';
    
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      console.log(`Script Python terminó con código ${code}`);
      console.log('Output:', output);
      console.log('Error output:', errorOutput);
      
      if (code === 0) {
        try {
          const result = JSON.parse(output.trim());
          res.json(result);
        } catch (e) {
          res.json({ 
            success: true, 
            message: "Email enviado correctamente",
            method: "python-smtp"
          });
        }
      } else {
        res.status(500).json({ 
          success: false, 
          error: errorOutput || `Script falló con código ${code}`,
          method: "python-smtp"
        });
      }
    });
    
    pythonProcess.on('error', (error) => {
      console.error('Error ejecutando script Python:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message,
        method: "python-smtp"
      });
    });
    
  } catch (error) {
    console.error('Error en endpoint de email:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      method: "python-smtp"
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint de compatibilidad para /status
app.get('/status', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Python executor server running on port ${PORT}`);
});
