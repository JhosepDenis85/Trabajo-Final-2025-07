let ioInstance = null;

function initSocket(server) {
  const { Server } = require('socket.io');
  ioInstance = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true // cambiado a true (permite cookies / auth si luego se requiere)
    }
  });
  ioInstance.on('connection', (socket) => {
    socket.emit('connected', { ts: Date.now() }); // linea añadida opcional
    socket.on('suscribir-user', (userId) => {
      socket.join(`user:${userId}`);
    });
    socket.on('ping', () => socket.emit('pong', { ts: Date.now() })); // util mínima
  });
  return ioInstance;
}

function io() {
  return ioInstance;
}

function emitOrderStatus(userId, payload) {
  if (!ioInstance) return;
  ioInstance.to(`user:${userId}`).emit('order-status', payload);
}

module.exports = {
  initSocket,
  io,
  emitOrderStatus
};