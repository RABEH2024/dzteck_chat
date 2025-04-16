// Main DOM elements
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const modelSelect = document.getElementById('model-select');
const apiKeyInput = document.getElementById('api-key');

// API endpoints
const OPENROUTER_API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const SERVER_API_ENDPOINT = '/api';

// تعريف النماذج المفضلة والمجانية
const FREE_MODELS = [
    "mistralai/mistral-7b-instruct-v0.2",
    "google/gemma-7b-it",
    "nousresearch/nous-hermes-2-mistral-7b-dpo",
    "openchat/openchat-7b",
    "gryphe/mythomist-7b",
    "01-ai/yi-1.5-9b-chat"
];

// For storing conversation history
let conversationHistory = [
    { 
        role: "system", 
        content: "أنت مساعد ذكي ومفيد يتحدث باللغة العربية بطلاقة. أجب بدقة ووضوح على أسئلة المستخدم. كن مهذباً ودقيقاً في إجاباتك. استخدم اللغة العربية الفصحى البسيطة السهلة الفهم. قدم إجابات مفصلة ومفيدة ولكن بشكل موجز ومناسب. تعامل مع المستخدم بلطف واحترام وحاول مساعدته بأقصى ما يمكن. أنت تمثل واجهة محادثة DzTeck." 
    },
    { 
        role: "assistant", 
        content: "مرحباً بك في DzTeck! كيف يمكنني مساعدتك اليوم؟" 
    }
];

// Add event listeners
sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

// Toggle API key visibility
const toggleApiKeyButton = document.getElementById('toggle-api-key');
toggleApiKeyButton.addEventListener('click', function() {
    const apiKeyField = document.getElementById('api-key');
    const fieldType = apiKeyField.getAttribute('type');
    
    if (fieldType === 'password') {
        apiKeyField.setAttribute('type', 'text');
        this.querySelector('img').style.opacity = '0.7';
    } else {
        apiKeyField.setAttribute('type', 'password');
        this.querySelector('img').style.opacity = '1';
    }
});

// Try to load API key from localStorage if available
document.addEventListener('DOMContentLoaded', () => {
    const savedApiKey = localStorage.getItem('openrouter_api_key');
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
    }
    
    // Focus on input field by default
    userInput.focus();
    
    // التحقق من وجود خطأ في المفتاح من تنفيذ سابق
    const lastError = localStorage.getItem('last_api_error');
    if (lastError) {
        addMessage('bot', lastError);
        localStorage.removeItem('last_api_error');
    }
});

// Save API key to localStorage when changed
apiKeyInput.addEventListener('change', () => {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
        localStorage.setItem('openrouter_api_key', apiKey);
    }
});

// Function to add a message to the chat display
function addMessage(sender, text) {
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
    
    // Update conversation history
    conversationHistory.push({
        role: sender === 'user' ? 'user' : 'assistant',
        content: text
    });
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

// Function to send message and call API
async function sendMessage() {
    const userText = userInput.value.trim();
    const selectedModel = modelSelect.value;
    const apiKey = apiKeyInput.value.trim();

    if (!userText) {
        return; // Don't send empty messages
    }

    if (!apiKey) {
        alert('الرجاء إدخال مفتاح OpenRouter API!');
        apiKeyInput.focus();
        return;
    }

    // Add user message to chat
    addMessage('user', userText);
    userInput.value = ''; // Clear input field
    userInput.focus();     // Keep focus on input

    // Show thinking indicator
    showThinkingIndicator();

    try {
        // Prepare messages for API - only send the most recent messages to save tokens
        // For a real app, you might want to maintain full context but limit tokens
        const messagesToSend = conversationHistory.slice(-10); // Last 10 messages
        
        // Set additional parameters based on model type
        const isFreeModel = FREE_MODELS.includes(selectedModel);
        
        // Build API request
        const requestBody = {
            model: selectedModel,
            messages: messagesToSend,
            temperature: 0.7,  // إضافة درجة حرارة متوازنة
            max_tokens: isFreeModel ? 1024 : 2048 // تعديل عدد التوكنز حسب نوع النموذج
        };
        
        const response = await fetch(OPENROUTER_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'DzTeck Chat'
            },
            body: JSON.stringify(requestBody)
        });

        // Remove thinking indicator
        removeThinkingIndicator();

        if (!response.ok) {
            // Try to read error message from API if available
            const errorData = await response.json().catch(() => null);
            const errorMessage = errorData?.error?.message || `حدث خطأ: ${response.status} ${response.statusText}`;
            throw new Error(errorMessage);
        }

        const data = await response.json();

        // Extract bot reply
        const botReply = data.choices[0]?.message?.content;

        if (botReply) {
            addMessage('bot', botReply.trim());
        } else {
            addMessage('bot', 'لم أتمكن من الحصول على رد. يرجى المحاولة مرة أخرى.');
        }

    } catch (error) {
        console.error('Error calling OpenRouter API:', error);
        removeThinkingIndicator();
        
        // رسائل خطأ أكثر وضوحاً
        if (error.message.includes('API key')) {
            addMessage('bot', 'عذراً، يبدو أن مفتاح API غير صالح. يرجى التحقق من المفتاح والمحاولة مرة أخرى.');
        } else if (error.message.includes('quota') || error.message.includes('credits')) {
            addMessage('bot', 'عذراً، لقد تجاوزت الحد المسموح به من الاستخدام لهذا المفتاح. يرجى المحاولة لاحقاً أو استخدام مفتاح آخر.');
        } else {
            addMessage('bot', `عذرًا، حدث خطأ: ${error.message}`);
        }
    }
}
// --- أضف هذا الكود في نهاية ملف script.js ---

