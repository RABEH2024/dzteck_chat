// chat.js (for chat.html - Updated)

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
    const chatIdInput = document.getElementById('chat-id');

    // --- ثوابت وإعدادات ---
    // *** هذا هو التغيير الرئيسي: أشر إلى نقطة نهاية الخادم الخلفي لديك ***
    const BACKEND_API_ENDPOINT = '/api/chat'; // <--- عدّل هذا المسار ليتوافق مع خادم Render لديك
    // const OPENROUTER_API_ENDPOINT is REMOVED

    const STORAGE_KEYS = {
        // No API Key here
        conversations: 'chatdz_conversations',
        darkMode: 'chatdz_darkMode'
    };
    const DEBOUNCE_DELAY = 300;

    // --- حالة التطبيق ---
    // let apiKey = ''; // REMOVED
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
        // API Key check is REMOVED from frontend

        loadDarkModePreference();
        allConversations = loadConversationsFromStorage();

        const urlParams = new URLSearchParams(window.location.search);
        const requestedId = urlParams.get('id');

        // --- (نفس منطق التحقق من ID والمحادثة والانتقال كما في الرد السابق) ---
         if (!requestedId || !allConversations.some(c => c.id === requestedId)) {
            console.warn(`Chat ID "${requestedId}" not found or invalid.`);
            const latestConv = getLatestConversation();
            if (latestConv) {
                console.log("Redirecting to latest conversation:", latestConv.id);
                switchConversation(latestConv.id, true);
            } else {
                console.log("No existing chats found, starting a new one.");
                startNewChat(true);
            }
            return;
        }

        currentConversationId = requestedId;
        currentConversation = allConversations.find(c => c.id === currentConversationId);
        if (chatIdInput) chatIdInput.value = currentConversationId;

        if (!currentConversation) {
            handleFatalError(`خطأ فادح: لم يتم العثور على بيانات المحادثة لـ ID: ${currentConversationId}`);
            return;
        }
        // --- نهاية منطق التحقق ---

        console.log(`Chat loaded: ${currentConversation.title} (ID: ${currentConversationId})`);
        loadCurrentConversationData();
        renderSidebar();
        setupAllEventListeners();
        adjustTextareaHeight();
        scrollToBottom();
        console.log("Chat Application Initialized Successfully.");
    }

    // --- (باقي الدوال مثل handleFatalError, disableAllInputs كما هي) ---
    function handleFatalError(message) { /* ... */ }
    function disableAllInputs(disabled) { /* ... */ }


    // =====================================================================
    //                        إدارة المحادثات (بيانات + واجهة جانبية)
    // =====================================================================
    // --- (الدوال loadConversationsFromStorage, saveConversationsToStorage, getLatestConversation, renderSidebar, switchConversation, startNewChat, createNewConversationObject, handleRenameConversation, handleDeleteConversationFromSidebar, handleDeleteCurrentChatFromHeader كما هي في الرد السابق) ---
    function loadConversationsFromStorage() { /* ... */ }
    function saveConversationsToStorage() { /* ... */ }
    function getLatestConversation() { /* ... */ }
    function renderSidebar() { /* ... */ }
    function switchConversation(newId, replaceState = false) { /* ... */ }
    function startNewChat(replaceState = false) { /* ... */ }
    function createNewConversationObject() { /* ... */ }
    function handleRenameConversation(convId, newTitle = null) { // تعديل لاستقبال عنوان اختياري
        const conv = allConversations.find(c => c.id === convId);
        if (!conv) return;
        let finalNewTitle = newTitle; // استخدام العنوان الممرر إن وجد

        if (finalNewTitle === null) { // إذا لم يتم تمرير عنوان، اطلب من المستخدم
            const currentTitle = conv.title || '';
            finalNewTitle = prompt("أدخل العنوان الجديد للمحادثة:", currentTitle);
        }

        if (finalNewTitle !== null && finalNewTitle.trim() !== '' && finalNewTitle.trim() !== conv.title) {
            conv.title = finalNewTitle.trim();
            if (conv.id === currentConversationId) {
                chatTitleElement.textContent = conv.title;
                chatTitleElement.title = conv.title;
            }
            saveConversationsToStorage();
            renderSidebar();
            console.log(`Chat ${convId} renamed to "${conv.title}"`);
        }
     }
    function handleDeleteConversationFromSidebar(convId, convTitle) { /* ... */ }
    function handleDeleteCurrentChatFromHeader() { /* ... */ }


    // =====================================================================
    //                        تحميل وعرض بيانات المحادثة الحالية
    // =====================================================================
    // --- (الدوال loadCurrentConversationData, loadConversationSettings, saveCurrentConversationSettings كما هي في الرد السابق) ---
     function loadCurrentConversationData() {
         if (!currentConversation) { /*...*/ return; }
         chatTitleElement.textContent = currentConversation.title || '...';
         chatTitleElement.title = currentConversation.title || '...';
         loadConversationSettings(currentConversation.settings);
         renderChatMessages(currentConversation.messages);
         if (searchInput) searchInput.value = '';
         clearSearchHighlights();
     }
     function loadConversationSettings(settings) { /* ... */ }
     function saveCurrentConversationSettings() { /* ... */ }

    // =====================================================================
    //                        عرض ومعالجة الرسائل
    // =====================================================================
    // --- (الدوال renderChatMessages, addMessageToDOM, addMessageToConversationState كما هي في الرد السابق) ---
     function renderChatMessages(messages) { /* ... */ }
     function addMessageToDOM(role, content, index, messageId = null) { /* ... */ }
     function addMessageToConversationState(role, content, messageId = null) { /* ... */ }

    // =====================================================================
    //                        إرسال الرسائل والتفاعل مع API (التعديل الرئيسي هنا)
    // =====================================================================
    async function sendMessage() {
        if (!userInput || !currentConversation) return;
        const userText = userInput.value.trim();
        if (!userText) return;
        // API Key check is REMOVED from frontend

        const userMsgObj = addMessageToConversationState('user', userText);
        addMessageToDOM('user', userText, currentConversation.messages.length -1, userMsgObj.id);
        userInput.value = '';
        adjustTextareaHeight();
        scrollToBottom();
        clearSearchHighlights();

        showThinkingIndicator();
        disableAllInputs(true);

        try {
            const historyLimit = 20;
            const messagesToSend = currentConversation.messages
                .slice(-historyLimit)
                .map(m => ({ role: m.role, content: m.content }));

            // *** التغيير هنا: تجهيز الطلب للخادم الخلفي ***
            const requestBody = {
                chatId: currentConversationId, // أرسل ID المحادثة
                settings: currentConversation.settings, // أرسل الإعدادات
                messages: messagesToSend // أرسل سجل الرسائل المطلوب
            };

            console.log("Sending request to Backend API:", BACKEND_API_ENDPOINT, JSON.stringify(requestBody, null, 2));

            // *** التغيير هنا: استدعاء الخادم الخلفي بدلاً من OpenRouter مباشرة ***
            const response = await fetch(BACKEND_API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // أضف أي Headers أخرى يحتاجها الخادم الخلفي (مثل التوثيق CSRF/JWT)
                    // 'Authorization': `Bearer ${userAuthToken}` // مثال
                },
                body: JSON.stringify(requestBody)
            });

            removeThinkingIndicator();

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                // حاول الحصول على رسالة الخطأ من الخادم الخلفي
                const errorMessage = errorData?.error || errorData?.message || `خطأ من الخادم: ${response.status} ${response.statusText}`;
                 console.error("Backend API Error Response:", errorData);
                throw new Error(errorMessage);
            }

            // افترض أن الخادم الخلفي يعيد استجابة مشابهة لـ OpenRouter
            const data = await response.json();
            console.log("Received from Backend API:", data);
            // *** تأكد من أن بنية الرد من الخادم الخلفي متوافقة مع هذا ***
            const botReply = data.choices?.[0]?.message?.content?.trim() || data.reply; // كن مرنًا في قراءة الرد

            if (botReply) {
                 const botMsgObj = addMessageToConversationState('assistant', botReply);
                 // افترض أن الخادم يعيد IDs في الرد
                 // const userMsgServerId = data.userMessageId;
                 // const botMsgServerId = data.botMessageId;
                 // updateMessageIdInStateAndDOM(userMsgObj.id, userMsgServerId);
                 // updateMessageIdInStateAndDOM(null, botMsgServerId, botMsgObj); // طريقة أخرى للتحديث

                 addMessageToDOM('assistant', botReply, currentConversation.messages.length - 1, botMsgObj.id /* أو botMsgServerId */);
                 scrollToBottom();
            } else {
                console.warn("No valid reply content found in backend response:", data);
                addMessageToDOM('assistant', "(لم يتم استلام رد واضح من الخادم)", currentConversation.messages.length);
            }

        } catch (error) {
            console.error('Error sending message via backend:', error);
            removeThinkingIndicator();
            addMessageToDOM('assistant', `حدث خطأ: ${error.message}`, currentConversation.messages.length);
            scrollToBottom();
        } finally {
            disableAllInputs(false);
            if (userInput) userInput.focus();
        }
    }

    // =====================================================================
    //                        إجراءات على الرسائل (تعديل إعادة التوليد)
    // =====================================================================
    // --- (الدوال handleMessageActions, copyToClipboard, speakText, handleDeleteIndividualMessage كما هي في الرد السابق) ---
     function handleMessageActions(event) { /* ... */ }
     function copyToClipboard(text) { /* ... */ }
     function speakText(text, button) { /* ... */ }
     function handleDeleteIndividualMessage(messageId, messageIndex, messageElement) { /* ... */ }


    // --- تعديل دالة إعادة التوليد لتعمل عبر الخادم الخلفي ---
    async function regenerateResponse(botMessageIndex) {
        if (!currentConversation || botMessageIndex < 1) return; // لا يمكن إعادة توليد أول رسالة

        let userMessageIndex = -1;
        for (let i = botMessageIndex - 1; i >= 0; i--) {
            if (currentConversation.messages[i].role === 'user') {
                userMessageIndex = i;
                break;
            }
        }
        if (userMessageIndex === -1) {
            console.warn("Cannot regenerate: No preceding user message.");
            showToast("لا يمكن إعادة التوليد.", 'warn');
            return;
        }

        // --- TODO: Call backend to delete messages from botMessageIndex onwards ---

        // --- Simulate local removal ---
        const messagesToRemoveCount = currentConversation.messages.length - botMessageIndex;
        currentConversation.messages.splice(botMessageIndex, messagesToRemoveCount);
        saveConversationsToStorage();
        renderChatMessages(currentConversation.messages);

        showThinkingIndicator();
        disableAllInputs(true);

        try {
            // Prepare messages up to the user message
            const messagesToSend = currentConversation.messages
                .slice(0, userMessageIndex + 1)
                .map(m => ({ role: m.role, content: m.content }));

            // *** التغيير هنا: تجهيز الطلب للخادم الخلفي ***
            const requestBody = {
                chatId: currentConversationId,
                settings: currentConversation.settings,
                messages: messagesToSend,
                regenerate: true // أضف علامة لإعلام الخادم بأن هذا طلب إعادة توليد
            };

            console.log("Sending Regeneration Request to Backend:", BACKEND_API_ENDPOINT, JSON.stringify(requestBody, null, 2));

            // *** التغيير هنا: استدعاء الخادم الخلفي ***
            const response = await fetch(BACKEND_API_ENDPOINT, { // استخدم نفس نقطة النهاية أو واحدة مخصصة
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json', /* Auth headers? */ },
                 body: JSON.stringify(requestBody)
            });

            removeThinkingIndicator();

            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({}));
                 throw new Error(errorData?.error || errorData?.message || `خطأ من الخادم: ${response.status}`);
            }

            const data = await response.json();
            console.log("Received Regenerated Response from Backend:", data);
             const botReply = data.choices?.[0]?.message?.content?.trim() || data.reply;

            if (botReply) {
                 const botMsgObj = addMessageToConversationState('assistant', botReply);
                 // const botMsgServerId = data.botMessageId; // Get ID if backend returns it
                 addMessageToDOM('assistant', botReply, currentConversation.messages.length - 1, botMsgObj.id /* or botMsgServerId */);
                 scrollToBottom();
                 // --- TODO: Call backend to save the new bot message ---
            } else {
                 console.warn("No content in regenerated reply from backend:", data);
                 addMessageToDOM('assistant', "(فشل الحصول على رد جديد)", currentConversation.messages.length);
            }

        } catch (error) {
            console.error('Error regenerating response via backend:', error);
            removeThinkingIndicator();
            addMessageToDOM('assistant', `خطأ في إعادة التوليد: ${error.message}`, currentConversation.messages.length);
            scrollToBottom();
        } finally {
            disableAllInputs(false);
        }
    }


    // =====================================================================
    //                        البحث داخل المحادثة
    // =====================================================================
    // --- (الدوال handleSearch, clearSearchHighlights, highlightSearchResults كما هي في الرد السابق) ---
     function handleSearch() { /* ... */ }
     function clearSearchHighlights() { /* ... */ }
     function highlightSearchResults(term) { /* ... */ }

    // =====================================================================
    //                        تصدير المحادثة
    // =====================================================================
    // --- (الدالة exportCurrentChat كما هي في الرد السابق) ---
    function exportCurrentChat() { /* ... */ }

    // =====================================================================
    //                        الوضع الليلي
    // =====================================================================
    // --- (الدوال toggleDarkMode, loadDarkModePreference, updateDarkModeButton كما هي في الرد السابق) ---
     function toggleDarkMode() { /* ... */ }
     function loadDarkModePreference() { /* ... */ }
     function updateDarkModeButton(isDarkMode) { /* ... */ }

    // =====================================================================
    //                        وظائف مساعدة (UI, Utilities)
    // =====================================================================
    // --- (الدوال scrollToBottom, adjustTextareaHeight, showToast كما هي في الرد السابق) ---
     function scrollToBottom() { /* ... */ }
     function adjustTextareaHeight() { /* ... */ }
     function showToast(message, type = 'success') { /* ... */ }

    // =====================================================================
    //                        إعداد مستمعي الأحداث
    // =====================================================================
    // --- (الدالة setupAllEventListeners كما هي في الرد السابق) ---
     function setupAllEventListeners() { /* ... */ }

}); // End DOMContentLoaded
