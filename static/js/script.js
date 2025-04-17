// script.js (for index.html)

document.addEventListener('DOMContentLoaded', () => {
    const conversationListElement = document.getElementById('conversation-list-index');
    const noConversationsMessage = document.getElementById('no-conversations-message');
    const startNewChatButton = document.getElementById('start-new-chat-button');
    const modelSelectIndex = document.getElementById('model-select-index');
    const apiKeyInput = document.getElementById('api-key-index');
    const toggleApiKeyButton = document.getElementById('toggle-api-key-index');

    const STORAGE_KEYS = {
        apiKey: 'chatdz_apiKey',
        conversations: 'chatdz_conversations'
    };

    // --- تحميل وعرض المحادثات ---
    let conversations = loadConversationsFromStorage();
    renderConversationList();

    // --- تحميل وإدارة مفتاح API ---
    loadAndManageApiKey();

    // --- مستمعو الأحداث ---
    if (startNewChatButton) {
        startNewChatButton.addEventListener('click', handleStartNewChat);
    }

    // مستمع لحذف المحادثات (Event Delegation)
    if (conversationListElement) {
        conversationListElement.addEventListener('click', function(event) {
            const deleteButton = event.target.closest('.delete-list-item-btn');
            if (deleteButton) {
                event.preventDefault(); // منع أي سلوك افتراضي
                event.stopPropagation();
                const chatItem = deleteButton.closest('.chat-item');
                const chatIdToDelete = chatItem?.dataset.chatId;
                if (chatIdToDelete) {
                    handleDeleteConversation(chatIdToDelete, chatItem?.querySelector('.chat-title')?.textContent);
                }
            }
        });
    }

    // --- وظائف ---

    function loadConversationsFromStorage() {
        const saved = localStorage.getItem(STORAGE_KEYS.conversations);
        try {
            // تأكد من أن كل محادثة لديها الحقول الأساسية
            const parsed = saved ? JSON.parse(saved) : [];
            return parsed.map(conv => ({
                id: conv.id || Date.now().toString(), // إضافة ID إذا كان مفقودًا
                title: conv.title || "محادثة بدون عنوان",
                createdAt: conv.createdAt || new Date().toISOString(),
                messages: Array.isArray(conv.messages) ? conv.messages : [],
                settings: typeof conv.settings === 'object' ? conv.settings : {}
            }));
        } catch (e) {
            console.error("Failed to parse conversations:", e);
            localStorage.removeItem(STORAGE_KEYS.conversations); // إزالة البيانات التالفة
            return [];
        }
    }

    function saveConversationsToStorage() {
        try {
            localStorage.setItem(STORAGE_KEYS.conversations, JSON.stringify(conversations));
        } catch (e) {
            console.error("Failed to save conversations:", e);
            // Consider notifying the user if storage is full
        }
    }

    function renderConversationList() {
        if (!conversationListElement) return;
        conversationListElement.innerHTML = ''; // مسح القائمة
        if (conversations.length === 0) {
            if (noConversationsMessage) noConversationsMessage.style.display = 'block';
            return;
        }
        if (noConversationsMessage) noConversationsMessage.style.display = 'none';

        // فرز المحادثات (الأحدث أولاً)
        const sortedConversations = [...conversations].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        sortedConversations.forEach(conv => {
            const chatItemDiv = document.createElement('div');
            chatItemDiv.classList.add('chat-item');
            chatItemDiv.dataset.chatId = conv.id;

            const link = document.createElement('a');
            link.href = `chat.html?id=${conv.id}`;
            link.classList.add('chat-link');
            const titleText = conv.title || 'محادثة بدون عنوان';
            link.title = `فتح محادثة: ${titleText}\nتاريخ الإنشاء: ${new Date(conv.createdAt).toLocaleString('ar')}`;

            const titleSpan = document.createElement('span');
            titleSpan.classList.add('chat-title');
            titleSpan.textContent = titleText;

            const dateSpan = document.createElement('span');
            dateSpan.classList.add('chat-date');
            const dateIcon = document.createElement('i');
            dateIcon.className = 'far fa-clock';
            dateSpan.appendChild(dateIcon);
            dateSpan.appendChild(document.createTextNode(` ${new Date(conv.createdAt).toLocaleDateString('ar-EG-u-nu-latn')}`)); // تنسيق عربي بسيط للأرقام الغربية

            link.appendChild(titleSpan);
            link.appendChild(dateSpan);

            const deleteButton = document.createElement('button');
            deleteButton.classList.add('delete-list-item-btn');
            deleteButton.title = 'حذف هذه المحادثة';
            deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
            // Note: Event listener is delegated to the parent list

            chatItemDiv.appendChild(link);
            chatItemDiv.appendChild(deleteButton);
            conversationListElement.appendChild(chatItemDiv);
        });
    }

    function handleDeleteConversation(chatId, chatTitle) {
        const title = chatTitle || 'هذه المحادثة';
        if (confirm(`هل أنت متأكد من رغبتك في حذف محادثة "${title}"؟ سيتم حذف جميع رسائلها بشكل دائم.`)) {
            // --- هنا يجب استدعاء الخادم لحذف المحادثة فعليًا ---
            // fetch(`/api/chats/${chatId}`, { method: 'DELETE' }).then(...)

            // كمثال، سنحذفها من localStorage فقط
            conversations = conversations.filter(conv => conv.id !== chatId);
            saveConversationsToStorage();
            renderConversationList(); // إعادة رسم القائمة
            console.log(`Conversation ${chatId} removed from local list.`);
            // يمكنك إضافة إشعار بالنجاح
        }
    }

    function handleStartNewChat() {
        const apiKey = localStorage.getItem(STORAGE_KEYS.apiKey);
        if (!apiKey) {
            alert("الرجاء إدخال وحفظ مفتاح OpenRouter API أولاً في قسم الإعدادات!");
            if (apiKeyInput) apiKeyInput.focus();
            return;
        }

        const selectedModel = modelSelectIndex.value;
        const newConv = createNewConversationObject(selectedModel);

        conversations.unshift(newConv); // إضافة المحادثة الجديدة في بداية القائمة
        saveConversationsToStorage();

        // الانتقال إلى صفحة المحادثة الجديدة
        window.location.href = `chat.html?id=${newConv.id}`;
    }

     function createNewConversationObject(initialModel) {
        const newId = Date.now().toString();
        return {
            id: newId,
            title: `محادثة جديدة (${new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit'})})`,
            // إضافة رسالة ترحيب أولية من البوت
            messages: [{ role: "assistant", content: "مرحباً بك في Chat DZ! كيف يمكنني مساعدتك اليوم؟" }],
            createdAt: new Date().toISOString(),
            settings: { // الإعدادات الأولية
                model: initialModel || 'mistralai/mistral-7b-instruct-v0.2',
                temperature: 0.7,
                max_tokens: 512
            }
        };
    }

    function loadAndManageApiKey() {
        if (!apiKeyInput || !toggleApiKeyButton) return;

        // تحميل المفتاح المحفوظ
        const savedKey = localStorage.getItem(STORAGE_KEYS.apiKey);
        if (savedKey) {
            apiKeyInput.value = savedKey;
        }

        // حفظ المفتاح عند التغيير
        apiKeyInput.addEventListener('change', () => {
            const apiKey = apiKeyInput.value.trim();
            if (apiKey) {
                localStorage.setItem(STORAGE_KEYS.apiKey, apiKey);
                console.log("API Key saved.");
            } else {
                 localStorage.removeItem(STORAGE_KEYS.apiKey);
                 console.log("API Key removed.");
            }
        });

        // تبديل رؤية المفتاح
        toggleApiKeyButton.addEventListener('click', function() {
            const fieldType = apiKeyInput.getAttribute('type');
            const icon = this.querySelector('i');

            if (fieldType === 'password') {
                apiKeyInput.setAttribute('type', 'text');
                if (icon) { icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash'); }
            } else {
                apiKeyInput.setAttribute('type', 'password');
                if (icon) { icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye'); }
            }
        });
    }

}); // نهاية DOMContentLoaded
