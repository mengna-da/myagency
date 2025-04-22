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

// Initialize socket.io (using client library)
// const io = new Server(server);

// Store the collective choices
let collectiveChoices = {
  choices: [],
  totalVotes: 0
};

// Socket connection
io.on("connection", (socket) => {
  console.log("We have a new client: " + socket.id);
  
  // Send current collective choices to new clients
  socket.emit('updateCollectiveChoices', collectiveChoices);
  
  // Handle choice selection from mobile users
  socket.on('makeChoice', (choice) => {
    console.log("Received choice from client " + socket.id + ":", choice);
    
    // Update collective choices
    collectiveChoices.choices.push(choice);
    collectiveChoices.totalVotes++;
    
    // Broadcast updated choices to all clients
    io.emit('updateCollectiveChoices', collectiveChoices);
  });
  
  // Handle reset request
  socket.on('resetChoices', () => {
    console.log("Resetting all choices");
    collectiveChoices = {
      choices: [],
      totalVotes: 0
    };
    io.emit('updateCollectiveChoices', collectiveChoices);
  });
  
  //Listen for this client to disconnect
  socket.on("disconnect", () => {
    console.log("A client has disconnected: " + socket.id);
  });
});

server.listen(port, () => {
  console.log(`Server listening on port: ${port}`);
});
