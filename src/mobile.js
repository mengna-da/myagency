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
        
        // Create a ton of sets
        const firstSet = createButtonSet();
        choiceRow.appendChild(firstSet);

        for (let i = 0; i < 1; i++) {
            // Clone and append set
            const copySet = firstSet.cloneNode(true);
            choiceRow.appendChild(copySet);
        }
        

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
            console.log("click");
            const choice = button.getAttribute('data-choice');

            let isSelected = button.classList.contains('selected');
            if (isSelected) {
                button.classList.remove('selected');
                console.log('Deselected choice:', choice);
            } else {
                button.classList.add('selected');
                console.log('Selected choice:', choice);
                
                // Send choice to server immediately
                console.log('Sending choice to server:', choice);
                socket.emit('makeChoice', choice);
            }
        });
    });

    // Add refresh button functionality
    // const refreshButton = document.querySelector('.refresh-button');
    // refreshButton.addEventListener('click', () => {
    //     window.location.reload();
    // });
}); 
