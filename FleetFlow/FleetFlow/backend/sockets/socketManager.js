// Central place for Socket.IO wiring. The vessel-position simulation engine
// and alert broadcaster (Phase 7/8) will call io.emit(...) from here.
function initSocket(io) {
  io.on('connection', (socket) => {
    console.log(`[socket] client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[socket] client disconnected: ${socket.id}`);
    });
  });
}

module.exports = { initSocket };
