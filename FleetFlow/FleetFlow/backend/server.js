require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

const app = require('./app');
const connectDB = require('./config/db');
const { initSocket } = require('./sockets/socketManager');
const { startSimulation } = require('./services/simulationEngine');

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  initSocket(io);
  app.set('io', io); // controllers can emit via req.app.get('io')

  startSimulation(io);

  server.listen(PORT, () => {
    console.log(`[server] FleetFlow API listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
}

start();
