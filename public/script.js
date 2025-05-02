let socket;
let playerId = null;
let camera = document.getElementById("camera");
let player1 = document.getElementById("player1");
let player2 = document.getElementById("player2");

function sendChat() {
  const input = document.getElementById("message");
  const text = input.value.trim();
  if (text && socket) {
    socket.send(JSON.stringify({ type: "chat", text }));
    input.value = "";
  }
}

document.getElementById("message").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    sendChat();
  }
});

function showMessage(text) {
  const messageBox = document.getElementById("messages");
  messageBox.innerText = text;
  messageBox.style.display = "block";
  setTimeout(() => {
    messageBox.style.display = "none";
  }, 3000);
}

function setupSocket() {
  // ✅ Use secure protocol if hosted on https (like on Render)
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const socketUrl = `${protocol}://${window.location.host}`;
  socket = new WebSocket(socketUrl);

  socket.onopen = () => console.log("Connected to server");

  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === "init") {
      playerId = msg.playerId;
      console.log("Assigned as", playerId);

      const myBox = playerId === "player1" ? player1 : player2;
      const theirBox = playerId === "player1" ? player2 : player1;

      myBox.setAttribute("visible", true);
      myBox.setAttribute("position", playerId === "player1" ? "0 1.6 5" : "0 1.6 -5");
      theirBox.setAttribute("visible", true);
      theirBox.setAttribute("position", playerId === "player1" ? "0 1.6 -5" : "0 1.6 5");
    }

    if (msg.type === "update" && msg.playerId !== playerId) {
      const otherBox = msg.playerId === "player1" ? player1 : player2;
      otherBox.setAttribute("position", msg.position);
      otherBox.setAttribute("rotation", msg.rotation);
    }

    if (msg.type === "chat" && msg.playerId !== playerId) {
      showMessage(msg.text);
    }

    if (msg.type === "leave") {
      const otherBox = msg.playerId === "player1" ? player1 : player2;
      otherBox.setAttribute("visible", false);
      showMessage("The other player has left. Redirecting...");
      setTimeout(() => {
        window.location.href = "/disconnected.html";
      }, 3000);
    }
  };

  socket.onclose = () => {
    console.log("Disconnected from server");
    showMessage("Connection closed.");
  };
}

AFRAME.registerComponent("send-player-data", {
  tick: function () {
    if (!socket || socket.readyState !== WebSocket.OPEN || !playerId) return;

    const position = camera.getAttribute("position");
    const rotation = camera.getAttribute("rotation");

    const min = -12, max = 12;
    const newPos = {
      x: Math.max(min, Math.min(max, position.x)),
      y: position.y,
      z: Math.max(min, Math.min(max, position.z)),
    };

    camera.setAttribute("position", newPos);

    const myBox = playerId === "player1" ? player1 : player2;
    myBox.setAttribute("position", newPos);
    myBox.setAttribute("rotation", rotation);

    socket.send(
      JSON.stringify({
        type: "update",
        playerId,
        position: newPos,
        rotation,
      })
    );
  },
});

camera.setAttribute("send-player-data", "");
setupSocket();
