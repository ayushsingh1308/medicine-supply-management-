require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const bus = require('./utils/events');

const PORT = process.env.PORT || 5000;

async function start() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set (copy .env.example to .env)');
  await connectDB(process.env.MONGO_URI);

  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });

  // Push inventory changes to connected dashboards in real time.
  bus.on('stock:updated', (payload) => io.emit('stock:updated', payload));
  bus.on('stock:low', (payload) => io.emit('stock:low', payload));

  server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
