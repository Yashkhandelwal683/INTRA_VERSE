const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    socket.on('joinUser', (userId) => {
      if (userId) {
        socket.join(`user:${userId}`);
      }
    });

    socket.on('joinEvent', (eventId) => {
      if (eventId) {
        socket.join(`event:${eventId}`);
      }
    });

    socket.on('leaveEvent', (eventId) => {
      if (eventId) {
        socket.leave(`event:${eventId}`);
      }
    });

    socket.on('joinAdmin', () => {
      socket.join('admin');
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = setupSocketHandlers;
