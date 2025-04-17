// chat.js (for chat.html)

document.addEventListener('DOMContentLoaded', () => {
    // --- عناصر الواجهة (Selectors) ---
    const sidebar = document.querySelector('.sidebar');
    const conversationListElement = document.getElementById('conversation-list-chat');
    const newChatButtonSidebar = document.getElementById('new-chat-button-sidebar');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const chatWrapper = document.querySelector('.chat-wrapper');
    const chatTitleElement = document.getElementById('chat-title');
    const currentModelDisplay = document.getElementById('current-model-display');
    const exportChatButton = document.getElementById('export-chat-button');
    const deleteChatButton = document.getElementById('delete-chat-btn');
    const modelSelect = document.getElementById('model-select-chat');
    const temperatureInput = document.getElementById('temperature-input');
    const temperatureValue = document.getElementById('temperature-value');
    const maxTokensInput = document.getElementById('max-tokens-input');
    const searchInput = document.getElementById('search-input');
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const chatIdInput = document.getElementById('chat-id'); // Hidden input

    // --- ثوابت وإعدادات ---
    const OPENROUTER_API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
    const STORAGE_KEYS = {
        apiKey: 'chatdz_apiKey',
        conversations: 'chatdz_conversations',
        darkMode: 'chatdz_darkMode'
    };
    const DEBOUNCE_DELAY = 300; // للتأخير في البحث

    // --- حالة التطبيق ---
    let apiKey = '';
    let allConversations = [];
    let currentConversationId = null;
    let currentConversation = null;
    let thinkingIndicator = null;
    let searchDebounceTimer;
    const synth = window.speechSynthesis;
    let currentUtterance = null;

    // --- بدء تشغيل التطبيق ---
    initializeChatApplication();

    // =====================================================================
    //                        تهيئة التطبيق والتحميل الأولي
    // =====================================================================
    function initializeChatApplication() {
        console.log("Initializing Chat Application...");
        apiKey = localStorage.getItem(STORAGE_KEYS.apiKey) || '';

        if (!apiKey) {
            handleFatalError("مفتاح OpenRouter API غير موجود. يرجى إضافته في الصفحة الرئيسية.");
            // يمكن إعادة التوجيه للصفحة الرئيسية بعد فترة قصيرة
            // setTimeout(() => { window.location.href = 'index.html'; }, 3000);
            return;
        }

        loadDarkModePreference(); // تحميل وتطبيق الوضع الليلي
        allConversations = loadConversationsFromStorage(); // تحميل كل المحادثات

        // تحديد المحادثة الحالية من URL
        const urlParams = new URLSearchParams(window.location.search);
        const requestedId = urlParams.get('id');

        if (!requestedId || !allConversations.some(c => c.id === requestedId)) {
            console.warn(`Chat ID "${requestedId}" not found or invalid.`);
            // حاول الانتقال إلى آخر محادثة أو البدء بواحدة جديدة
            const latestConv = getLatestConversation();
            if (latestConv) {
                console.log("Redirecting to latest conversation:", latestConv.id);
                switchConversation(latestConv.id, true); // استبدل التاريخ الحالي
            } else {
                console.log("No existing chats found, starting a new one.");
                startNewChat(true); // ابدأ محادثة جديدة واستبدل التاريخ
            }
            // التوقف هنا لأن الصفحات الأخرى ستعيد التحميل
            return;
        }

        // تعيين المحادثة الحالية
        currentConversationId = requestedId;
        currentConversation = allConversations.find(c => c.id === currentConversationId);
        if (chatIdInput) chatIdInput.value = currentConversationId; // تعيين قيمة الحقل المخفي

        if (!currentConversation) {
            handleFatalError(`خطأ فادح: لم يتم العثور على بيانات المحادثة لـ ID: ${currentConversationId}`);
            return;
        }

        console.log(`Chat loaded: ${currentConversation.title} (ID: ${currentConversationId})`);

        // تحميل بيانات المحادثة في الواجهة
        loadCurrentConversationData();
        renderSidebar(); // رسم القائمة الجانبية مع تحديد العنصر النشط
        setupAllEventListeners(); // إعداد جميع مستمعي الأحداث
        adjustTextareaHeight(); // ضبط ارتفاع منطقة النص
        scrollToBottom(); // التمرير للأسفل عند التحميل
        console.log("Chat Application Initialized Successfully.");
    }

    function handleFatalError(message) {
        console.error("Fatal Error:", message);
        if (chatTitleElement) chatTitleElement.textContent = "خطأ";
        if (chatBox) chatBox.innerHTML = `<p style="color: red; text-align: center; padding: 20px;">${message}</p>`;
        // تعطيل كل المدخلات
        disableAllInputs(true);
    }

    function disableAllInputs(disabled) {
         const elementsToDisable = [
            userInput, sendButton, modelSelect, temperatureInput,
            maxTokensInput, searchInput, exportChatButton, deleteChatButton,
            newChatButtonSidebar, darkModeToggle
        ];
        elementsToDisable.forEach(el => {
            if (el) el.disabled = disabled;
        });
        if (conversationListElement) {
            conversationListElement.style.pointerEvents = disabled ? 'none' : 'auto';
             conversationListElement.style.opacity = disabled ? '0.5' : '1';
        }
    }

    // =====================================================================
    //                        إدارة المحادثات (بيانات + واجهة جانبية)
    // =====================================================================

    function loadConversationsFromStorage() {
        const saved = localStorage.getItem(STORAGE_KEYS.conversations);
        try {
            const parsed = saved ? JSON.parse(saved) : [];
            // Validate and provide defaults for each conversation
            return parsed.map(conv => ({
                id: conv.id || Date.now().toString() + Math.random().toString(16).slice(2), // Ensure ID exists
                title: conv.title || "محادثة بدون عنوان",
                createdAt: conv.createdAt || new Date().toISOString(),
                messages: Array.isArray(conv.messages) ? conv.messages : [],
                settings: {
                    model: conv.settings?.model || 'mistralai/mistral-7b-instruct-v0.2',
                    temperature: conv.settings?.temperature ?? 0.7, // Use nullish coalescing
                    max_tokens: conv.settings?.max_tokens ?? 512,
                }
            })).filter(c => c.id); // Filter out any potentially invalid entries without ID
        } catch (e) {
            console.error("Failed to parse conversations from storage:", e);
            localStorage.removeItem(STORAGE_KEYS.conversations);
            return [];
        }
    }

    function saveConversationsToStorage() {
        try {
            localStorage.setItem(STORAGE_KEYS.conversations, JSON.stringify(allConversations));
        } catch (e) {
            console.error("Failed to save conversations to localStorage:", e);
            alert("خطأ: تعذر حفظ المحادثات، قد تكون مساحة التخزين ممتلئة.");
        }
    }

    function getLatestConversation() {
        if (allConversations.length === 0) return null;
        // Sort by createdAt descending
        return [...allConversations].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    }

    function renderSidebar() {
        if (!conversationListElement) return;
        conversationListElement.innerHTML = ''; // Clear existing list
        const sortedConversations = [...allConversations].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        sortedConversations.forEach(conv => {
            const li = document.createElement('li');
            li.dataset.id = conv.id;
            li.title = `تاريخ الإنشاء: ${new Date(conv.createdAt).toLocaleString('ar')}`;
            if (conv.id === currentConversationId) {
                li.classList.add('active');
            }

            const titleSpan = document.createElement('span');
            titleSpan.classList.add('conv-title');
            titleSpan.textContent = conv.title || 'محادثة بدون عنوان';
            // Click on title switches conversation
            titleSpan.addEventListener('click', () => {
                if (conv.id !== currentConversationId) {
                    switchConversation(conv.id);
                }
            });

            const actionsDiv = document.createElement('div');
            actionsDiv.classList.add('conv-actions');

            const renameButton = document.createElement('button');
            renameButton.classList.add('rename-conv-button');
            renameButton.title = 'إعادة تسمية';
            renameButton.innerHTML = '<i class="fas fa-pen"></i>';
            renameButton.addEventListener('click', (e) => {
                e.stopPropagation();
                handleRenameConversation(conv.id);
            });

            const deleteButton = document.createElement('button');
            deleteButton.classList.add('delete-conv-button');
            deleteButton.title = 'حذف';
            deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteButton.addEventListener('click', (e) => {
                 e.stopPropagation();
                 handleDeleteConversationFromSidebar(conv.id, conv.title);
            });

            actionsDiv.appendChild(renameButton);
            actionsDiv.appendChild(deleteButton);

            li.appendChild(titleSpan);
            li.appendChild(actionsDiv);
            conversationListElement.appendChild(li);
        });
    }

    function switchConversation(newId, replaceState = false) {
         console.log(`Attempting to switch to chat ID: ${newId}`);
         const targetUrl = `chat.html?id=${newId}`;
         if (replaceState) {
             // Update URL without adding to history (useful for initial load/redirect)
             window.history.replaceState({ id: newId }, '', targetUrl);
             // Manually reload data for the new chat without full page refresh (SPA-like behavior)
             currentConversationId = newId;
             currentConversation = allConversations.find(c => c.id === currentConversationId);
             if (chatIdInput) chatIdInput.value = currentConversationId;
             if (currentConversation) {
                 loadCurrentConversationData();
                 renderSidebar(); // Re-render sidebar to update active state
                 console.log("Switched conversation state internally.");
             } else {
                 handleFatalError(`Failed to switch: Conversation data not found for ID ${newId}`);
             }
         } else {
             // Default behavior: navigate to the new URL, causing a page reload
             window.location.href = targetUrl;
         }
    }

    function startNewChat(replaceState = false) {
         const newConv = createNewConversationObject();
         allConversations.unshift(newConv); // Add to the beginning
         saveConversationsToStorage();
         console.log("New chat created:", newConv.id);
         // Switch to the newly created chat
         switchConversation(newConv.id, replaceState);
    }

     function createNewConversationObject() {
        const baseModel = modelSelect?.value || 'mistralai/mistral-7b-instruct-v0.2'; // Default model
        const newId = Date.now().toString() + Math.random().toString(16).slice(2);
        return {
            id: newId,
            title: `محادثة (${new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit'})})`,
            messages: [{ role: "assistant", content: "أهلاً بك! كيف أستطيع خدمتك؟" }],
            createdAt: new Date().toISOString(),
            settings: {
                model: baseModel,
                temperature: 0.7,
                max_tokens: 512
            }
        };
    }

    function handleRenameConversation(convId) {
        const conv = allConversations.find(c => c.id === convId);
        if (!conv) return;
        const currentTitle = conv.title || '';
        const newTitle = prompt("أدخل العنوان الجديد للمحادثة:", currentTitle);

        if (newTitle !== null && newTitle.trim() !== '' && newTitle.trim() !== currentTitle) {
            conv.title = newTitle.trim();
            if (conv.id === currentConversationId) {
                chatTitleElement.textContent = conv.title; // Update header immediately
                chatTitleElement.title = conv.title;
            }
            saveConversationsToStorage();
            renderSidebar(); // Update title in the list
            console.log(`Chat ${convId} renamed to "${conv.title}"`);
        }
    }

    function handleDeleteConversationFromSidebar(convId, convTitle) {
         const title = convTitle || 'هذه المحادثة';
         if (confirm(`هل أنت متأكد من حذف محادثة "${title}"؟ لا يمكن التراجع عن هذا الإجراء.`)) {
             // --- TODO: Call backend API to delete chat ---
             // fetch(`/api/chats/${convId}`, { method: 'DELETE' }).then(...)

             // --- Simulate deletion from local storage ---
             allConversations = allConversations.filter(conv => conv.id !== convId);
             saveConversationsToStorage();
             console.log(`Chat ${convId} removed locally.`);

             // If the deleted chat was the current one, switch to another or index
             if (convId === currentConversationId) {
                 const latestConv = getLatestConversation();
                 if (latestConv) {
                     switchConversation(latestConv.id, true); // Switch without history
                 } else {
                     // No chats left, go to index page
                     window.location.href = 'index.html';
                 }
             } else {
                 renderSidebar(); // Just update the sidebar if a different chat was deleted
             }
         }
     }

     function handleDeleteCurrentChatFromHeader() {
         if (!currentConversation) return;
          handleDeleteConversationFromSidebar(currentConversation.id, currentConversation.title);
     }


    // =====================================================================
    //                        تحميل وعرض بيانات المحادثة الحالية
    // =====================================================================
    function loadCurrentConversationData() {
        if (!currentConversation) {
            handleFatalError("لا توجد محادثة حالية لتحميلها.");
            return;
        }
        // Update Header
        chatTitleElement.textContent = currentConversation.title || 'محادثة بدون عنوان';
        chatTitleElement.title = currentConversation.title || 'محادثة بدون عنوان';

        // Update Settings UI
        loadConversationSettings(currentConversation.settings);

        // Render Messages
        renderChatMessages(currentConversation.messages);

        // Clear search and highlights
        if (searchInput) searchInput.value = '';
        clearSearchHighlights();
    }

    function loadConversationSettings(settings) {
         if (!settings) settings = {}; // Ensure settings object exists

         const currentModel = settings.model || 'mistralai/mistral-7b-instruct-v0.2';
         const currentTemp = settings.temperature ?? 0.7;
         const currentTokens = settings.max_tokens ?? 512;

         if (modelSelect) modelSelect.value = currentModel;
         if (currentModelDisplay) {
             const selectedOption = modelSelect?.options[modelSelect.selectedIndex];
             currentModelDisplay.textContent = selectedOption?.text || currentModel; // Display friendly name if available
             currentModelDisplay.title = currentModel; // Show full model ID on hover
         }
         if (temperatureInput) {
             temperatureInput.value = currentTemp;
             temperatureInput.title = currentTemp.toString(); // Update tooltip
         }
         if (temperatureValue) temperatureValue.textContent = currentTemp.toString();
         if (maxTokensInput) {
             maxTokensInput.value = currentTokens;
             maxTokensInput.title = currentTokens.toString();
         }
         console.log("Loaded settings into UI:", settings);
    }

    function saveCurrentConversationSettings() {
        if (!currentConversation) return;
        const newSettings = {
            model: modelSelect?.value || currentConversation.settings.model,
            temperature: parseFloat(temperatureInput?.value ?? currentConversation.settings.temperature),
            max_tokens: parseInt(maxTokensInput?.value ?? currentConversation.settings.max_tokens)
        };

        // Only save if settings actually changed
        if (JSON.stringify(currentConversation.settings) !== JSON.stringify(newSettings)) {
            currentConversation.settings = newSettings;
            saveConversationsToStorage();
            loadConversationSettings(newSettings); // Update display elements like model name span
            console.log("Saved new settings for current conversation:", newSettings);
        }
    }

    // =====================================================================
    //                        عرض ومعالجة الرسائل
    // =====================================================================

    function renderChatMessages(messages) {
        if (!chatBox) return;
        chatBox.innerHTML = ''; // Clear previous messages
        if (!messages || messages.length === 0) {
             // Display a placeholder if no messages exist (optional)
            const placeholder = document.createElement('div');
            placeholder.textContent = "ابدأ المحادثة بكتابة رسالة...";
            placeholder.style.textAlign = 'center';
            placeholder.style.padding = '30px';
            placeholder.style.opacity = '0.5';
            chatBox.appendChild(placeholder);
             return;
        }
        messages.forEach((msg, index) => addMessageToDOM(msg.role, msg.content, index, msg.id)); // Pass message ID if available
        scrollToBottom();
    }

    function addMessageToDOM(role, content, index, messageId = null) {
        if (!chatBox || !content) return; // Don't add empty messages

         // Remove placeholder if it exists
         const placeholder = chatBox.querySelector('div[style*="text-align: center"]');
         if (placeholder) placeholder.remove();

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', role === 'user' ? 'user-message' : 'bot-message');
        if (messageId) {
            messageDiv.dataset.messageId = messageId; // Store the message ID from backend/local
        }

        const iconDiv = document.createElement('div');
        iconDiv.classList.add('message-icon');
        const iconImg = document.createElement('img');
        // Ensure correct image paths - adjust if your structure is different
        iconImg.src = role === 'user' ? 'img/user-icon.svg' : 'img/bot-icon.svg';
        iconImg.alt = role;
        iconImg.onerror = function() { this.style.display='none'; } // Hide if image fails to load
        iconDiv.appendChild(iconImg);

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');

        // Render Markdown for bot messages
        if (role === 'assistant' && typeof marked === 'function') {
            try {
                 // IMPORTANT: Sanitize HTML output if markdown can come from untrusted sources
                 // Example using a hypothetical sanitizer:
                 // const dirtyHtml = marked.parse(content);
                 // contentDiv.innerHTML = sanitizeHtml(dirtyHtml);
                 contentDiv.innerHTML = marked.parse(content);
            } catch (e) {
                console.error("Markdown parsing error:", e);
                contentDiv.textContent = content; // Fallback to text content
            }
        } else {
            // Display user messages or fallback as plain text, preserving newlines
            contentDiv.innerHTML = content.replace(/\n/g, '<br>');
        }

        // Add action buttons
        if (role === 'assistant') {
            const actionsDiv = document.createElement('div');
            actionsDiv.classList.add('message-actions');
            actionsDiv.innerHTML = `
                <button class="action-button copy-button" title="نسخ"><i class="fas fa-copy"></i></button>
                <button class="action-button regenerate-button" title="إعادة توليد"><i class="fas fa-sync-alt"></i></button>
                <button class="action-button tts-button" title="تشغيل صوتي"><i class="fas fa-volume-up"></i></button>
            `;
            contentDiv.appendChild(actionsDiv); // Append actions inside content div
        } else if (role === 'user' && messageId) { // Add delete button for USER messages *if* they have an ID
            const deleteBtn = document.createElement('button');
            deleteBtn.classList.add('delete-msg-btn');
            deleteBtn.title = 'حذف الرسالة';
            deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
            contentDiv.appendChild(deleteBtn); // Append inside content div
        }

        messageDiv.appendChild(iconDiv); // Icon first
        messageDiv.appendChild(contentDiv); // Then content

        chatBox.appendChild(messageDiv);
    }

    function addMessageToConversationState(role, content, messageId = null) {
         if (!currentConversation) return;
         const newMessage = {
             id: messageId, // Will be null for newly sent messages until saved by backend
             role: role,
             content: content,
             timestamp: new Date().toISOString()
         };
         currentConversation.messages.push(newMessage);

         // Update title for the first user message
        if (role === 'user' && currentConversation.messages.filter(m => m.role === 'user').length === 1) {
             const newTitle = content.substring(0, 35) + (content.length > 35 ? "..." : "");
             handleRenameConversation(currentConversation.id, newTitle); // Use rename function to update state and UI
         }

         saveConversationsToStorage(); // Auto-save on new message
         return newMessage; // Return the added message object
    }


    // --- إرسال الرسائل والتفاعل مع API ---
    async function sendMessage() {
        if (!userInput || !currentConversation) return;
        const userText = userInput.value.trim();
        if (!userText) return;
         if (!apiKey) {
             alert("مفتاح OpenRouter API غير موجود. يرجى إضافته في الصفحة الرئيسية.");
             return;
         }

        // 1. Add user message to UI and State
        const userMsgObj = addMessageToConversationState('user', userText); // Get the added message object
        addMessageToDOM('user', userText, currentConversation.messages.length -1, userMsgObj.id); // Add to DOM
        userInput.value = '';
        adjustTextareaHeight();
        scrollToBottom();
        clearSearchHighlights();

        // 2. Show thinking indicator and disable input
        showThinkingIndicator();
        disableAllInputs(true);

        try {
            // 3. Prepare request for OpenRouter API
            // Limit history length to prevent overly large requests (e.g., last 20 messages)
            const historyLimit = 20;
            const messagesToSend = currentConversation.messages
                .slice(-historyLimit) // Take the last N messages
                .map(m => ({ role: m.role, content: m.content })); // Format for API

            // Optional: Add a system prompt if not present in recent history
            // if (!messagesToSend.some(m => m.role === 'system')) {
            //    messagesToSend.unshift({ role: 'system', content: 'You are a helpful assistant.' });
            //}

            const requestBody = {
                model: currentConversation.settings.model,
                messages: messagesToSend,
                temperature: currentConversation.settings.temperature,
                max_tokens: currentConversation.settings.max_tokens,
                // stream: false // Set to true for streaming responses
            };

            console.log("Sending to OpenRouter:", JSON.stringify(requestBody, null, 2));

            // 4. Make API call
            const response = await fetch(OPENROUTER_API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin, // Important for some free models
                    'X-Title': 'Chat DZ' // Optional
                },
                body: JSON.stringify(requestBody)
            });

            removeThinkingIndicator(); // Remove indicator once response starts coming

            // 5. Handle API Response
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})); // Try to parse error JSON
                const errorMessage = errorData?.error?.message || `خطأ API: ${response.status} ${response.statusText}`;
                 console.error("API Error Response:", errorData);
                throw new Error(errorMessage); // Throw error to be caught below
            }

            const data = await response.json();
            console.log("Received from OpenRouter:", data);
            const botReply = data.choices?.[0]?.message?.content?.trim();

            if (botReply) {
                // 6. Add bot message to UI and State
                const botMsgObj = addMessageToConversationState('assistant', botReply);
                addMessageToDOM('assistant', botReply, currentConversation.messages.length - 1, botMsgObj.id);
                scrollToBottom();

                // --- TODO: Call backend to save user & bot messages ---
                // await saveMessagesToBackend(userMsgObj, botMsgObj);
                // The backend should return the permanent IDs for the messages
                // Update userMsgObj.id and botMsgObj.id here if needed
                // Update the DOM elements data-message-id attribute as well

            } else {
                console.warn("No content found in bot reply:", data);
                // Add a fallback message to UI, but maybe not to state
                 addMessageToDOM('assistant', "(لم يتم استلام رد واضح)", currentConversation.messages.length);
            }

        } catch (error) {
            console.error('Error sending/receiving message:', error);
            removeThinkingIndicator(); // Ensure indicator is removed on error
             // Display error message in chat
            addMessageToDOM('assistant', `حدث خطأ: ${error.message}`, currentConversation.messages.length);
            scrollToBottom();
        } finally {
            disableAllInputs(false); // Re-enable input fields
            if (userInput) userInput.focus(); // Focus back on input
        }
    }

    // --- TODO: Function to save messages to backend ---
    // async function saveMessagesToBackend(userMsg, botMsg) {
    //    try {
    //        const response = await fetch(`/api/chats/${currentConversationId}/messages`, {
    //            method: 'POST',
    //            headers: { 'Content-Type': 'application/json', /* Add auth/CSRF if needed */ },
    //            body: JSON.stringify({ messages: [userMsg, botMsg] })
    //        });
    //        if (!response.ok) throw new Error('Failed to save messages');
    //        const savedData = await response.json();
    //        console.log("Messages saved to backend:", savedData);
    //        // Update message IDs in local state and DOM if backend returns them
    //        // e.g., updateMessageIdInStateAndDOM(userMsg.tempId, savedData.userMessageId);
    //        // e.g., updateMessageIdInStateAndDOM(botMsg.tempId, savedData.botMessageId);
    //    } catch (error) {
    //        console.error("Error saving messages to backend:", error);
    //        // Maybe notify user that saving failed
    //    }
    // }


    // =====================================================================
    //                        إجراءات على الرسائل (نسخ، توليد، صوت، حذف)
    // =====================================================================

    function handleMessageActions(event) {
        const button = event.target.closest('button'); // Get the button element
        if (!button) return; // Exit if the click wasn't on a button

        const messageDiv = button.closest('.message');
        if (!messageDiv) return; // Exit if not inside a message

        const messageId = messageDiv.dataset.messageId; // Get message ID (might be null/temp)
        const messageIndex = Array.from(chatBox.children).indexOf(messageDiv); // Get index for local array access

        // Find the message object in our state (important for content/regenerate)
         const messageData = (messageIndex >= 0 && messageIndex < currentConversation?.messages?.length)
            ? currentConversation.messages[messageIndex]
            : null;

         // Prefer content from state, fallback to DOM text content
         const messageContentElement = messageDiv.querySelector('.message-content');
         // Clone content to avoid modifying the original DOM temporarily
         const clonedContent = messageContentElement?.cloneNode(true);
         // Remove action buttons/delete buttons before getting text content
         clonedContent?.querySelectorAll('.message-actions, .delete-msg-btn')?.forEach(el => el.remove());
         const messageText = messageData?.content ?? clonedContent?.textContent?.trim() ?? '';


        // --- Handle different button actions ---
        if (button.classList.contains('copy-button')) {
            copyToClipboard(messageText);
        } else if (button.classList.contains('regenerate-button') && messageData) {
            regenerateResponse(messageIndex); // Pass index
        } else if (button.classList.contains('tts-button')) {
            speakText(messageText, button);
        } else if (button.classList.contains('delete-msg-btn') && messageData) {
             handleDeleteIndividualMessage(messageId, messageIndex, messageDiv);
        }
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast("تم نسخ النص بنجاح!");
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            showToast("فشل نسخ النص.", 'error');
        });
    }

    async function regenerateResponse(botMessageIndex) {
        if (!currentConversation || botMessageIndex < 1 || !apiKey) return; // Cannot regenerate first message or without key

        // Find the index of the user message *before* this bot message
        let userMessageIndex = -1;
        for (let i = botMessageIndex - 1; i >= 0; i--) {
            if (currentConversation.messages[i].role === 'user') {
                userMessageIndex = i;
                break;
            }
        }

        if (userMessageIndex === -1) {
            console.warn("Cannot regenerate: No preceding user message found.");
            showToast("لا يمكن إعادة التوليد بدون رسالة مستخدم سابقة.", 'warn');
            return;
        }

        console.log(`Regenerating response after user message index: ${userMessageIndex}`);

        // --- TODO: Call backend to delete the bot message(s) from this index onwards ---
        // Or handle locally if only using localStorage

        // Remove bot message(s) from state and UI (from botMessageIndex onwards)
        const messagesToRemoveCount = currentConversation.messages.length - botMessageIndex;
        currentConversation.messages.splice(botMessageIndex, messagesToRemoveCount);
        saveConversationsToStorage();
        renderChatMessages(currentConversation.messages); // Re-render chatbox without the old bot message(s)

        // Show thinking indicator and disable input
        showThinkingIndicator();
        disableAllInputs(true);

        try {
            // Prepare messages up to the *user* message for the API call
            const messagesToSend = currentConversation.messages
                .slice(0, userMessageIndex + 1) // Include messages up to the user message
                .map(m => ({ role: m.role, content: m.content }));

             // Optional: Add system prompt if needed
             // if (!messagesToSend.some(m => m.role === 'system')) {
             //    messagesToSend.unshift({ role: 'system', content: '...' });
             //}

            const requestBody = {
                model: currentConversation.settings.model,
                messages: messagesToSend,
                temperature: currentConversation.settings.temperature,
                max_tokens: currentConversation.settings.max_tokens,
            };

            console.log("Sending Regeneration Request:", JSON.stringify(requestBody, null, 2));

            // Make API call
            const response = await fetch(OPENROUTER_API_ENDPOINT, { /* ... headers ... */
                 method: 'POST',
                 headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': window.location.origin, 'X-Title': 'Chat DZ (Regen)' },
                 body: JSON.stringify(requestBody)
            });

            removeThinkingIndicator();

            // Handle response
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({}));
                 throw new Error(errorData?.error?.message || `خطأ API: ${response.status}`);
            }
            const data = await response.json();
            const botReply = data.choices?.[0]?.message?.content?.trim();

            if (botReply) {
                // Add regenerated message to state and UI
                const newBotMsgObj = addMessageToConversationState('assistant', botReply);
                addMessageToDOM('assistant', botReply, currentConversation.messages.length - 1, newBotMsgObj.id);
                scrollToBottom();
                // --- TODO: Save new bot message to backend ---
            } else {
                 console.warn("No content in regenerated reply:", data);
                 addMessageToDOM('assistant', "(فشل الحصول على رد جديد)", currentConversation.messages.length);
            }

        } catch (error) {
            console.error('Error regenerating response:', error);
            removeThinkingIndicator();
            addMessageToDOM('assistant', `خطأ في إعادة التوليد: ${error.message}`, currentConversation.messages.length);
            scrollToBottom();
        } finally {
            disableAllInputs(false);
        }
    }

    function speakText(text, button) {
        if (!('speechSynthesis' in window)) {
            showToast("المتصفح لا يدعم تحويل النص إلى كلام.", 'warn');
            return;
        }

        const ttsIcon = button.querySelector('i');

        if (synth.speaking) {
            // If speaking the same text, cancel it
            if (currentUtterance && currentUtterance.text === text) {
                synth.cancel();
                return; // Icon will reset in onend/onerror
            }
            // If speaking something else, cancel previous and start new
            synth.cancel();
        }

        // Basic text cleaning for better speech
        const plainText = text
            .replace(/```[\s\S]*?```/g, ' كود برمجي ') // Replace code blocks
            .replace(/`([^`]+)`/g, '$1') // Remove inline code backticks
            .replace(/(\*|_){1,2}(.*?)\1{1,2}/g, '$2') // Remove bold/italic markers
            .replace(/\[(.*?)\]\(.*?\)/g, '$1'); // Keep link text only

        currentUtterance = new SpeechSynthesisUtterance(plainText);
        currentUtterance.lang = document.documentElement.lang || 'ar-SA'; // Use page lang or Arabic

        currentUtterance.onstart = () => {
            if (ttsIcon) { ttsIcon.classList.remove('fa-volume-up'); ttsIcon.classList.add('fa-stop-circle'); }
            button.title = "إيقاف الصوت";
            console.log("TTS started");
        };

        const resetIcon = () => {
             if (ttsIcon) { ttsIcon.classList.remove('fa-stop-circle'); ttsIcon.classList.add('fa-volume-up'); }
             button.title = "تشغيل صوتي";
             currentUtterance = null;
        };

        currentUtterance.onend = () => {
             resetIcon();
             console.log("TTS finished");
        };

        currentUtterance.onerror = (event) => {
            console.error('Speech Synthesis Error:', event);
            showToast(`خطأ في تشغيل الصوت: ${event.error}`, 'error');
            resetIcon();
        };

        synth.speak(currentUtterance);
    }

     function handleDeleteIndividualMessage(messageId, messageIndex, messageElement) {
        if (!currentConversation) return;
        // Ensure we have a valid ID (not temporary or null) before calling backend
        if (!messageId || messageId.startsWith('temp_')) {
            showToast("لا يمكن حذف هذه الرسالة قبل حفظها.", 'warn');
            console.warn("Attempted to delete unsaved message.");
            return;
        }

         if (confirm('هل أنت متأكد أنك تريد حذف هذه الرسالة؟')) {
             console.log(`Requesting delete for message ID: ${messageId} in chat ${currentConversationId}`);

             // --- TODO: Call backend API to delete the message ---
             // fetch(`/api/chats/${currentConversationId}/messages/${messageId}`, { method: 'DELETE' })
             // .then(response => { if (!response.ok) throw new Error('...'); return response.json(); })
             // .then(data => { /* Handle success */ })
             // .catch(error => { /* Handle error */ });

             // --- Simulate successful deletion locally ---
             try {
                // Remove from UI
                messageElement.remove();
                // Remove from state array
                currentConversation.messages.splice(messageIndex, 1);
                saveConversationsToStorage(); // Save the change
                console.log(`Message ${messageId} removed locally.`);
                showToast("تم حذف الرسالة.");
             } catch (error) {
                 console.error("Error removing message locally:", error);
                 showToast("حدث خطأ أثناء إزالة الرسالة من الواجهة.", 'error');
                 // If backend call fails, you might want to re-add the message element or reload
             }
         }
     }


    // =====================================================================
    //                        البحث داخل المحادثة
    // =====================================================================

    function handleSearch() {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            const searchTerm = searchInput.value.trim().toLowerCase();
            clearSearchHighlights();
            if (searchTerm.length > 1) { // Only search for terms longer than 1 char
                highlightSearchResults(searchTerm);
            }
        }, DEBOUNCE_DELAY);
    }

    function clearSearchHighlights() {
         if (!chatBox) return;
         // More robust way: Remove spans and normalize text nodes
         chatBox.querySelectorAll('span.highlight').forEach(span => {
             const parent = span.parentNode;
             parent.replaceChild(document.createTextNode(span.textContent), span);
             parent.normalize(); // Merges adjacent text nodes
         });
    }

    function highlightSearchResults(term) {
        if (!chatBox || !term) return;
        const regex = new RegExp(`(${term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
        const walker = document.createTreeWalker(chatBox, NodeFilter.SHOW_TEXT, null, false);
        let node;
        const nodesToReplace = []; // Collect nodes to avoid modifying while iterating

        while(node = walker.nextNode()) {
            // Avoid highlighting inside scripts, styles, or already highlighted spans
            if (node.parentElement.tagName === 'SCRIPT' || node.parentElement.tagName === 'STYLE' || node.parentElement.classList.contains('highlight')) {
                continue;
            }
            if (node.nodeValue.toLowerCase().includes(term)) {
                nodesToReplace.push(node);
            }
        }

        nodesToReplace.forEach(textNode => {
            const parent = textNode.parentNode;
            if (!parent) return; // Skip if node is detached

            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            let match;

            while ((match = regex.exec(textNode.nodeValue)) !== null) {
                // Text before match
                if (match.index > lastIndex) {
                    fragment.appendChild(document.createTextNode(textNode.nodeValue.substring(lastIndex, match.index)));
                }
                // The highlighted match
                const span = document.createElement('span');
                span.classList.add('highlight');
                span.textContent = match[0]; // The matched text (preserving case)
                fragment.appendChild(span);
                lastIndex = regex.lastIndex;
            }
            // Text after the last match
            if (lastIndex < textNode.nodeValue.length) {
                fragment.appendChild(document.createTextNode(textNode.nodeValue.substring(lastIndex)));
            }

            // Replace the original text node with the fragment
            parent.replaceChild(fragment, textNode);
        });
    }

    // =====================================================================
    //                        تصدير المحادثة
    // =====================================================================

    function exportCurrentChat() {
        if (!currentConversation || !currentConversation.messages || currentConversation.messages.length === 0) {
            showToast("لا توجد رسائل لتصديرها.", 'warn');
            return;
        }

        let chatContent = `محادثة: ${currentConversation.title}\n`;
        chatContent += `المعرف: ${currentConversation.id}\n`;
        chatContent += `تاريخ الإنشاء: ${new Date(currentConversation.createdAt).toLocaleString('ar')}\n`;
        chatContent += `النموذج: ${currentConversation.settings?.model || 'غير محدد'}\n`;
        chatContent += `الحرارة: ${currentConversation.settings?.temperature ?? 'غير محدد'}\n`;
        chatContent += `أقصى توكنز: ${currentConversation.settings?.max_tokens ?? 'غير محدد'}\n`;
        chatContent += "========================================\n\n";

        currentConversation.messages.forEach(msg => {
            const prefix = msg.role === 'user' ? '👤 أنت' : '🤖 البوت';
            chatContent += `${prefix}:\n${msg.content}\n\n`;
            chatContent += "--------------------\n\n";
        });

        // Create TXT file
        const blob = new Blob([chatContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeTitle = (currentConversation.title || 'محادثة')
            .replace(/[^a-z0-9_\-ا-ي\s]/gi, '_') // Replace invalid chars
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .substring(0, 50); // Limit length
        a.download = `ChatDZ_${safeTitle}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log("Chat exported as TXT");
        showToast("تم تصدير المحادثة بنجاح.");
    }

    // =====================================================================
    //                        الوضع الليلي
    // =====================================================================

    function toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem(STORAGE_KEYS.darkMode, isDarkMode);
        updateDarkModeButton(isDarkMode);
        console.log("Dark Mode Toggled:", isDarkMode);
    }

    function loadDarkModePreference() {
        const savedPreference = localStorage.getItem(STORAGE_KEYS.darkMode);
        // Default to system preference if no setting saved
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const useDarkMode = savedPreference !== null ? savedPreference === 'true' : prefersDark;

        if (useDarkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        updateDarkModeButton(useDarkMode);
        console.log("Loaded Dark Mode Preference:", useDarkMode);
    }

    function updateDarkModeButton(isDarkMode) {
        if (!darkModeToggle) return;
        const icon = darkModeToggle.querySelector('i');
        if (isDarkMode) {
            darkModeToggle.title = 'الوضع النهاري';
            if (icon) { icon.classList.remove('fa-moon'); icon.classList.add('fa-sun'); }
        } else {
            darkModeToggle.title = 'الوضع الليلي';
            if (icon) { icon.classList.remove('fa-sun'); icon.classList.add('fa-moon'); }
        }
    }

    // =====================================================================
    //                        وظائف مساعدة (UI, Utilities)
    // =====================================================================

    function scrollToBottom() {
        if (chatBox) {
            // Use smooth scrolling for a nicer effect
            chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
        }
    }

    function adjustTextareaHeight() {
        if (!userInput) return;
        userInput.style.height = 'auto'; // Reset height
        const scrollHeight = userInput.scrollHeight;
        const maxHeight = 120; // Maximum height in pixels (must match CSS max-height)
        // Set height based on content, but not exceeding max height
        userInput.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
        // Show scrollbar only if content exceeds max height
        userInput.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    }

    function showToast(message, type = 'success') {
        // Simple console log for now, replace with a proper toast notification library/implementation
        console.log(`[Toast - ${type}]: ${message}`);
        // Example: Create a temporary div and append it
        const toastDiv = document.createElement('div');
        toastDiv.className = `toast toast-${type}`; // Add classes for styling
        toastDiv.textContent = message;
        document.body.appendChild(toastDiv);
        // Basic styling (add this to your CSS)
        /*
        .toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background-color: #333; color: white; padding: 10px 20px; border-radius: 5px; z-index: 1000; opacity: 0; transition: opacity 0.5s ease; font-size: 0.9em; }
        .toast-success { background-color: #28a745; }
        .toast-error { background-color: #dc3545; }
        .toast-warn { background-color: #ffc107; color: #333; }
        .toast.show { opacity: 1; }
        */
        toastDiv.classList.add('show');
        setTimeout(() => {
            toastDiv.classList.remove('show');
            setTimeout(() => toastDiv.remove(), 500); // Remove from DOM after fade out
        }, 3000); // Hide after 3 seconds
    }

    // =====================================================================
    //                        إعداد مستمعي الأحداث
    // =====================================================================
    function setupAllEventListeners() {
        // Sidebar Buttons
        if (newChatButtonSidebar) newChatButtonSidebar.addEventListener('click', () => startNewChat(false)); // Start new and navigate normally
        if (darkModeToggle) darkModeToggle.addEventListener('click', toggleDarkMode);

        // Header Buttons
        if (exportChatButton) exportChatButton.addEventListener('click', exportCurrentChat);
        if (deleteChatButton) deleteChatButton.addEventListener('click', handleDeleteCurrentChatFromHeader);

        // Settings Area
        if (modelSelect) modelSelect.addEventListener('change', saveCurrentConversationSettings);
        if (temperatureInput) {
            temperatureInput.addEventListener('input', () => { // Update display while sliding
                if (temperatureValue) temperatureValue.textContent = temperatureInput.value;
                temperatureInput.title = temperatureInput.value; // Update tooltip
            });
            temperatureInput.addEventListener('change', saveCurrentConversationSettings); // Save final value
        }
        if (maxTokensInput) maxTokensInput.addEventListener('change', saveCurrentConversationSettings);
        if (searchInput) searchInput.addEventListener('input', handleSearch);

        // Chat Input Area
        if (sendButton) sendButton.addEventListener('click', sendMessage);
        if (userInput) {
            userInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
            userInput.addEventListener('input', adjustTextareaHeight);
        }

        // Message Actions (Event Delegation on ChatBox)
        if (chatBox) chatBox.addEventListener('click', handleMessageActions);

        // Optional: Handle browser back/forward navigation for chat switching
        window.addEventListener('popstate', (event) => {
             if (event.state && event.state.id) {
                 console.log("Popstate detected, switching to chat:", event.state.id);
                 // Switch conversation state internally without full reload
                 switchConversation(event.state.id, true);
             } else {
                 // Handle case where state is null (e.g., navigating back to index)
                 // Maybe check current URL and decide if reload or redirect is needed
                 console.log("Popstate with no state ID, possibly navigating away.");
             }
        });

        console.log("Event listeners set up.");
    }

}); // End DOMContentLoaded
