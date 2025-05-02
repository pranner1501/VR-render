const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });
const io = new Server(server); // Socket.IO for voice

let clients = [];

// 🟡 WebSocket (for VR game messages)
server.on("upgrade", (req, socket, head) => {
  if (req.url.includes("/socket.io")) {
    // Let Socket.IO handle it
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    if (clients.length >= 2) {
      ws.close();
      return;
    }

    const playerId = clients.length === 0 ? "player1" : "player2";
    ws.playerId = playerId;
    clients.push(ws);

    console.log(`${playerId} connected`);
    ws.send(JSON.stringify({ type: "init", playerId }));

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data);
        msg.playerId = ws.playerId;

        // Broadcast to the other player
        clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(msg));
          }
        });
      } catch (err) {
        console.warn("⚠️ Non-JSON message ignored:", data.toString());
      }
    });

    ws.on("close", () => {
      console.log(`${playerId} disconnected`);
      clients = clients.filter((c) => c !== ws);

      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "leave", playerId }));
        }
      });
    });
  });
});

// 🟢 Socket.IO (for WebRTC voice signaling)
io.on("connection", (socket) => {
  socket.on("join-voice", () => {
    socket.broadcast.emit("ready-voice");
  });

  socket.on("offer-voice", (offer) => {
    socket.broadcast.emit("offer-voice", offer);
  });

  socket.on("answer-voice", (answer) => {
    socket.broadcast.emit("answer-voice", answer);
  });

  socket.on("ice-candidate-voice", (candidate) => {
    socket.broadcast.emit("ice-candidate-voice", candidate);
  });
});

// Serve static files from /public
app.use(express.static(path.join(__dirname, "public")));

// ✅ Use Render-compatible port
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
