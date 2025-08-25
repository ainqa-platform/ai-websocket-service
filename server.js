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

app.delete("/remove-user/:userId", (req, res) => {
  const { userId } = req.params;

  if (global.userSessions && global.userSessions[userId]) {
    delete global.userSessions[userId];
    return res.json({
      success: true,
      message: `User ${userId} removed from sessions`,
    });
  }

  return res
    .status(404)
    .json({ success: false, message: `User ${userId} not found` });
});

app.delete("/remove-all-users", (req, res) => {
  if (global.userSessions) {
    global.userSessions = {}; // Clear all sessions
    return res.json({
      success: true,
      message: "All users removed from sessions",
    });
  }

  return res
    .status(500)
    .json({ success: false, message: "global.userSessions not initialized" });
});

// Create HTTP + WebSocket server
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: { origin: "*" },
  transports: ["websocket", "polling"], // polling optional
});

// Register socket.io handlers
registerSocket(io);

// Start server
server.listen(PORT, () => {
  console.log(`Screenshot WebSocket & REST service running on port ${PORT}`);
});
