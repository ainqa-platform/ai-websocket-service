// socketHandler.js
global.userSessions = {}; // { userId: [socketId1, socketId2] }

function registerSocket(io) {
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

     // Timeout handler (10 min = 600000 ms)
    const disconnectTimer = setTimeout(() => {
      console.log(`Auto-disconnecting socket ${socket.id} after 10 mins`);
      socket.disconnect(true); // force disconnect
    }, 10 * 60 * 1000);

    // Step 1: Register after login
    socket.on("register", (userId) => {
      if (!global.userSessions[userId]) {
        global.userSessions[userId] = [];
      }
      global.userSessions[userId].push(socket.id);
      socket.userId = userId;
      console.log(`User ${userId} connected on socket ${socket.id}`);
    });

    // Step 2: Web -> Mobile screenshot request
    socket.on("takeScreenshot", (userId) => {
       console.log(`takeScreenshot request: User ${userId} connected on socket ${socket.id}`);
      if (global.userSessions[userId]) {
        global.userSessions[userId].forEach((sockId) => {
          if (sockId !== socket.id) {
            io.to(sockId).emit("takeScreenshotRequest");
             console.log(`takeScreenshot request sent to: User ${userId} connected on socket ${socket.id}`);
          }
        });
      }
    });

    // Step 3: Mobile -> Web screenshot data
    socket.on("screenshotTaken", (data) => {
      console.log("screenshotTaken function inside")
      if (global.userSessions[data.userId]) {
        global.userSessions[data.userId].forEach((sockId) => {
          if (sockId !== socket.id) {
            io.to(sockId).emit("screenshotReceived", data.imageBase64);
             console.log("screenshotTaken function inside web",data.imageBase64)
          }
        });
      }
    });

    // Step 4: Cleanup
    socket.on("unregister", (userId) => {
      clearTimeout(disconnectTimer);
      if (userId) {
        global.userSessions[userId] = global.userSessions[userId].filter(
          (id) => id !== socket.id
        );
        if (global.userSessions[userId].length === 0) {
          delete global.userSessions[userId];
        }
      }
      console.log("Client disconnected:", socket.id);
    });
  });
}

module.exports = registerSocket;
