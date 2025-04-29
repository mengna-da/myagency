//use NPM socket package
//import { io } from 'socket.io-client'; 
import { io } from 'https://cdn.socket.io/4.8.1/socket.io.esm.min.js';

// Speech synthesis configuration
const speechConfig = {
    rate: 1.0,    // Speech rate (0.1 to 10)
    pitch: 1.2,   // Speech pitch (0 to 2)
    volume: 1.0   // Speech volume (0 to 1)
};

// Track current banner text and its vote count
let currentBannerText = '';
let bannerTimeout = null;

// Function to speak text
function speakText(text) {
    // Only speak if the text is different from current banner text
    if (text !== currentBannerText) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        // Create a new speech utterance
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Configure the utterance
        utterance.rate = speechConfig.rate;
        utterance.pitch = speechConfig.pitch;
        utterance.volume = speechConfig.volume;
        
        // Get available voices and find Fred
        const voices = window.speechSynthesis.getVoices();
        const maleVoice = voices.find(voice => voice.name === 'Fred');
        
        if (maleVoice) {
            utterance.voice = maleVoice;
        }
        
        // Speak the text
        window.speechSynthesis.speak(utterance);
        
        // Update current banner text
        currentBannerText = text;
    }
}

// Load voices when they become available
window.speechSynthesis.onvoiceschanged = function() {
    console.log('Voices loaded:', window.speechSynthesis.getVoices());
};

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
            if (bannerTimeout) {
                clearTimeout(bannerTimeout);
                bannerTimeout = null;
            }
            return;
        }
        
        console.log("=== Updating Banner ===");
        console.log("Current time:", new Date().toISOString());
        console.log("Current choices before selection:", currentChoices);
        
        // Find the choice with highest count
        const topChoice = currentChoices.reduce((prev, current) => {
            if (current.count > prev.count) {
                return current;
            }
            return prev;
        });
        
        console.log("Selected top choice:", topChoice);
        
        // Get current banner text
        const currentBannerText = elements.topMarquee.querySelector('span').textContent;
        
        // Only update banner and reset timeout if the top choice has changed
        if (currentBannerText !== topChoice.choice) {
            // Update the banner with the top choice
            elements.topMarquee.innerHTML = `<span>${topChoice.choice}</span><span>${topChoice.choice}</span>`;
            
            // Speak the top choice
            speakText(topChoice.choice);
            
            // Clear any existing timeout
            if (bannerTimeout) {
                clearTimeout(bannerTimeout);
            }
            
            // Set new timeout
            bannerTimeout = setTimeout(() => {
                console.log("Timeout triggered at:", new Date().toISOString());
                removeAndUpdateTopChoice();
            }, 15000);
            
            console.log("Set timeout for banner removal at:", new Date().toISOString());
        }
        
        updateChoicesDisplay();
    }

    function removeAndUpdateTopChoice() {
        console.log("=== Removing Top Choice ===");
        console.log("Current time:", new Date().toISOString());
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
        
        console.log("[Client] Removing top choice:", topChoice.choice);
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
        console.log("[Client] Received collectiveChoices:", {
            choices: data.choices,
            totalVotes: data.totalVotes
        });
        
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
        
        // Update the display with current choices
        updateChoicesDisplay();
        
        // Update the banner with the top choice
        updateBannerWithTopChoice();
    });
    
    //Handle reset button
    if (elements.resetButton) {
        elements.resetButton.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all choices?')) {
                socket.emit('resetChoices');
                clearTimeout(bannerTimeout);
                elements.topMarquee.innerHTML = '<span>No instructions received yet</span><span>No instructions received yet</span>';
            }
        });
    }
}); 