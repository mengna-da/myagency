//use NPM socket package
//import { io } from 'socket.io-client'; 
import { io } from 'https://cdn.socket.io/4.8.1/socket.io.esm.min.js';
import { choiceToAnimationMap } from './options.js';

// Speech synthesis configuration
const speechConfig = {
    rate: 1.0,    // Speech rate (0.1 to 10)
    pitch: 1.2,   // Speech pitch (0 to 2)
    volume: 3.0   // Speech volume (0 to 1)
};

// Track current banner text and its vote count
let currentBannerText = '';
let bannerTimeout = null;
let currentStage = 0; // Add stage tracking

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
    // console.log('Voices loaded:', window.speechSynthesis.getVoices());
};

// Initialize socket
const socket = io();
// const socket = io('http://localhost:3000'); //for local development
window.socket = socket; // Make socket available globally

// Function to handle stage updates
function handleStageUpdate(stage) {
    console.log('Stage update received:', { oldStage: currentStage, newStage: stage });
    currentStage = stage;
    // Clear any existing timeout when stage changes
    if (bannerTimeout) {
        clearTimeout(bannerTimeout);
        bannerTimeout = null;
    }
    // Clear choices when moving to stages 1-4
    if (stage > 0) {
        currentChoices = [];
        updateChoicesDisplay();
        // Hide the sidebar and choice buttons
        elements.choicesContainer.style.visibility = 'hidden';
        elements.container.style.visibility = 'hidden';
    } else {
        // Show the sidebar and choice buttons when returning to stage 0
        elements.choicesContainer.style.visibility = 'visible';
        elements.container.style.visibility = 'visible';
    }
}

// Get all required elements
const elements = {
    container: document.querySelector('.display-container'),
    choicesContainer: document.getElementById('choicesContainer'),
    topMarquee: document.querySelector('.top-marquee')
};

let currentChoices = [];

// Function to update choices display
function updateChoicesDisplay() {
    elements.choicesContainer.innerHTML = '';
    // Sort by count (highest first) while preserving original order for equal counts
    const sortedChoices = [...currentChoices].sort((a, b) => b.count - a.count);
    sortedChoices.forEach(item => {
        const card = document.createElement('div');
        card.className = 'choice-card';
        card.innerHTML = `
            <div class="choice-button${item.willRemove ? " will-remove" : ""}">${item.choice}</div>
            <div class="choice-count">x ${item.count}</div>
        `;
        elements.choicesContainer.appendChild(card);
    });
}

// Function to update banner with top choice
function updateBannerWithTopChoice() {
    if (currentChoices.length === 0) {
        elements.topMarquee.innerHTML = '<span>No instructions received yet</span><span>No instructions received yet</span>';
        return;
    }
    // Find the current top choice
    const topChoice = currentChoices.reduce((prev, current) => {
        if (current.count > prev.count) {
            return current;
        }
        return prev;
    });
    // Only update banner and reset timeout if the top choice has changed
    if (currentBannerText !== topChoice.choice) {
        // Update the banner with the top choice
        elements.topMarquee.innerHTML = `<span>${topChoice.choice}</span><span>${topChoice.choice}</span>`;
        // Announce the top choice
        speakText(topChoice.choice);
        // Trigger the corresponding animation
        const animationName = choiceToAnimationMap[topChoice.choice.toLowerCase()];
        if (animationName && window.animationManager && window.stageManager) {
            // Get visible avatars from stage manager
            const visibleAvatars = window.stageManager.getVisibleAvatars();
            console.log('Visible avatars for animation:', {
                visibleAvatars,
                animationName,
                topChoice: topChoice.choice
            });
            if (visibleAvatars.length > 0) {
                // Play animation on a random visible avatar
                const randomIndex = Math.floor(Math.random() * visibleAvatars.length);
                const selectedAvatar = visibleAvatars[randomIndex];
                console.log('Selected avatar for animation:', {
                    selectedAvatar,
                    randomIndex,
                    totalVisible: visibleAvatars.length
                });
                // Get the actual animation clip from the animation data
                const animationClip = window.animationData.actions.get(animationName);
                if (animationClip) {
                    window.animationManager.playAnimationOnAvatar(selectedAvatar, animationClip);
                } else {
                    console.log('Animation clip not found:', animationName);
                }
            } else {
                console.log('No visible avatars available for animation');
            }
        } else {
            console.log('Missing required components:', {
                hasAnimationName: !!animationName,
                hasAnimationManager: !!window.animationManager,
                hasStageManager: !!window.stageManager
            });
        }

        // Set new timeout
        bannerTimeout = setTimeout(() => {
            removeAndUpdateTopChoice(topChoice);
        }, 15000);
        // Mark top choice as queued to remove
        topChoice.willRemove = true;
    }
    updateChoicesDisplay();
}

