const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const registerSocket = require("./socketHandler");

const PORT = 5000;
const app = express();

// Basic REST API endpoints
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "screenshot-service",
    uptime: process.uptime(),
  });
});

app.get("/status", (req, res) => {
  res.json({
    activeUsers: Object.keys(global.userSessions || {}).length,
    totalConnections: Object.values(global.userSessions || {}).reduce(
      (acc, sessions) => acc + sessions.length,
      0
    ),
  });
});

app.get("/users", (req, res) => {
  const users = Object.entries(global.userSessions || {}).map(
    ([userId, sessions]) => ({
      userId,
      connections: sessions, // list of socket IDs
      connectionCount: sessions.length,
    })
  );

  res.json({
    totalUsers: users.length,
    users,
  });
});

// Create HTTP + WebSocket server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // restrict in prod
  },
});

// Register socket.io handlers
registerSocket(io);

// Start server
server.listen(PORT, () => {
  console.log(`Screenshot WebSocket & REST service running on port ${PORT}`);
});
