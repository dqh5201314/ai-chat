const express = require('express');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY_DEFAULT = '';

app.use(express.json({ limit: '50mb' }));

// ============ In-memory storage ============
const store = { users: {}, userData: {} };

function hashPassword(pw) {
  return crypto.createHash('sha256').update(pw + 'ai-chat-salt').digest('hex');
}
function makeToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ============ Auth Middleware ============
function auth(req, res, next) {
  const token = req.headers['x-token'];
  if (!token) return res.status(401).json({ error: '未登录' });
  const user = Object.values(store.users).find(u => u.token === token);
  if (!user) return res.status(401).json({ error: '登录已过期' });
  req.currentUser = user;
  next();
}

// ============ Auth API ============
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || username.length < 2 || password.length < 4)
    return res.status(400).json({ error: '用户名至少2位，密码至少4位' });
  if (store.users[username]) return res.status(400).json({ error: '用户名已存在' });

  const token = makeToken();
  store.users[username] = { username, password: hashPassword(password), token, created: Date.now() };
  store.userData[username + '/conversations'] = [];
  store.userData[username + '/settings'] = { characters: [], apiKey: '' };

  res.json({ token, username });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = store.users[username];
  if (!user || user.password !== hashPassword(password))
    return res.status(401).json({ error: '用户名或密码错误' });

  const token = makeToken();
  user.token = token;
  res.json({ token, username });
});

// ============ User Data API ============
app.get('/api/user/conversations', auth, (req, res) => {
  res.json({ conversations: store.userData[req.currentUser.username + '/conversations'] || [] });
});
app.post('/api/user/conversations', auth, (req, res) => {
  store.userData[req.currentUser.username + '/conversations'] = req.body.conversations || [];
  res.json({ success: true });
});
app.get('/api/user/settings', auth, (req, res) => {
  res.json({ settings: store.userData[req.currentUser.username + '/settings'] || {} });
});
app.post('/api/user/settings', auth, (req, res) => {
  const key = req.currentUser.username + '/settings';
  store.userData[key] = { ...(store.userData[key] || {}), ...req.body.settings };
  res.json({ success: true });
});

// ============ Models API ============
app.post('/api/models', auth, async (req, res) => {
  const settings = store.userData[req.currentUser.username + '/settings'] || {};
  const apiKey = settings.apiKey || API_KEY_DEFAULT;
  const apiBase = req.headers['x-api-url'] || 'https://ark.cn-beijing.volces.com/api/coding/v3';
  try {
    let base = apiBase.replace(/\/chat\/completions$/, '').replace(/\/v1$/, '').replace(/\/v3$/, '');
    let url = `${base}/v1/models`;
    if (apiBase.includes('volces.com')) url = `https://ark.cn-beijing.volces.com/api/v3/models`;
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${apiKey}` } });
    const data = await response.json();
    let models = [];
    if (data.data && Array.isArray(data.data)) models = data.data.filter(m => m.status !== 'Shutdown').map(m => ({ id: m.id, name: m.id }));
    res.json({ models });
  } catch (e) { res.json({ models: [] }); }
});

// ============ Chat Proxy ============
app.post('/api/chat', auth, async (req, res) => {
  const settings = store.userData[req.currentUser.username + '/settings'] || {};
  const apiKey = settings.apiKey || API_KEY_DEFAULT;
  const apiBase = req.headers['x-api-url'] || 'https://ark.cn-beijing.volces.com/api/coding/v3';
  try {
    const response = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(req.body)
    });
    res.json(await response.json());
  } catch (e) { res.status(500).json({ error: 'Network error' }); }
});

// ============ Frontend ============
const fs = require('fs');
const path = require('path');
app.get('/', (req, res) => {
  res.send(fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8'));
});

app.listen(PORT, '0.0.0.0', () => console.log('AI Chat running on port ' + PORT));
