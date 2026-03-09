// server.ts

import { WebSocketServer, WebSocket } from 'ws';

const wss = new WebSocketServer({ port: 8008 });

wss.on('connection', ws => {
  console.log('Client connected');
  // Reduced delay for sending the welcome message
  setTimeout(() => {
    ws.send(`Welcome to the WebSocket server!`);
  }, 100); // 1 second

  ws.on('message', message => {
    console.log(`Received: ${message}`);
    ws.send(`Echo: ${message}`);
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', error => {
    console.error('WebSocket error:', error);
  });
});

console.log('WebSocket server started on port 8008');
console.log('Press SPACE to send a message to all clients, and CTRL+C to exit.');

if (process.stdin.isTTY) {
  try {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (key) => {
      if (key === ' ') {
        console.log('Spacebar pressed. Sending message to all clients.');
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send('This is a broadcast message from the server!');
          }
        });
      }
      if (key === '\u0003') {
        console.log('Exiting...');
        process.exit();
      }
    });
  } catch {
    console.log('Could not enable raw mode.');
  }
}