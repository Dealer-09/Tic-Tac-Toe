const express = require("express"); const { createServer } = require("http"); const { Server } = require("socket.io");

const app = express(); const httpServer = createServer(app); const io = new Server(httpServer, { cors: { origin: ["http://localhost:5173", "http://localhost:5174","https://tic-tac-toe-six-gules-14.vercel.app/"] }, });

const allUsers = {}; const allRooms = [];

app.get("/", (req, res) => { res.send("Socket.io Server Running"); });

io.on("connection", (socket) => { console.log(`User connected: ${socket.id}`); allUsers[socket.id] = { socket, online: true };

socket.on("request_to_play", (data) => { const currentUser = allUsers[socket.id]; currentUser.playerName = data.playerName;

let opponentPlayer = null;

// Find an available opponent
for (const key in allUsers) {
  if (allUsers[key].online && !allUsers[key].playing && socket.id !== key) {
    opponentPlayer = allUsers[key];
    break;
  }
}

if (opponentPlayer) {
  currentUser.playing = true;
  opponentPlayer.playing = true;

  allRooms.push({ player1: opponentPlayer, player2: currentUser });

  currentUser.socket.emit("OpponentFound", {
    opponentName: opponentPlayer.playerName,
    playingAs: "circle",
  });

  opponentPlayer.socket.emit("OpponentFound", {
    opponentName: currentUser.playerName,
    playingAs: "cross",
  });

  currentUser.socket.on("playerMoveFromClient", (data) => {
    opponentPlayer.socket.emit("playerMoveFromServer", data);
  });

  opponentPlayer.socket.on("playerMoveFromClient", (data) => {
    currentUser.socket.emit("playerMoveFromServer", data);
  });
} else {
  currentUser.socket.emit("OpponentNotFound");
}

});

socket.on("disconnect", () => { console.log(`User disconnected: ${socket.id}`);

const currentUser = allUsers[socket.id];
if (currentUser) {
  delete allUsers[socket.id]; 

  // Notify the opponent if they exist
  for (let i = 0; i < allRooms.length; i++) {
    const { player1, player2 } = allRooms[i];
    if (player1.socket.id === socket.id) {
      player2.socket.emit("opponentLeftMatch");
      allRooms.splice(i, 1);
      break;
    }
    if (player2.socket.id === socket.id) {
      player1.socket.emit("opponentLeftMatch");
      allRooms.splice(i, 1);
      break;
    }
  }
}

}); });
const PORT= process.env.PORT || 3000; httpServer.listen(PORT, () => { console.log(`Server is running on port ${PORT}`); });