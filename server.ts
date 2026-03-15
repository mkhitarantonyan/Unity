import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer as createHttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { z } from 'zod';
import axios from 'axios';
import { v2 as cloudinary } from 'cloudinary';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('unity.db');
// Temporary migration: ensure minimal price is 10.0 for all free units
db.prepare("UPDATE units SET sale_price = 10.0 WHERE owner_id IS NULL AND sale_price < 10.0").run();
db.pragma('journal_mode = WAL');

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    first_name TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    is_blocked INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    owner_id TEXT,
    current_price REAL DEFAULT 0,
    sale_price REAL DEFAULT 10.0,
    metadata TEXT DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS unit_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id INTEGER NOT NULL,
    buyer_id TEXT NOT NULL,
    price REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(unit_id) REFERENCES units(id),
    FOREIGN KEY(buyer_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS orders (
    order_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    unit_ids TEXT NOT NULL,
    amount REAL NOT NULL,
    metadata TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

let cachedGridMap: Map<number, any> | null = null;

function getProcessedGrid() {
  if (cachedGridMap) return Array.from(cachedGridMap.values());
  
  console.log('Processing grid data for cache...');
  const startTime = Date.now();
  const units = db.prepare('SELECT id, x, y, owner_id, current_price, sale_price, metadata FROM units').all();
  
  cachedGridMap = new Map();
  
  units.forEach((u: any) => {
    let metadata = {};
    try {
      if (u.metadata && u.metadata !== 'null') {
        metadata = JSON.parse(u.metadata);
      }
    } catch (e) {
      metadata = {};
    }
    
    const isDefault = !u.owner_id && u.sale_price === 10.0 && Object.keys(metadata || {}).length === 0;
    
    if (!isDefault) {
      cachedGridMap!.set(u.id, {
        ...u,
        metadata: metadata || {}
      });
    }
  });
    
  console.log(`Grid processed in ${Date.now() - startTime}ms. Cached ${cachedGridMap.size} units.`);
  return Array.from(cachedGridMap.values());
}

function updateCacheForUnits(units: any[], owner: string, finalNext: number, meta: any) {
  if (!cachedGridMap) return; 
  
  const metaObj = typeof meta === 'string' ? JSON.parse(meta) : meta;
  
  units.forEach(u => {
    const existing = cachedGridMap!.get(u.id);
    if (existing) {
      existing.owner_id = owner;
      existing.sale_price = finalNext;
      existing.metadata = metaObj || {};
    } else {
      cachedGridMap!.set(u.id, {
        id: u.id, x: u.x, y: u.y, owner_id: owner,
        current_price: u.sale_price, sale_price: finalNext,
        metadata: metaObj || {}
      });
    }
  });
}

db.prepare('UPDATE units SET sale_price = 10.0 WHERE owner_id IS NULL AND sale_price != 10.0').run();

const count = db.prepare('SELECT COUNT(*) as count FROM units').get() as { count: number };
if (count.count === 0) {
  console.log('Seeding 10,000 units...');
  const units = [];
  for (let i = 0; i < 10000; i++) {
    units.push({ id: i, x: i % 100, y: Math.floor(i / 100), sale_price: 10.0 });
  }
  const insert = db.prepare('INSERT INTO units (id, x, y, sale_price) VALUES (?, ?, ?, ?)');
  const insertMany = db.transaction((units) => {
    for (const unit of units) insert.run(unit.id, unit.x, unit.y, unit.sale_price);
  });
  insertMany(units);
  console.log('Seeding complete.');
}

function validateAuth(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  const session = db.prepare(
    "SELECT 1 FROM sessions WHERE token = ? AND datetime(created_at, '+24 hours') > datetime('now')"
  ).get(token.trim());
  return !!session;
}

const BuyBulkSchema = z.object({
  unitIds: z.array(z.number()),
  ownerId: z.string(),
  nextSalePrice: z.number().optional(),
  metadata: z.record(z.string(), z.any()),
  token: z.string()
});

const UpdatePriceSchema = z.object({
  unitIds: z.array(z.number()),
  ownerId: z.string(),
  nextSalePrice: z.number(),
  metadata: z.record(z.string(), z.any()).optional(),
  token: z.string()
});

const AuthSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  firstName: z.string().optional()
});

