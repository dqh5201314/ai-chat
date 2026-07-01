const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

// Serve index.html with env vars injected
app.get('/', (req, res) => {
  let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  html = html.replace('__API_KEY__', process.env.OPENAI_API_KEY || '');
  html = html.replace('__USER__', process.env.LOGIN_USERNAME || 'dqh');
  html = html.replace('__PASS__', process.env.LOGIN_PASSWORD || '');
  res.send(html);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('AI Chat running on port ' + PORT);
});
