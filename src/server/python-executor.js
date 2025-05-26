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

// Store running processescd d:\senado\radar_noticias_lovable\dia-news-radar\src\server

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
