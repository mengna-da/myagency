//use NPM socket package
//import { io } from 'socket.io-client'; 
import { io } from '/node_modules/socket.io-client/dist/socket.io.esm.min.js'; //specify the full path to the module

// Initialize socket
const socket = io();

document.addEventListener('DOMContentLoaded', function() {
    // Get all required elements
    const elements = {
        container: document.querySelector('.display-container'),
        choicesContainer: document.getElementById('choicesContainer'),
        resetButton: document.getElementById('resetButton'),
        topMarquee: document.querySelector('.top-marquee')
    };

    // Check for critical elements
    if (!elements.container || !elements.choicesContainer || !elements.topMarquee) {
        console.error('Critical elements missing. Required: container, choicesContainer, topMarquee');
        return;
    }

    // Handle current choices list
    let currentChoices = [];
    let choiceInterval;
    
    function updateBannerWithTopChoice() {
        if (currentChoices.length === 0) {
            elements.topMarquee.innerHTML = '<span>No instructions received yet</span><span>No instructions received yet</span>';
            return;
        }
        
        // // Update stats
        // totalVotesElement.textContent = data.totalVotes;
        // // Count unique choices
        // const uniqueChoices = new Set(data.choices).size;
        // uniqueChoicesElement.textContent = uniqueChoices;

        console.log("=== Updating Banner ===");
        console.log("Current choices before selection:", currentChoices);
        
        // Find the choice with highest count, and if multiple have same count, take the first one
        const topChoice = currentChoices.reduce((prev, current) => {
            if (current.count > prev.count) {
                return current;
            }
            return prev;
        });
        
        console.log("Selected top choice:", topChoice);
        
        // Update the banner with the top choice
        elements.topMarquee.innerHTML = `<span>${topChoice.choice}</span><span>${topChoice.choice}</span>`;
        updateChoicesDisplay();
    }

    function removeAndUpdateTopChoice() {
        if (currentChoices.length === 0) {
            return;
        }
        
        // Find the current top choice
        const topChoice = currentChoices.reduce((prev, current) => {
            if (current.count > prev.count) {
                return current;
            }
            return prev;
        });
        
        console.log("Removing top choice:", topChoice.choice);
        // Emit the top choice to be removed from server
        socket.emit('removeTopChoice', topChoice.choice);
    }
    
    // Function to update choices display
    function updateChoicesDisplay() {
        elements.choicesContainer.innerHTML = '';
        
        // Sort by count (highest first) while preserving original order for equal counts
        const sortedChoices = [...currentChoices].sort((a, b) => b.count - a.count);
        
        sortedChoices.forEach(item => {
            const card = document.createElement('div');
            card.className = 'choice-card';
            card.innerHTML = `
                <div class="choice-button">${item.choice}</div>
                <div class="choice-count">x ${item.count}</div>
            `;
            elements.choicesContainer.appendChild(card);
        });
    }
    
    socket.on('connect', () => {
        console.log('Desktop page connected to server with socket ID:', socket.id);
    });
    
    socket.on('updateCollectiveChoices', (data) => {
        console.log("=== Received Update ===");
        console.log("Raw data received:", data);
        
        // Create a map to count occurrences while preserving order
        const choiceMap = new Map();
        data.choices.forEach(choice => {
            if (!choiceMap.has(choice)) {
                choiceMap.set(choice, { choice, count: 0 });
            }
            choiceMap.get(choice).count++;
        });
        
        // Convert map to array while preserving order
        currentChoices = Array.from(choiceMap.values());
        console.log("Processed current choices:", currentChoices);
        
        // Update the display with current choices
        updateChoicesDisplay();
        
        // Update the banner with the top choice
        updateBannerWithTopChoice();
        
        // Only start the interval if it's not already running
        if (!choiceInterval) {
            // Then start the interval for removing and updating the top choice
            choiceInterval = setInterval(removeAndUpdateTopChoice, 10000);
            console.log("Started interval for removing top choices");
        }
    });
    
    //Handle reset button
    if (elements.resetButton) {
        elements.resetButton.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all choices?')) {
                socket.emit('resetChoices');
                clearInterval(choiceInterval);
                elements.topMarquee.innerHTML = '<span>No instructions received yet</span><span>No instructions received yet</span>';
            }
        });
    }
}); 