const defaultSettings = [
  { key: 'ui_title', value: 'UNITY GRID' },
  { key: 'ui_subtitle', value: 'OWN A PIECE OF THE DIGITAL WORLD' },
  { key: 'ui_buy_button', value: 'BUY SELECTED' },
  { key: 'ui_loading', value: 'INITIALIZING GRID' },
  { key: 'cloudinary_cloud_name', value: process.env.CLOUDINARY_CLOUD_NAME || '' },
  { key: 'cloudinary_api_key', value: process.env.CLOUDINARY_API_KEY || '' },
  { key: 'cloudinary_api_secret', value: process.env.CLOUDINARY_API_SECRET || '' }
];

const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
defaultSettings.forEach(s => insertSetting.run(s.key, s.value));

function getSetting(key: string): string {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string };
  return row ? row.value : '';
}

let cloudinaryConfigured = false;
function getCloudinary() {
  const cloudName = getSetting('cloudinary_cloud_name');
  const apiKey = getSetting('cloudinary_api_key');
  const apiSecret = getSetting('cloudinary_api_secret');

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
    cloudinaryConfigured = true;
  }
  return cloudinaryConfigured ? cloudinary : null;
}

const checkAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  
  const token = authHeader.split(' ')[1];
  const session = db.prepare("SELECT user_id FROM sessions WHERE token = ? AND datetime(created_at, '+24 hours') > datetime('now')").get(token) as { user_id: string } | undefined;
  
  if (!session) return res.status(401).json({ error: 'Invalid or expired token' });
  
  const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(session.user_id) as { is_admin: number };
  if (user && user.is_admin === 1) {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
};

