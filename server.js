// 20250430 FOR DENO KV

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
// In development, this will create a local file database.
const kv = await Deno.openKv();
const CHOICES_KEY = ["collective_choices"]; // Define a key for our data in KV

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

// Start watching the KV key for changes made by other instances
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
            io.emit('updateCollectiveChoices', latestEntry.value);
        } else {
             // This case might handle initial null state or if the key is deleted.
             // Fetching and broadcasting the current state from KV is a safe fallback.
             console.log("KV key status changed (deleted or null), fetching latest state.");
             const currentState = await getCollectiveChoices(); // Fetch the latest state just in case
             io.emit('updateCollectiveChoices', currentState);
        }
    }
}

// Call the watch function to start the listener.
// We don't await it because it's a continuous loop.
watchChoices().catch(console.error); // Catch any errors in the watch loop

// --- End Deno KV Setup ---


// Socket connection
io.on("connection", async (socket) => { // Make the connection handler async to use await
  console.log("We have a new client: " + socket.id);

  // Send current collective choices (fetched from KV) to newly connected clients
  const currentChoices = await getCollectiveChoices();
  socket.emit('updateCollectiveChoices', currentChoices);

  // Handle choice selection from mobile users
  socket.on('makeChoice', async (choice) => { // Make the handler async
    console.log("Received choice from client " + socket.id + ":", choice);

    // Get current state from KV
    const currentState = await getCollectiveChoices();

    // Update collective choices in the state object
    currentState.choices.push(choice);
    currentState.totalVotes++;

    // Save the updated state back to KV
    await setCollectiveChoices(currentState);

    // IMPORTANT: We no longer need to io.emit() here after saving to KV.
    // The watchChoices function running on *each* instance will detect
    // the change in KV and broadcast the update to the clients connected
    // to that specific instance. This is how state is synchronized.
  });

  // Handle reset request
  socket.on('resetChoices', async () => { // Make the handler async
    console.log("Resetting all choices");

    // Define the initial empty state
    const initialState = { choices: [], totalVotes: 0 };

    // Save the initial state to KV (this effectively resets it)
    await setCollectiveChoices(initialState);

    // IMPORTANT: We no longer need to io.emit() here after saving to KV.
    // The watchChoices function on each instance handles the broadcast.
  });

  // Handle removing top choice - ADDED THIS io HANDLER
  socket.on('removeTopChoice', async (topChoice) => { // Make the handler async
    console.log("[Server] Removing:", topChoice);

    // Get current state from KV
    const currentState = await getCollectiveChoices();

    // Remove all instances of the top choice
    currentState.choices = currentState.choices.filter(choice => choice !== topChoice);

    // Update total votes based on the filtered array
    currentState.totalVotes = currentState.choices.length;

    console.log("Votes after removal:", currentState.choices.length);

    // Save the updated state back to KV
    await setCollectiveChoices(currentState);
  }); 
  
  //Listen for this client to disconnect
  socket.on("disconnect", () => {
    console.log("A client has disconnected: " + socket.id);
  });
});


server.listen(port, () => {
  console.log(`Server listening on port: ${port}`);
});