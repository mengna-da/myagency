// 20250612 CHANGED FROM DENO KV TO LOCAL STORAGE

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

// // --- Deno KV Setup for Shared State ---

// // Open the Deno KV database
// // Deno KV is available globally in Deno Deploy with zero setup.
// // In development, this will create a local file database.
// const kv = await Deno.openKv();
// const CHOICES_KEY = ["collective_choices"]; // Define a key for our data in KV

// // Function to get the current collective choices from KV
// async function getCollectiveChoices() {
//     const entry = await kv.get(CHOICES_KEY);
//     // Return the value if it exists, otherwise return the initial state structure
//     return entry.value || { choices: [], totalVotes: 0 };
// }

// // Function to set the collective choices in KV
// async function setCollectiveChoices(state) {
//     // Use an atomic transaction for safer writes (optional but good practice for preventing race conditions)
//     await kv.atomic().set(CHOICES_KEY, state).commit();
// }

// // Start watching the KV key for changes made by other instances
// // When a change is detected in KV, this instance will broadcast it to its connected clients.
// async function watchChoices() {
//     console.log("Starting KV watch for collective choices...");
//     // Watch the specific key
//     const watcher = kv.watch([CHOICES_KEY]);
//     // Loop through the changes as they occur
//     for await (const entries of watcher) {
//         const latestEntry = entries[0];
//         // If the entry exists and has a value, it means the state was updated in KV
//         if (latestEntry && latestEntry.value !== null) {
//             console.log("KV change detected, broadcasting update to local clients.");
//             // Broadcast the latest state from KV to all clients connected to THIS instance
//             // This ensures clients on this instance get updates from changes made on other instances.
//             io.emit('updateCollectiveChoices', latestEntry.value);
//         } else {
//              // This case might handle initial null state or if the key is deleted.
//              // Fetching and broadcasting the current state from KV is a safe fallback.
//              console.log("KV key status changed (deleted or null), fetching latest state.");
//              const currentState = await getCollectiveChoices(); // Fetch the latest state just in case
//              io.emit('updateCollectiveChoices', currentState);
//         }
//     }
// }

// // Call the watch function to start the listener.
// // We don't await it because it's a continuous loop.
// watchChoices().catch(console.error); // Catch any errors in the watch loop

// // --- End Deno KV Setup ---


// Socket connection

io.on("connection", (socket) => {
  console.log("We have a new client: " + socket.id);
  
  // Send current state to new clients
  socket.emit('updateCollectiveChoices', collectiveChoices);
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
    
    // Broadcast updated choices to all clients
    io.emit('updateCollectiveChoices', collectiveChoices);
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