async function startServer() {
  const app = express();
  
  const httpServer = createHttpServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: { origin: process.env.APP_URL || '*' }
  });

  const pendingGridUpdates = new Map<number, any>();

  setInterval(() => {
    if (pendingGridUpdates.size > 0) {
      const updates = Array.from(pendingGridUpdates.values());
      io.emit('grid_update', updates);
      pendingGridUpdates.clear();
    }
  }, 200);

  io.on('connection', (socket) => {
    console.log('User connected to live grid:', socket.id);
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  // NOWPayments webhook must receive raw body for signature verification (before express.json)
  app.post('/api/webhook/nowpayments', express.raw({ type: 'application/json' }), (req, res, next) => {
    const signature = req.headers['x-nowpayments-sig'] as string;
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
    if (!ipnSecret || !signature) {
      return res.status(400).send('Missing IPN secret or signature');
    }
    const rawBody = (req as any).body as Buffer;
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      return res.status(400).send('Invalid body');
    }
    const expectedSig = crypto.createHmac('sha512', ipnSecret).update(rawBody).digest('hex');
    if (signature !== expectedSig) return res.status(403).send('Invalid signature');

    let body: any;
    try {
      body = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return res.status(400).send('Invalid JSON');
    }

    const { payment_status, order_id } = body;
    if (payment_status !== 'finished') return res.status(200).send('Ignored');

    try {
      const order = db.prepare('SELECT * FROM orders WHERE order_id = ? AND status = "pending"').get(order_id) as any;
      if (!order) return res.status(200).send('OK');

      const unitIds = JSON.parse(order.unit_ids);
      const meta = JSON.parse(order.metadata);
      const placeholders = unitIds.map(() => '?').join(',');
      const units = db.prepare(`SELECT * FROM units WHERE id IN (${placeholders})`).all(...unitIds) as any[];

      const update = db.prepare(`UPDATE units SET owner_id = ?, current_price = sale_price, sale_price = ?, metadata = ? WHERE id = ?`);
      const historyInsert = db.prepare('INSERT INTO unit_history (unit_id, buyer_id, price) VALUES (?, ?, ?)');

      const processTransaction = db.transaction(() => {
        db.prepare('UPDATE orders SET status = "completed" WHERE order_id = ?').run(order_id);
        let appliedNextPrice = 1.0;
        for (const unit of units) {
          const minNext = unit.sale_price * 1.2;
          const maxNext = unit.sale_price * 2.0;
          const finalNext = Math.max(minNext, Math.min(maxNext, meta.nextSalePrice ?? minNext));
          appliedNextPrice = finalNext;
          update.run(order.user_id, finalNext, JSON.stringify(meta), unit.id);
          historyInsert.run(unit.id, order.user_id, unit.sale_price);
        }
        db.prepare('INSERT INTO transactions (id, user_id, amount) VALUES (?, ?, ?)').run(crypto.randomUUID(), order.user_id, order.amount);
      });
      processTransaction();

      const updatedUnits = db.prepare(`SELECT * FROM units WHERE id IN (${placeholders})`).all(...unitIds) as any[];
      updateCacheForUnits(updatedUnits, order.user_id, meta.nextSalePrice ?? (updatedUnits[0]?.sale_price * 1.2), meta);
      updatedUnits.forEach((u: any) => pendingGridUpdates.set(u.id, u));

      res.status(200).send('OK');
    } catch (error) {
      console.error('Webhook nowpayments error:', error);
      res.status(500).send('Server Error');
    }
  });

  app.use(express.json({ limit: '10mb' }));

  const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { error: 'Too many auth requests. Please wait a minute.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const uploadLimiter = rateLimit({
    windowMs: 60 * 1000, 
    max: 10, 
    message: { error: 'Too many uploads. Please wait a minute before trying again.' },
    standardHeaders: true, 
    legacyHeaders: false,
  });

  app.post('/api/upload', uploadLimiter, async (req, res) => {
    const token = req.body?.token ?? req.headers['authorization']?.replace(/^Bearer\s+/i, '');
    if (!validateAuth(token)) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    const image = req.body?.image;
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid image (base64)' });
    }

    const cloud = getCloudinary();
    if (!cloud) {
      console.error('Cloudinary not configured. Upload blocked.');
      return res.status(500).json({ error: 'Server storage is not configured.' });
    }

    try {
      const result = await cloud.uploader.upload(image, { 
        folder: 'unity_grid',
        transformation: [
          { width: 100, height: 100, crop: "fill", gravity: "auto" },
          { quality: "auto", fetch_format: "auto" }
        ]
      });
      res.json({ url: result.secure_url });
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  app.post('/api/register', authLimiter, (req, res) => {
    const result = AuthSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error.message });
    
    const { username, password, firstName } = result.data;
    const id = crypto.randomUUID();

    // Определяем, пустая ли таблица users. Первый пользователь получает is_admin = 1.
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const isAdmin = userCount.count === 0 ? 1 : 0;

try {
      const hashedPassword = bcrypt.hashSync(password, 10);

      db.prepare('INSERT INTO users (id, username, password, first_name, is_admin) VALUES (?, ?, ?, ?, ?)')
        .run(id, username, hashedPassword, firstName || username, isAdmin);

      const token = crypto.randomBytes(32).toString('hex');
      db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, id);

      res.json({ token, id, username, first_name: firstName || username, is_admin: isAdmin === 1 });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(400).json({ error: 'Username already exists' });
      } else {
        res.status(500).json({ error: 'Registration failed' });
      }
    }
  });

  app.post('/api/login', authLimiter, (req, res) => {
    const result = AuthSchema.omit({ firstName: true }).safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error.message });
    
    const { username, password } = result.data;
    
    try {
      const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
      
      if (user && bcrypt.compareSync(password, user.password)) {
        if (user.is_blocked) return res.status(403).json({ error: 'Your account is blocked' });
        
        const token = crypto.randomBytes(32).toString('hex');
        db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, user.id);
        
        res.json({ 
          token,
          id: user.id, 
          username: user.username, 
          first_name: user.first_name,
          is_admin: user.is_admin === 1
        });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.post('/api/logout', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      } catch (e) {
        console.error('Logout session delete error:', e);
      }
    }
    res.json({ success: true });
  });

  app.get('/api/grid', (req, res) => {
    try {
      res.json(getProcessedGrid());
    } catch (error) {
      console.error('Grid fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch grid' });
    }
  });
  app.post('/api/update-price', (req, res) => {
    const result = UpdatePriceSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error.message });
    const { unitIds, ownerId, nextSalePrice, metadata, token } = result.data;
    if (!validateAuth(token)) return res.status(401).json({ error: 'Invalid or expired token' });

    try {
      const placeholders = unitIds.map(() => '?').join(',');
      const units = db.prepare(`SELECT * FROM units WHERE id IN (${placeholders})`).all(...unitIds) as any[];
      
      if (!units.every(u => u.owner_id === ownerId)) {
        return res.status(403).json({ error: 'Ownership verification failed' });
      }

      const update = db.prepare(`UPDATE units SET sale_price = ?, metadata = COALESCE(?, metadata) WHERE id = ?`);
      let appliedNextPrice = 1.0;

      const updateMany = db.transaction((nextPrice: number, meta: string | null) => {
        for (const unit of units) {
          const minNext = (unit.current_price || 10.0) * 1.2;
          const maxNext = (unit.current_price || 10.0) * 2.0;
          const finalNext = Math.max(minNext, Math.min(maxNext, nextPrice));
          appliedNextPrice = finalNext; 
          update.run(finalNext, meta, unit.id);
        }
      });

      updateMany(nextSalePrice, metadata ? JSON.stringify(metadata) : null);
      updateCacheForUnits(units, ownerId, appliedNextPrice, metadata); 
      
      unitIds.forEach(id => {
        const u = cachedGridMap!.get(id);
        if (u) pendingGridUpdates.set(id, u);
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Update failed' });
    }
  });

  const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY;
  const APP_BASE_URL = process.env.APP_URL || process.env.BASE_URL || 'https://your-app.onrender.com';

  app.post('/api/buy-bulk-nowpayments', async (req, res) => {
    const token = req.body?.token ?? req.headers['authorization']?.replace(/^Bearer\s+/i, '');
    if (!validateAuth(token)) return res.status(401).json({ error: 'Invalid or expired token' });

    const { unitIds, ownerId, metadata, nextSalePrice } = req.body;
    if (!Array.isArray(unitIds) || unitIds.length === 0 || !ownerId) {
      return res.status(400).json({ error: 'Missing unitIds, ownerId or invalid payload' });
    }

    if (!NOWPAYMENTS_API_KEY) {
      return res.status(500).json({ error: 'Payment gateway not configured' });
    }

    try {
      const placeholders = unitIds.map(() => '?').join(',');
      const units = db.prepare(`SELECT * FROM units WHERE id IN (${placeholders})`).all(...unitIds) as any[];

      if (units.length !== unitIds.length) return res.status(404).json({ error: 'Some units not found' });
      const allForSale = units.every(u => !u.owner_id || (() => { try { return JSON.parse(u.metadata || '{}').is_for_sale === true; } catch { return false; } })());
      if (!allForSale) return res.status(403).json({ error: 'One or more units are locked' });

      const totalPrice = units.reduce((sum: number, u: any) => sum + u.sale_price, 0);
      const orderId = crypto.randomUUID();

      db.prepare(`INSERT INTO orders (order_id, user_id, unit_ids, amount, metadata, status) VALUES (?, ?, ?, ?, ?, 'pending')`)
        .run(orderId, ownerId, JSON.stringify(unitIds), totalPrice, JSON.stringify({ ...metadata, nextSalePrice }));

      const invoicePayload = {
          price_amount: totalPrice,
          price_currency: 'usd',
          pay_currency: 'usdtbsc', 
          order_id: orderId, 
          ipn_callback_url: `${APP_BASE_URL.replace(/\/$/, '')}/api/webhook/nowpayments`,
          is_fee_paid_by_user: true
        };

      const { data } = await axios.post('https://api.nowpayments.io/v1/invoice', invoicePayload, {
        headers: {
          'x-api-key': NOWPAYMENTS_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      const paymentUrl = data?.invoice_url ?? data?.url ?? data?.result?.invoice_url ?? data?.result?.url;
      if (!paymentUrl) {
        console.error('NOWPayments response:', data);
        return res.status(500).json({ error: 'Payment gateway did not return payment URL' });
      }
      res.json({ paymentUrl, orderId });
    } catch (err: any) {
      console.error('NOWPayments invoice error:', err?.response?.data ?? err.message);
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to create payment';
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/search', (req, res) => {
    const { q } = req.query;
    if (!q || typeof q !== 'string') return res.json({ unitIds: [] });
    
    try {
      if (!isNaN(Number(q))) {
        const unit = db.prepare('SELECT id FROM units WHERE id = ?').get(Number(q)) as { id: number } | undefined;
        return res.json({ unitIds: unit ? [unit.id] : [] });
      } else {
        const searchTerm = q.startsWith('@') ? q.substring(1) : q;
        const pattern = '%' + searchTerm + '%';
        const units = db.prepare(`
          SELECT units.id FROM units 
          JOIN users ON units.owner_id = users.id 
          WHERE users.username LIKE ? COLLATE NOCASE
        `).all(pattern) as { id: number }[];
        
        return res.json({ unitIds: units.map(u => u.id) });
      }
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  });

  app.get('/api/unit/:id/history', (req, res) => {
    const { id } = req.params;
    try {
      const history = db.prepare(`
        SELECT h.price, h.timestamp, u.first_name as buyer_name
        FROM unit_history h
        JOIN users u ON h.buyer_id = u.id
        WHERE h.unit_id = ?
        ORDER BY h.timestamp DESC
      `).all(id);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch history' });
    }
  });

  app.get('/api/admin/stats', checkAdmin, (req, res) => {
    const totalRevenue = db.prepare('SELECT SUM(amount) as total FROM transactions').get() as { total: number };
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const totalOwned = db.prepare('SELECT COUNT(*) as count FROM units WHERE owner_id IS NOT NULL').get() as { count: number };
    res.json({ revenue: totalRevenue.total || 0, users: totalUsers.count, ownedUnits: totalOwned.count });
  });

  app.get('/api/admin/users', checkAdmin, (req, res) => {
    const users = db.prepare('SELECT id, username, first_name, is_admin, is_blocked FROM users').all();
    res.json(users);
  });

  app.post('/api/admin/block-user', checkAdmin, (req, res) => {
    const { userId, block } = req.body;
    db.prepare('UPDATE users SET is_blocked = ? WHERE id = ?').run(block ? 1 : 0, userId);
    res.json({ success: true });
  });

app.get('/api/settings', (req, res) => {
    const settings = db.prepare("SELECT * FROM settings WHERE key NOT IN ('cloudinary_api_key', 'cloudinary_api_secret')").all();
    const settingsObj = (settings as any[]).reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
    
    try {
      const countRow = db.prepare('SELECT COUNT(*) as count FROM units WHERE owner_id IS NOT NULL').get() as { count: number };
      settingsObj.soldCount = countRow.count;
    } catch (e) {
      settingsObj.soldCount = 0;
    }
    
    res.json(settingsObj);
});

  app.get('/api/admin/settings', checkAdmin, (req, res) => {
    const settings = db.prepare('SELECT * FROM settings').all();
    const settingsObj = (settings as any[]).reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
    res.json(settingsObj);
  });

app.post('/api/admin/settings', checkAdmin, (req, res) => {
    const settings = req.body;
    
    // МЕНЯЕМ ЛОГИКУ: вместо "просто обновить", делаем "вставить или перезаписать"
    const update = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    
    const updateMany = db.transaction((data: any) => {
      // Обрати внимание: здесь поменялся порядок на (key, value)
      for (const [key, value] of Object.entries(data)) {
        update.run(key, String(value));
      }
    });
    
    try {
      updateMany(settings);
      cloudinaryConfigured = false; // Сбрасываем конфиг, чтобы Cloudinary подхватил новые ключи
      res.json({ success: true });
    } catch (error) {
      console.error('Ошибка при сохранении настроек:', error);
      res.status(500).json({ error: 'Failed to save settings' });
    }
  });

app.post('/api/admin/toggle-prize', checkAdmin, (req, res) => {
  const { pixelId, active } = req.body;
  const update = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

  try {
    db.transaction(() => {
      if (pixelId != null) update.run('secret_pixel_id', String(pixelId));
      update.run('is_prize_active', active ? 'true' : 'false');
    })();

    // Отправляем сигнал ВСЕМ пользователям
    // Если active === false, мы все равно шлем сигнал, чтобы у всех скрылся пиксель
    io.emit('prize_status_update', { 
      pixelId: active ? Number(pixelId) : null, 
      active: !!active 
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle prize' });
  }
});

  app.post('/api/admin/moderate-unit', checkAdmin, (req, res) => {
    const { unitIds } = req.body;
    const ids = Array.isArray(unitIds) ? unitIds : [req.body.unitId]; 
    if (ids.length === 0) return res.json({ success: true });

    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`UPDATE units SET metadata = '{}' WHERE id IN (${placeholders})`).run(...ids);
    
    ids.forEach(id => {
      const existing = cachedGridMap?.get(id);
      if (existing) {
        existing.metadata = {};
        pendingGridUpdates.set(id, existing);
      } else {
        pendingGridUpdates.set(id, { id, owner_id: null, sale_price: 10.0, metadata: {} });
      }
    });

    res.json({ success: true });
  });

  app.post('/api/admin/reset-unit', checkAdmin, (req, res) => {
    const { unitIds } = req.body;
    if (!Array.isArray(unitIds) || unitIds.length === 0) return res.json({ success: true });

    const placeholders = unitIds.map(() => '?').join(',');
    db.prepare(`UPDATE units SET owner_id = NULL, current_price = 0, sale_price = 10.0, metadata = '{}' WHERE id IN (${placeholders})`).run(...unitIds);
    
    unitIds.forEach(id => {
      cachedGridMap?.delete(id);
      pendingGridUpdates.set(id, { id, owner_id: null, current_price: 0, sale_price: 10.0, metadata: {} });
    });
    
    res.json({ success: true });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => res.sendFile(path.resolve(__dirname, 'dist', 'index.html')));
  }

  const PORT = 3000;
  httpServer.listen(PORT, '0.0.0.0', () => console.log(`UNITY Server running on port ${PORT} with WebSockets`));
}

startServer();