// Function to remove and update the top choice
function removeAndUpdateTopChoice(topChoice) {
    let indexToRemove = currentChoices.findIndex(choice => choice === topChoice);
    console.log("remove:", topChoice, currentChoices, indexToRemove);
    if (indexToRemove !== -1) {
        currentChoices.splice(indexToRemove, 1); // Removes 1 element starting from indexToRemove
    }
    if (currentBannerText === topChoice.choice) {
        currentBannerText = ""
    }
    // Emit the top choice to be removed from server
    socket.emit('removeTopChoice', topChoice.choice);

    updateChoicesDisplay();
    updateBannerWithTopChoice();
}

document.addEventListener('DOMContentLoaded', function() {
    // Check for critical elements
    if (!elements.container || !elements.choicesContainer || !elements.topMarquee) {
        console.error('Critical elements missing. Required: container, choicesContainer, topMarquee');
        return;
    }

    // Listen for stage updates from server
    socket.on('stageUpdate', handleStageUpdate);
    
    socket.on('connect', () => {
        console.log('Desktop page connected to server with socket ID:', socket.id);
        // Request current stage on connection
        socket.emit('getCurrentStage');
    });
    
    socket.on('broadcastLatestChoice', (data) => {
        let latestChoice = data;
        console.log('Choices update:', { stage: currentStage, latest: latestChoice });

        // Handle stage-based behavior
        if (currentStage === 0) {

            if (latestChoice){
                let existing_choice = currentChoices.find((choice)=>{
                    return choice.choice === latestChoice;
                });
                if (!existing_choice) {
                    existing_choice = {choice: latestChoice, count: 0}
                    currentChoices.push(existing_choice)
                }
                existing_choice.count++;
            }
            
            updateChoicesDisplay();
            updateBannerWithTopChoice();
        } else {
            // Immediate response for stages 1-4
            if (latestChoice) {
                handleImmediateResponse(latestChoice);
            }
        }
    });
    
    // Also listen for stage changes from the stage manager
    window.addEventListener('stageChange', (event) => {
        handleStageUpdate(event.detail);
    });
    
    // Add keyboard event listener for reset
    document.addEventListener('keydown', (event) => {
        if (event.key.toLowerCase() === 'r') {
            // Reset choices
            currentChoices = [];
            updateChoicesDisplay();
            // Clear the banner
            elements.topMarquee.innerHTML = '<span>No instructions received yet</span><span>No instructions received yet</span>';
            // Clear any existing timeout
            if (bannerTimeout) {
                clearTimeout(bannerTimeout);
                bannerTimeout = null;
            }
            // Emit reset event to server
            socket.emit('resetChoices');
        }
    });
}); 

// Function to handle immediate response for stages 1-4
function handleImmediateResponse(choice) {
    console.log('Immediate response:', { choice, stage: currentStage });

    // Update the banner immediately
    elements.topMarquee.innerHTML = `<span>${choice}</span><span>${choice}</span>`;
    
    // Announce the choice
    speakText(choice);
    
    // Trigger the corresponding animation
    const animationName = choiceToAnimationMap[choice.toLowerCase()];
    if (animationName && window.animationManager && window.stageManager) {
        const visibleAvatars = window.stageManager.getVisibleAvatars();
        if (visibleAvatars.length > 0) {
            const randomIndex = Math.floor(Math.random() * visibleAvatars.length);
            const selectedAvatar = visibleAvatars[randomIndex];
            
            const animationClip = window.animationData.actions.get(animationName);
            if (animationClip) {
                window.animationManager.playAnimationOnAvatar(selectedAvatar, animationClip);
            } else {
                console.log('Animation not found:', animationName);
            }
        }
    }
} 