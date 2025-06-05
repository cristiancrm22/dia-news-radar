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
    const { keywords, sources, twitterUsers, validateLinks, currentDateOnly, outputPath, maxWorkers, pythonExecutable } = req.body;
    
    console.log('Executing Python script with params:', req.body);
    
    // Prepare arguments for the Python script
    const args = [];
    
    if (keywords && keywords.length > 0) {
      args.push('--keywords', JSON.stringify(keywords));
    }
    
    if (sources && sources.length > 0) {
      args.push('--sources', JSON.stringify(sources));
    }
    
    if (twitterUsers && twitterUsers.length > 0) {
      args.push('--twitter-users', JSON.stringify(twitterUsers));
    }
    
    if (outputPath) {
      args.push('--output', outputPath);
    }
    
    if (maxWorkers) {
      args.push('--max-workers', maxWorkers.toString());
    }
    
    if (validateLinks) {
      args.push('--validate-links');
    }
    
    if (currentDateOnly) {
      args.push('--today-only');
    }
    
    // Execute the Python script
    const pythonCommand = 'python'; // Fuerza el uso de python en Windows
    const scriptPath = path.join(__dirname, 'radar.py');
    
    console.log(`Executing: ${pythonCommand} ${scriptPath} ${args.join(' ')}`);
    
    const process = spawn(pythonCommand, [scriptPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe']
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
        console.log('Python output:', output);
        processInfo.output.push(output);
      }
    });
    
    process.stderr.on('data', (data) => {
      const error = data.toString().trim();
      if (error) {
        console.error('Python error:', error);
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

// Nuevo endpoint para obtener noticias del día
app.get('/api/news/today', async (req, res) => {
  try {
    console.log('=== OBTENIENDO NOTICIAS DEL DÍA ===');
    
    // Simular obtención de noticias (aquí puedes integrar tu lógica real)
    const mockNews = [
      {
        id: 1,
        title: "Kicillof anuncia nuevas medidas económicas para Buenos Aires",
        summary: "El gobernador bonaerense presentó un paquete de medidas destinadas a fortalecer la economía provincial.",
        date: new Date().toISOString(),
        sourceUrl: "https://www.ejemplo.com/noticia1",
        sourceName: "La Nación"
      },
      {
        id: 2,
        title: "Magario se reúne con intendentes del conurbano",
        summary: "La vicegobernadora coordinó acciones con los jefes comunales para mejorar la gestión local.",
        date: new Date().toISOString(),
        sourceUrl: "https://www.ejemplo.com/noticia2",
        sourceName: "Clarín"
      }
    ];
    
    res.json({
      success: true,
      news: mockNews,
      count: mockNews.length
    });
    
  } catch (error) {
    console.error('Error obteniendo noticias:', error);
    res.status(500).json({
      success: false,
      error: error.message
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
    
    const pythonProcess = spawn('python3', pythonArgs);
    
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
