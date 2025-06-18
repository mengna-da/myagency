// 20250614 FOR DENO KV

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
const CHOICES_KEY = ["collective_choices"]; // Define a key for our data in KV
const STAGE_KEY = ["current_stage"]; // Define a key for stage tracking

// Function to get the current collective choices from KV
async function getCollectiveChoices() {
    const entry = await kv.get(CHOICES_KEY);
    // Return the value if it exists, otherwise return the initial state structure
    return entry.value || { choices: [], totalVotes: 0 };
}

// Function to set the collective choices in KV
async function setCollectiveChoices(state) {
    // Use an atomic transaction for safer writes (optional but good practice for preventing race conditions)
    await kv.atomic().set(CHOICES_KEY, state).commit();
}

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

// Start watching the KV keys for changes made by clients on other instances.
// When a change is detected in KV, this instance will broadcast it to its connected clients.
async function watchChoices() {
    console.log("Starting KV watch for collective choices...");
    // Watch the specific key
    const watcher = kv.watch([CHOICES_KEY]);
    // Loop through the changes as they occur
    for await (const entries of watcher) {
        const latestEntry = entries[0];
        // If the entry exists and has a value, it means the state was updated in KV
        if (latestEntry && latestEntry.value !== null) {
            console.log("KV change detected, broadcasting update to local clients.");
            // Broadcast the latest state from KV to all clients connected to THIS instance
            // This ensures clients on this instance get updates from changes made on other instances.
            // io.emit('updateCollectiveChoices', latestEntry.value);
            let collectiveChoices = latestEntry.value;  
            let latestChoice = collectiveChoices.choices[collectiveChoices.choices.length - 1];
            if (latestChoice) {
              io.emit('broadcastLatestChoice', latestChoice);
            }
        } else {
             // This case might handle initial null state or if the key is deleted.
             // Fetching and broadcasting the current state from KV is a safe fallback.
             console.log("KV key status changed (deleted or null), fetching latest state.");
             const currentState = await getCollectiveChoices(); // Fetch the latest state just in case
            //  io.emit('updateCollectiveChoices', currentState);
        }
    }
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
watchChoices().catch(console.error); // Catch any errors in the watch loop
watchStage().catch(console.error); // Catch any errors in the stage watch loop

// --- End Deno KV Setup ---


// Socket connection
io.on("connection", async (socket) => { // Make the connection handler async to use await
  console.log("We have a new client: " + socket.id);
  
  // Send current state to new clients (fetched from KV)
  const currentChoices = await getCollectiveChoices();
  const currentStage = await getCurrentStage();
  socket.emit('updateCollectiveChoices', currentChoices);
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
    
    // Get current state from KV
    const currentState = await getCollectiveChoices();
    console.log("[Server] Current votes:", currentState.choices.length);
    
    // Update collective choices in the state object
    currentState.choices.push(choice);
    currentState.totalVotes++;
    
    // Save the updated state back to KV
    await setCollectiveChoices(currentState);
  });
  
  // Handle removing top choice
  socket.on('removeTopChoice', async (topChoice) => { // Make the handler async
    console.log("[Server] Removing:", topChoice);
    
    // Get current state from KV
    const currentState = await getCollectiveChoices();
    console.log("[Server] Votes before removal:", currentState.choices.length);
    
    // Remove all instances of the top choice
    currentState.choices = currentState.choices.filter(choice => choice !== topChoice);
    
    // Update total votes
    currentState.totalVotes = currentState.choices.length;
    
    console.log("[Server] Votes after removal:", currentState.choices.length);
    
    // Save the updated state back to KV
    await setCollectiveChoices(currentState);
  });
  
  // Handle reset request
  socket.on('resetChoices', async () => { // Make the handler async
    console.log("Resetting all choices");
    
    // Define the initial empty state
    const initialState = { choices: [], totalVotes: 0 };
    
    // Save the initial state to KV (this effectively resets it)
    await setCollectiveChoices(initialState);
  });
  
  //Listen for this client to disconnect
  socket.on("disconnect", () => {
    console.log("A client has disconnected: " + socket.id);
  });
});


server.listen(port, () => {
  console.log(`Server listening on port: ${port}`);
});