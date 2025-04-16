// Use the global Socket.io instance
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

        // Find the choice with highest count, and if multiple have same count, take the first one
        const topChoice = currentChoices.reduce((prev, current) => {
            if (current.count > prev.count) {
                return current;
            }
            return prev;
        });
        
        // Remove the top choice from current choices
        currentChoices = currentChoices.filter(choice => choice.choice !== topChoice.choice);
        elements.topMarquee.innerHTML = `<span>${topChoice.choice}</span><span>${topChoice.choice}</span>`;
        updateChoicesDisplay();
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
        updateChoicesDisplay();
        
        // Clear any existing interval
        clearInterval(choiceInterval);
        
        // Immediately update the banner with the first top choice
        updateBannerWithTopChoice();
        
        // Then start the interval for subsequent updates
        choiceInterval = setInterval(updateBannerWithTopChoice, 15000);
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