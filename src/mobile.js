//use NPM socket package
//import { io } from 'socket.io-client'; 
import { io } from 'https://cdn.socket.io/4.8.1/socket.io.esm.min.js';
import { options, buttonsPerSet } from './options.js';

// Initialize socket
const socket = io();
// const socket = io('http://localhost:3000'); //for local development

document.addEventListener('DOMContentLoaded', function() {
    const choiceContainer = document.querySelector('.choice-container');
    // const confirmationMessage = document.getElementById('confirmationMessage');
    
    // Set to track selected choices
    let selectedChoices = new Set();
    
    // Function to get random option
    function getRandomOption() {
        return options[Math.floor(Math.random() * options.length)];
    }
    
    // Function to create a set of buttons
    function createButtonSet() {
        const container = document.createElement('div');
        container.className = 'button-set';
        for (let i = 0; i < buttonsPerSet; i++) {
            const button = document.createElement('button');
            button.className = 'choice-button';
            const randomOption = getRandomOption();
            button.setAttribute('data-choice', randomOption);
            button.textContent = randomOption;
            container.appendChild(button);
        }
        return container;
    }
    
    // Generate choice rows and buttons
    for (let row = 0; row < 3; row++) {
        const choiceRow = document.createElement('div');
        choiceRow.className = 'choice-row';
        
        // Create first set
        const firstSet = createButtonSet();
        choiceRow.appendChild(firstSet);
        
        // Clone and append second set
        const secondSet = firstSet.cloneNode(true);
        choiceRow.appendChild(secondSet);
        
        choiceContainer.appendChild(choiceRow);
    }
    
    // Get all choice buttons after they're created
    const choiceButtons = document.querySelectorAll('.choice-button');
    
    // Connect to server
    socket.on('connect', () => {
        console.log('Mobile page connected to server with socket ID:', socket.id);
    });
    
    // Handle choice button clicks
    choiceButtons.forEach(button => {
        button.addEventListener('click', () => {
            const choice = button.getAttribute('data-choice');
            
            // Toggle selection
            if (selectedChoices.has(choice)) {
                // Deselect
                selectedChoices.delete(choice);
                button.classList.remove('selected');
                console.log('Deselected choice:', choice);
            } else {
                // Select
                selectedChoices.add(choice);
                button.classList.add('selected');
                console.log('Selected choice:', choice);
                
                // Send choice to server immediately
                console.log('Sending choice to server:', choice);
                socket.emit('makeChoice', choice);
                
                // // Show confirmation message briefly
                // confirmationMessage.textContent = `You selected: ${choice}`;
                // confirmationMessage.style.display = 'block';
                
                // // Hide confirmation message after 2 seconds
                // setTimeout(() => {
                //     confirmationMessage.style.display = 'none';
                // }, 2000);
            }
        });
    });
    
    // Listen for updates from the server
    socket.on('updateCollectiveChoices', (data) => {
        console.log('Received collective choices update:', data);
    });

    // Add refresh button functionality
    const refreshButton = document.querySelector('.refresh-button');
    refreshButton.addEventListener('click', () => {
        window.location.reload();
    });
}); 
