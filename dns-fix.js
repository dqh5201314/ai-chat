const dns = require('node:dns');
const orig = dns.getServers();
if (orig.length === 1 && orig[0] === '127.0.0.1') {
  dns.setServers(['8.8.8.8', '114.114.114.114']);
}
