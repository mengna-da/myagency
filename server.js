// 20250619 FOR DENO KV

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

// --- Deno KV Setup for Shared State ---

// Open the Deno KV database
// Deno KV is available globally in Deno Deploy with zero setup.
const kv = await Deno.openKv();
const STAGE_KEY = ["current_stage"]; // Define a key for stage tracking

// Function to get the current stage from KV
async function getCurrentStage() {
    const entry = await kv.get(STAGE_KEY);
    // Return the value if it exists, otherwise return 0
    return entry.value || 0;
}

// Function to set the current stage in KV
async function setCurrentStage(stage) {
    await kv.atomic().set(STAGE_KEY, stage).commit();
}

// Watch for stage changes
async function watchStage() {
    console.log("Starting KV watch for stage changes...");
    const watcher = kv.watch([STAGE_KEY]);
    for await (const entries of watcher) {
        const latestEntry = entries[0];
        if (latestEntry && latestEntry.value !== null) {
            console.log("Stage KV change detected, broadcasting update to local clients.");
            io.emit('stageUpdate', latestEntry.value);
        } else {
            console.log("Stage KV key status changed, fetching latest state.");
            const currentStage = await getCurrentStage();
            io.emit('stageUpdate', currentStage);
        }
    }
}

// Call the watch functions to start the listeners.
// We don't await them because they're continuous loops.
watchStage().catch(console.error); // Catch any errors in the stage watch loop

// --- End Deno KV Setup ---

// Socket connection
io.on("connection", async (socket) => { // Make the connection handler async to use await
  console.log("We have a new client: " + socket.id);
  
  // Send current state to new clients (fetched from KV)
  const currentStage = await getCurrentStage();
  socket.emit('stageUpdate', currentStage);
  
  // Handle stage changes
  socket.on('stageChange', async (stage) => { // Make the handler async
    console.log("[Server] Stage change:", stage);
    
    // Save the stage to KV
    await setCurrentStage(stage);
  });
  
  // Handle choice selection from mobile users
  socket.on('makeChoice', async (choice) => { // Make the handler async
    console.log("[Server] New choice:", choice);
    
    io.emit('broadcastLatestChoice', choice);
  });
  
  //Listen for this client to disconnect
  socket.on("disconnect", () => {
    console.log("A client has disconnected: " + socket.id);
  });
});

server.listen(port, () => {
  console.log(`Server listening on port: ${port}`);
});