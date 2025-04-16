//STEP 1: Client side set up
    // HTML, CS, JS

//STEP 2: Server side set up: Express and Socket.io
//2.1 Initialize the express 'app' object
let express = require('express');
let app = express();
app.use('/', express.static('public'));

//2.2 Initialize HTTP server
let http = require("http");
let server = http.createServer(app);
let port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log("Server listening on port: " + port);
});

//2.3 Initialize socket.io
let io = require("socket.io");
io = new io.Server(server);

// Store the collective choices
let collectiveChoices = {
    choices: [],
    totalVotes: 0
};

//STEP 3: Server side socket connection
io.on("connection", (socket) => {
    console.log("We have a new client: " + socket.id);
    
    // Send current collective choices to new clients
    console.log("Sending current collective choices to new client:", collectiveChoices);
    socket.emit('updateCollectiveChoices', collectiveChoices);
    
    // Handle choice selection from mobile users
    socket.on('makeChoice', (choice) => {
        console.log("Received choice from client " + socket.id + ":", choice);
        
        // Update collective choices
        collectiveChoices.choices.push(choice);
        collectiveChoices.totalVotes++;
        
        console.log("Updated collective choices:", collectiveChoices);
        
        // Broadcast updated choices to all clients
        console.log("Broadcasting updated choices to all clients");
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
