const { createServer } = require("http");
const { Server } = require("socket.io");

// Create HTTP server and Socket.io instance
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5174",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Game state management
const allUsers = {};
const allRooms = [];

// Helper function to clean up rooms
const cleanupRooms = () => {
  for (let i = allRooms.length - 1; i >= 0; i--) {
    const room = allRooms[i];
    if (!room.player1.online || !room.player2.online) {
      allRooms.splice(i, 1);
    }
  }
};

io.on("connection", (socket) => {
  // Initialize new user
  allUsers[socket.id] = {
    socket: socket,
    online: true,
    playing: false,
    playerName: ""
  };

  console.log(`New connection: ${socket.id}`);

  // Handle player requesting a game
  socket.on("request_to_play", (data) => {
    const currentUser = allUsers[socket.id];
    
    if (!data.playerName) {
      return socket.emit("error", "Player name is required");
    }

    currentUser.playerName = data.playerName;
    currentUser.playing = false;

    console.log(`Player ${currentUser.playerName} looking for opponent`);

    // Find available opponent
    let opponentPlayer = null;
    for (const userId in allUsers) {
      const user = allUsers[userId];
      if (user.online && !user.playing && userId !== socket.id) {
        opponentPlayer = user;
        break;
      }
    }

    if (opponentPlayer) {
      const roomId = `room_${Date.now()}`;
      
      // Mark both players as in-game
      opponentPlayer.playing = true;
      currentUser.playing = true;

      // Create new room
      const newRoom = {
        id: roomId,
        player1: opponentPlayer,
        player2: currentUser
      };
      allRooms.push(newRoom);

      console.log(`Match created in room ${roomId}: ${opponentPlayer.playerName} vs ${currentUser.playerName}`);

      // Remove previous listeners to prevent duplicates
      socket.removeAllListeners("playerMoveFromClient");
      opponentPlayer.socket.removeAllListeners("playerMoveFromClient");
      socket.removeAllListeners("disconnect");

      // Notify players
      currentUser.socket.emit("OpponentFound", {
        opponentName: opponentPlayer.playerName,
        playingAs: "circle",
        roomId: roomId
      });

      opponentPlayer.socket.emit("OpponentFound", {
        opponentName: currentUser.playerName,
        playingAs: "cross",
        roomId: roomId
      });

      // Setup move handlers
      currentUser.socket.on("playerMoveFromClient", (moveData) => {
        if (!moveData || !moveData.position) return;
        opponentPlayer.socket.emit("playerMoveFromServer", moveData);
      });

      opponentPlayer.socket.on("playerMoveFromClient", (moveData) => {
        if (!moveData || !moveData.position) return;
        currentUser.socket.emit("playerMoveFromServer", moveData);
      });

      // Handle room cleanup if either player disconnects
      const handleDisconnect = () => {
        if (opponentPlayer.online) {
          opponentPlayer.socket.emit("opponentLeftMatch");
        }
        if (currentUser.online) {
          currentUser.socket.emit("opponentLeftMatch");
        }
        cleanupRooms();
      };

      currentUser.socket.on("disconnect", handleDisconnect);
      opponentPlayer.socket.on("disconnect", handleDisconnect);
    } else {
      currentUser.socket.emit("OpponentNotFound");
      console.log(`No opponent found for ${currentUser.playerName}`);
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    const currentUser = allUsers[socket.id];
    if (!currentUser) return;

    console.log(`Disconnected: ${currentUser.playerName || socket.id}`);

    currentUser.online = false;
    currentUser.playing = false;

    cleanupRooms();
  });
});

// Error handling
httpServer.on("error", (err) => {
  console.error("Server error:", err);
});

// Start server
httpServer.listen(3000, () => {
  console.log("Server listening on port 3000");
});