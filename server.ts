import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import nodemailer from 'nodemailer';

const PORT = 3000;
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

async function sendUploadNotification(uploaderName: string, files: any[]) {
  const fileList = files.map(f => `- ${f.name} (${(f.size / 1024 / 1024).toFixed(2)} MB)`).join('\n');
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: 'dolandebnath08@gmail.com',
    subject: `🚀 New Upload from ${uploaderName}`,
    text: `User ${uploaderName} has uploaded the following files:\n\n${fileList}\n\nTime: ${new Date().toLocaleString()}`
  };

  try {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await transporter.sendMail(mailOptions);
      console.log('Notification email sent successfully');
    } else {
      console.warn('Email credentials not set. Skipping notification.');
    }
  } catch (error) {
    console.error('Error sending notification email:', error);
  }
}

// Ensure uploads directory exists
fs.ensureDirSync(UPLOADS_DIR);

// Multer storage config - streams directly to disk
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2GB limit
});

async function startServer() {
  const app = express();
  app.use(express.json());

  // --- API Routes ---

  // Ping endpoint for latency check
  app.get('/api/ping', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.status(200).send('pong');
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      env: process.env.NODE_ENV || 'development', 
      time: new Date().toISOString(),
      port: PORT
    });
  });

  // Upload endpoint
  app.post('/api/upload', upload.array('files', 10), async (req, res) => {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploaderName = req.body.uploaderName || 'Unknown User';

    const uploadedFiles = (req.files as Express.Multer.File[]).map(file => ({
      id: file.filename,
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
      path: file.path,
      createdAt: new Date().toISOString(),
      isGuest: req.body.isGuest === 'true'
    }));

    // Send email notification
    await sendUploadNotification(uploaderName, uploadedFiles);

    res.json(uploadedFiles);
  });

  // Delete endpoint
  app.delete('/api/delete/:filename', async (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(UPLOADS_DIR, filename);
    
    try {
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
        res.status(200).json({ message: 'File deleted successfully' });
      } else {
        res.status(404).json({ error: 'File not found' });
      }
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  });

  // Download endpoint with Range Request support
  app.get('/api/download/:filename', (req, res) => {
    const filePath = path.join(UPLOADS_DIR, req.params.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'application/octet-stream',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${req.params.filename.split('-').slice(2).join('-')}"`
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  });

  // Cleanup job for guest files (every hour)
  setInterval(async () => {
    console.log('Running guest file cleanup...');
    const files = await fs.readdir(UPLOADS_DIR);
    const now = Date.now();
    const expiryTime = 30 * 24 * 60 * 60 * 1000; // 30 days

    for (const file of files) {
      const filePath = path.join(UPLOADS_DIR, file);
      const stats = await fs.stat(filePath);
      // This is a simple check, in a real app we'd check the DB for isGuest flag
      if (now - stats.mtimeMs > expiryTime) {
        await fs.remove(filePath);
        console.log(`Deleted expired file: ${file}`);
      }
    }
  }, 60 * 60 * 1000);

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    console.log('Starting in development mode with Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Starting in production mode...');
    const distPath = path.join(process.cwd(), 'dist');
    console.log('Resolved distPath:', distPath);
    if (fs.existsSync(distPath)) {
      console.log('Serving static files from:', distPath);
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.error('CRITICAL: Production mode enabled but dist folder not found at:', distPath);
      console.log('Falling back to Vite middleware (this will be slow)...');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    }
  }

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  let activeUsers = new Set<WebSocket>();
  const peers = new Map<string, { ws: WebSocket; name: string }>();

  wss.on('connection', (ws) => {
    activeUsers.add(ws);
    broadcastCount();

    let registeredPeerId: string | null = null;

    ws.on('message', (messageData) => {
      try {
        const raw = messageData.toString();
        const data = JSON.parse(raw);

        if (data.type === 'register-peer') {
          const { peerId, name } = data;
          registeredPeerId = peerId;
          peers.set(peerId, { ws, name });
          console.log(`Peer registered: ${name} (${peerId})`);
          broadcastPeers();
        } 
        else if (data.type === 'webrtc-signal') {
          const { to, signal } = data;
          const target = peers.get(to);
          if (target && target.ws.readyState === WebSocket.OPEN) {
            target.ws.send(JSON.stringify({
              type: 'webrtc-signal',
              from: registeredPeerId,
              signal
            }));
          }
        }
        else if (data.type === 'relay-message') {
          const { to, payload } = data;
          const target = peers.get(to);
          if (target && target.ws.readyState === WebSocket.OPEN) {
            target.ws.send(JSON.stringify({
              type: 'relay-message',
              from: registeredPeerId,
              payload
            }));
          }
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    });

    ws.on('close', () => {
      activeUsers.delete(ws);
      if (registeredPeerId) {
        peers.delete(registeredPeerId);
        broadcastPeers();
      }
      broadcastCount();
    });
  });

  function broadcastCount() {
    const count = activeUsers.size;
    const message = JSON.stringify({ type: 'count', value: count });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  function broadcastPeers() {
    const list = Array.from(peers.entries()).map(([id, p]) => ({
      id,
      name: p.name
    }));
    const message = JSON.stringify({ type: 'peers-list', peers: list });
    peers.forEach((p) => {
      if (p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(message);
      }
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
