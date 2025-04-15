// Main DOM elements
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const chatId = document.getElementById('chat-id').value;
const modelName = document.getElementById('model-name').value;

// Server endpoints
const SERVER_API_ENDPOINT = `/chat/${chatId}/message`;

// Conversation history from the server-side
let conversationHistory = [];

// Load message history from the server
async function loadChatHistory() {
    try {
        const response = await fetch(`/chat/${chatId}/history`);
        const messages = await response.json();
        
        // Add messages to the conversation history
        conversationHistory = messages.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
        
    } catch (error) {
        console.error('Failed to load chat history:', error);
    }
}

// Load chat history when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    // Load the chat history
    await loadChatHistory();
    
    // Focus on input field
    userInput.focus();
});

// Add event listeners
sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

// Function to add a message to the chat display
function addMessageToUI(sender, text) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
    
    // Create icon container
    const iconDiv = document.createElement('div');
    iconDiv.classList.add('message-icon');
    
    // Create icon image
    const iconImg = document.createElement('img');
    iconImg.src = sender === 'user' 
        ? '/static/img/user-icon.svg' 
        : '/static/img/bot-icon.svg';
    iconImg.alt = sender === 'user' ? 'User' : 'Bot';
    
    // Create content container
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    contentDiv.textContent = text;
    
    // Assemble the message
    iconDiv.appendChild(iconImg);
    messageDiv.appendChild(iconDiv);
    messageDiv.appendChild(contentDiv);
    
    // Add to chat box
    chatBox.appendChild(messageDiv);
    
    // Scroll to bottom
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Function to show thinking indicator
function showThinkingIndicator() {
    const thinkingDiv = document.createElement('div');
    thinkingDiv.classList.add('message', 'bot-message', 'thinking');
    thinkingDiv.id = 'thinking-indicator';
    
    // Create icon container
    const iconDiv = document.createElement('div');
    iconDiv.classList.add('message-icon');
    
    // Create icon image
    const iconImg = document.createElement('img');
    iconImg.src = '/static/img/bot-icon.svg';
    iconImg.alt = 'Bot';
    
    // Create content container with animated dots
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    
    const dotsDiv = document.createElement('div');
    dotsDiv.classList.add('thinking-dots');
    
    // Add the three animated dots
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('span');
        dotsDiv.appendChild(dot);
    }
    
    contentDiv.appendChild(dotsDiv);
    
    // Assemble the message
    iconDiv.appendChild(iconImg);
    thinkingDiv.appendChild(iconDiv);
    thinkingDiv.appendChild(contentDiv);
    
    // Add to chat box
    chatBox.appendChild(thinkingDiv);
    
    // Scroll to bottom
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Function to remove thinking indicator
function removeThinkingIndicator() {
    const indicator = document.getElementById('thinking-indicator');
    if (indicator) {
        chatBox.removeChild(indicator);
    }
}

// Function to send message and get response from the server
async function sendMessage() {
    const userText = userInput.value.trim();

    if (!userText) {
        return; // Don't send empty messages
    }

    // Add user message to chat UI
    addMessageToUI('user', userText);
    
    // Clear input field and focus
    userInput.value = '';
    userInput.focus();

    // Show thinking indicator
    showThinkingIndicator();

    try {
        // Send the user message to the server-side endpoint
        const response = await fetch(SERVER_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: userText
            })
        });

        // Remove thinking indicator
        removeThinkingIndicator();

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        
        // Add bot message to UI from the server response
        addMessageToUI('bot', data.content);

    } catch (error) {
        console.error('Error in chat communication:', error);
        removeThinkingIndicator();
        
        // رسائل خطأ أكثر وضوحاً
        const errorMessage = `عذرًا، حدث خطأ: ${error.message}`;
        addMessageToUI('bot', errorMessage);
    }
}
