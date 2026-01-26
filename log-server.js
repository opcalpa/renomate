import http from 'http';
import fs from 'fs';

const PORT = 3000;
const LOG_FILE = 'browser.log';

// Rensa loggen vid start
fs.writeFileSync(LOG_FILE, `--- Log start: ${new Date().toISOString()} ---\n`);

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      const logEntry = `[${new Date().toLocaleTimeString()}] ${body}\n`;
      fs.appendFileSync(LOG_FILE, logEntry);
      res.writeHead(200);
      res.end('Logged');
    });
  }
});

server.listen(PORT, () => {
  console.log(`Logg-server körs på http://localhost:${PORT}`);
});