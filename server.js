const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY_DEFAULT = '';

app.use(express.json({ limit: '10mb' }));

// ============ In-memory user accounts ============
// Only stores username + hashed password. No chat data.
let users = {};
try {
  const p = path.join(__dirname, 'data', 'users.json');
  if (fs.existsSync(p)) users = JSON.parse(fs.readFileSync(p, 'utf8'));
} catch (e) {}

function saveUsers() {
  try {
    const d = path.join(__dirname, 'data');
    if (!fs.existsSync(d)) fs.mkdirSync(d);
    fs.writeFileSync(path.join(d, 'users.json'), JSON.stringify(users, null, 2));
  } catch (e) {}
}

function hashPassword(pw) {
  return crypto.createHash('sha256').update(pw + 'ai-chat-salt').digest('hex');
}
function makeToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ============ Auth ============
function auth(req, res, next) {
  const token = req.headers['x-token'];
  if (!token) return res.status(401).json({ error: '未登录' });
  const user = Object.values(users).find(u => u.token === token);
  if (!user) return res.status(401).json({ error: '登录已过期' });
  req.currentUser = user;
  next();
}

// ============ API ============
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || username.length < 2 || password.length < 4)
    return res.status(400).json({ error: '用户名至少2位，密码至少4位' });
  if (users[username]) return res.status(400).json({ error: '用户名已存在' });

  const token = makeToken();
  users[username] = { username, password: hashPassword(password), token, created: Date.now() };
  saveUsers();
  res.json({ token, username });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (!user || user.password !== hashPassword(password))
    return res.status(401).json({ error: '用户名或密码错误' });

  const token = makeToken();
  user.token = token;
  saveUsers();
  res.json({ token, username });
});

// ============ Models ============
app.post('/api/models', auth, async (req, res) => {
  const apiKey = req.headers['x-api-key'] || API_KEY_DEFAULT;
  const apiBase = req.headers['x-api-url'] || 'https://ark.cn-beijing.volces.com/api/coding/v3';
  try {
    let base = apiBase.replace(/\/chat\/completions$/, '').replace(/\/v1$/, '').replace(/\/v3$/, '');
    let url = `${base}/v1/models`;
    if (apiBase.includes('volces.com')) url = `https://ark.cn-beijing.volces.com/api/v3/models`;
    const r = await fetch(url, { headers: { 'Authorization': `Bearer ${apiKey}` } });
    const d = await r.json();
    res.json({ models: (d.data || []).filter(m => m.status !== 'Shutdown').map(m => ({ id: m.id, name: m.id })) });
  } catch (e) { res.json({ models: [] }); }
});

// ============ Chat ============
app.post('/api/chat', auth, async (req, res) => {
  const apiKey = req.headers['x-api-key'] || API_KEY_DEFAULT;
  const apiBase = req.headers['x-api-url'] || 'https://ark.cn-beijing.volces.com/api/coding/v3';
  try {
    const r = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify(req.body)
    });
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: 'Network error' }); }
});

// ============ Frontend ============
app.get('/', (req, res) => {
  res.send(fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8'));
});

app.listen(PORT, '0.0.0.0', () => console.log('AI Chat running on port ' + PORT));
