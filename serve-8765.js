const http = require('http');
const fs = require('fs');
const path = require('path');
const root = 'D:/CODEX/四川民族音乐游戏/outputs';
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.mp4':'video/mp4','.mp3':'audio/mpeg','.wav':'audio/wav'};
http.createServer((req,res)=>{
  try {
    const url = new URL(req.url, 'http://127.0.0.1:8765');
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/') rel = '/sichuan-music-game.html';
    const file = path.normalize(path.join(root, rel));
    if (!file.startsWith(path.normalize(root))) { res.writeHead(403); res.end('Forbidden'); return; }
    fs.stat(file, (err, stat)=>{
      if (err || !stat.isFile()) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, {'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream'});
      fs.createReadStream(file).pipe(res);
    });
  } catch (e) { res.writeHead(500); res.end(String(e)); }
}).listen(8765, '127.0.0.1');