document.addEventListener('DOMContentLoaded', () => {
    // ... (الكود الموجود في DOMContentLoaded، مثل تحميل API key والتركيز)

    const chatBoxForDelete = document.getElementById('chat-box'); // أعد تعريفه هنا للتأكد
    const currentChatId = document.getElementById('chat-id')?.value; // احصل على ID المحادثة

    if (chatBoxForDelete && currentChatId) {
        chatBoxForDelete.addEventListener('click', function(event) {
            const deleteButton = event.target.closest('.delete-msg-btn');

            if (deleteButton) {
                const messageId = deleteButton.dataset.messageId;
                const messageElement = deleteButton.closest('.message');

                if (messageId && messageId !== 'unknown' && messageElement) {
                    if (confirm('هل أنت متأكد أنك تريد حذف هذه الرسالة؟')) {
                        console.log(`Requesting delete for chat ${currentChatId}, message ${messageId}`);

                        // !!! تأكد من أن هذا المسار صحيح في تطبيق Flask/Django لديك !!!
                        fetch(`/delete_message/${currentChatId}/${messageId}`, {
                            method: 'DELETE', // أو 'POST'
                            headers: {
                                'Content-Type': 'application/json',
                                // أضف أي headers أخرى مطلوبة (مثل CSRF token)
                            },
                        })
                        .then(response => {
                            if (!response.ok) {
                                return response.text().then(text => { throw new Error(`فشل حذف الرسالة: ${response.status} ${text}`); });
                            }
                            // افترض النجاح إذا كانت الاستجابة OK
                            return { success: true };
                        })
                        .then(data => {
                            if (data.success) {
                                console.log('Message deleted successfully on server.');
                                messageElement.remove();
                                // يمكنك إظهار إشعار نجاح صغير
                            }
                        })
                        .catch(error => {
                            console.error('Error deleting message:', error);
                            alert(`حدث خطأ أثناء حذف الرسالة: ${error.message}`);
                        });
                    }
                } else {
                    console.warn('Could not find message ID or message element for deletion.');
                }
            }
        });
    } else {
        // هذا سيظهر إذا لم يتم العثور على chat-box أو chat-id، مفيد للتشخيص
        console.warn('Chat box or chat ID not found for delete listener setup.');
    }

     // --- تأكد من أن كود التمرير لأسفل موجود ---
    function scrollToBottom() {
        const box = document.getElementById('chat-box');
         if (box) {
            box.scrollTop = box.scrollHeight;
         }
    }
    // التمرير لأسفل عند التحميل الأولي (إذا لم يكن موجودًا بالفعل في DOMContentLoaded)
    scrollToBottom();


}); // نهاية DOMContentLoaded الإضافي أو دمجه مع الموجود

// --- باقي الكود في script.js (sendMessage, addMessage etc.) يبقى كما هو ---
