// LAST UPDATED 20250619
// 20250614 CHANGED FROM DENO KV TO LOCAL STORAGE

import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize the express 'app' object
const app = express();

// Serve static files from the dist directory in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, 'dist')));
} else {
  // In development, serve static files from the current directory
  app.use(express.static(__dirname));
  app.use('/src', express.static(join(__dirname, 'src')));
}

// Initialize HTTP server
const server = createServer(app);
const port = process.env.PORT || 3000;

// Initialize socket.io with CORS enabled
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Instead of Deno KV setup, store the collective choices locally
let collectiveChoices = {
  choices: [],
  totalVotes: 0
};

// Track current stage
let currentStage = 0;

// Socket connection

io.on("connection", (socket) => {
  console.log("We have a new client: " + socket.id);
  
  // Send current state to new clients
  // socket.emit('updateCollectiveChoices', collectiveChoices);
  socket.emit('stageUpdate', currentStage);
  
  // Handle stage changes
  socket.on('stageChange', (stage) => {
    console.log("[Server] Stage change:", stage);
    currentStage = stage;
    // Broadcast stage update to all clients
    io.emit('stageUpdate', stage);
  });
  
  // Handle choice selection from mobile users
  socket.on('makeChoice', (choice) => {
    console.log("[Server] New choice:", choice);
    console.log("[Server] Current votes:", collectiveChoices.choices.length);
    
    // Update collective choices
    collectiveChoices.choices.push(choice);
    collectiveChoices.totalVotes++;
    
    // Broadcast latest choice
    let latestChoice = collectiveChoices.choices[collectiveChoices.choices.length - 1];
    io.emit('broadcastLatestChoice', latestChoice);
  });
  
  // Handle removing top choice
  socket.on('removeTopChoice', (topChoice) => {
    console.log("[Server] Removing:", topChoice);
    console.log("[Server] Votes before removal:", collectiveChoices.choices.length);
    
    // Remove all instances of the top choice
    collectiveChoices.choices = collectiveChoices.choices.filter(choice => choice !== topChoice);
    
    // Update total votes
    collectiveChoices.totalVotes = collectiveChoices.choices.length;
    
    console.log("[Server] Votes after removal:", collectiveChoices.choices.length);
  });
  
  // Handle reset request
  socket.on('resetChoices', () => {
    console.log("Resetting all choices");
    collectiveChoices = {
      choices: [],
      totalVotes: 0
    };
    // io.emit('updateCollectiveChoices', collectiveChoices);
  });
  
  //Listen for this client to disconnect
  socket.on("disconnect", () => {
    console.log("A client has disconnected: " + socket.id);
  });
});


server.listen(port, () => {
  console.log(`Server listening on port: ${port}`);
});