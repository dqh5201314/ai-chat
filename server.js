const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const app = express();

const PORT = process.env.PORT || 3000;
const API_KEY_DEFAULT = '';
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(express.json({ limit: '50mb' }));

// ============ Helpers ============
function readJSON(file) {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function writeJSON(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}
function hashPassword(pw) {
  return crypto.createHash('sha256').update(pw + 'ai-chat-salt').digest('hex');
}
function makeToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Init users file
if (!fs.existsSync(path.join(DATA_DIR, 'users.json'))) {
  writeJSON('users.json', {});
}

// ============ Auth Middleware ============
function auth(req, res, next) {
  const token = req.headers['x-token'];
  if (!token) return res.status(401).json({ error: '未登录' });
  const users = readJSON('users.json') || {};
  const user = Object.values(users).find(u => u.token === token);
  if (!user) return res.status(401).json({ error: '登录已过期' });
  req.currentUser = user;
  next();
}

// ============ Auth API ============
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || username.length < 2 || password.length < 4)
    return res.status(400).json({ error: '用户名至少2位，密码至少4位' });
  const users = readJSON('users.json') || {};
  if (users[username]) return res.status(400).json({ error: '用户名已存在' });

  const token = makeToken();
  users[username] = { username, password: hashPassword(password), token, created: Date.now() };
  writeJSON('users.json', users);

  // Create user data dir
  const userDir = path.join(DATA_DIR, 'users', username);
  if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
  writeJSON(path.join('users', username, 'conversations.json'), []);
  writeJSON(path.join('users', username, 'settings.json'), { characters: [], apiKey: '' });

  res.json({ token, username });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const users = readJSON('users.json') || {};
  const user = users[username];
  if (!user || user.password !== hashPassword(password))
    return res.status(401).json({ error: '用户名或密码错误' });

  // Refresh token
  const token = makeToken();
  user.token = token;
  writeJSON('users.json', users);

  res.json({ token, username });
});

// ============ User Data API ============
app.get('/api/user/conversations', auth, (req, res) => {
  const data = readJSON(path.join('users', req.currentUser.username, 'conversations.json')) || [];
  res.json({ conversations: data });
});

app.post('/api/user/conversations', auth, (req, res) => {
  writeJSON(path.join('users', req.currentUser.username, 'conversations.json'), req.body.conversations || []);
  res.json({ success: true });
});

app.get('/api/user/settings', auth, (req, res) => {
  const data = readJSON(path.join('users', req.currentUser.username, 'settings.json')) || {};
  res.json({ settings: data });
});

app.post('/api/user/settings', auth, (req, res) => {
  const settings = readJSON(path.join('users', req.currentUser.username, 'settings.json')) || {};
  const newSettings = { ...settings, ...req.body.settings };
  writeJSON(path.join('users', req.currentUser.username, 'settings.json'), newSettings);
  res.json({ success: true });
});

// ============ Models API ============
app.post('/api/models', auth, async (req, res) => {
  const settings = readJSON(path.join('users', req.currentUser.username, 'settings.json')) || {};
  const apiKey = settings.apiKey || API_KEY_DEFAULT;
  const apiBase = req.headers['x-api-url'] || 'https://ark.cn-beijing.volces.com/api/coding/v3';

  try {
    // Try v1/models (OpenAI format)
    let base = apiBase.replace(/\/chat\/completions$/, '').replace(/\/v1$/, '').replace(/\/v3$/, '');
    let url = `${base}/v1/models`;

    // Special handling for Volcengine Ark
    if (apiBase.includes('volces.com')) {
      url = `https://ark.cn-beijing.volces.com/api/v3/models`;
    }

    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${apiKey}` } });
    const data = await response.json();

    let models = [];
    if (data.data && Array.isArray(data.data)) {
      models = data.data
        .filter(m => m.status !== 'Shutdown' && m.status !== 'Retiring')
        .map(m => ({ id: m.id, name: m.id }));
    }

    res.json({ models });
  } catch (e) {
    res.json({ models: [] });
  }
});
app.post('/api/chat', auth, async (req, res) => {
  const settings = readJSON(path.join('users', req.currentUser.username, 'settings.json')) || {};
  const apiKey = settings.apiKey || API_KEY_DEFAULT;
  const apiBase = req.headers['x-api-url'] || 'https://ark.cn-beijing.volces.com/api/coding/v3';

  try {
    const response = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Network error' });
  }
});

// ============ Serve Frontend ============
app.get('/', (req, res) => {
  let html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
  res.send(html);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('AI Chat running on port ' + PORT);
});
