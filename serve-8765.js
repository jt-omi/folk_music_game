const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const root = path.join(__dirname, 'outputs');
const port = Number(process.env.PORT || 8765);
const host = process.env.HOST || '0.0.0.0';

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg'
};

function getLocalIPv4List() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter(item => item && item.family === 'IPv4' && !item.internal)
    .map(item => item.address);
}

function sendFile(req, res, file, stat) {
  const ext = path.extname(file).toLowerCase();
  const type = types[ext] || 'application/octet-stream';
  const range = req.headers.range;

  if (range) {
    const match = range.match(/bytes=(\d*)-(\d*)/);
    if (match) {
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Number(match[2]) : stat.size - 1;
      if (start <= end && start < stat.size) {
        res.writeHead(206, {
          'Content-Type': type,
          'Content-Length': end - start + 1,
          'Content-Range': `bytes ${start}-${end}/${stat.size}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-cache'
        });
        fs.createReadStream(file, { start, end }).pipe(res);
        return;
      }
    }
  }

  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': stat.size,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-cache'
  });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/') rel = '/index.html';

    const file = path.normalize(path.join(root, rel));
    const safeRoot = path.normalize(root + path.sep);
    if (!file.startsWith(safeRoot) && file !== path.normalize(root)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    fs.stat(file, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }
      sendFile(req, res, file, stat);
    });
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(String(error));
  }
});

server.listen(port, host, () => {
  console.log(`四川民族音乐游戏已启动：`);
  console.log(`电脑本机：http://127.0.0.1:${port}/`);
  for (const ip of getLocalIPv4List()) {
    console.log(`手机同 Wi-Fi：http://${ip}:${port}/`);
  }
  console.log(`\n入口目录：${root}`);
  console.log('按 Ctrl + C 可以停止服务器。');
});
