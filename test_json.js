const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/message',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  res.on('data', (chunk) => {
    console.log(`Response: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

// Send invalid JSON
req.write('"dascascascacsdcsd"');
req.end();