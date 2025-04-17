// script.js (for index.html - Updated)

document.addEventListener('DOMContentLoaded', () => {
    const conversationListElement = document.getElementById('conversation-list-index');
    const noConversationsMessage = document.getElementById('no-conversations-message');
    const startNewChatButton = document.getElementById('start-new-chat-button');
    const modelSelectIndex = document.getElementById('model-select-index');
    // API Key input and related elements are REMOVED

    const STORAGE_KEYS = {
        // No longer storing API key here
        conversations: 'chatdz_conversations'
    };

    // --- تحميل وعرض المحادثات ---
    let conversations = loadConversationsFromStorage();
    renderConversationList();

    // --- مستمعو الأحداث ---
    if (startNewChatButton) {
        startNewChatButton.addEventListener('click', handleStartNewChat);
    } else {
        console.error("Start New Chat Button not found!");
    }

    // مستمع لحذف المحادثات (Event Delegation)
    if (conversationListElement) {
        conversationListElement.addEventListener('click', function(event) {
            const deleteButton = event.target.closest('.delete-list-item-btn');
            if (deleteButton) {
                event.preventDefault();
                event.stopPropagation();
                const chatItem = deleteButton.closest('.chat-item');
                const chatIdToDelete = chatItem?.dataset.chatId;
                if (chatIdToDelete) {
                    handleDeleteConversation(chatIdToDelete, chatItem?.querySelector('.chat-title')?.textContent);
                } else {
                    console.error("Could not determine chat ID for deletion.");
                }
            }
        });
    } else {
         console.error("Conversation list container not found!");
    }

    // --- وظائف ---

    function loadConversationsFromStorage() {
        const saved = localStorage.getItem(STORAGE_KEYS.conversations);
        try {
            const parsed = saved ? JSON.parse(saved) : [];
            return parsed.map(conv => ({
                id: conv.id || Date.now().toString() + Math.random().toString(16).slice(2),
                title: conv.title || "محادثة بدون عنوان",
                createdAt: conv.createdAt || new Date().toISOString(),
                messages: Array.isArray(conv.messages) ? conv.messages : [],
                settings: typeof conv.settings === 'object' ? conv.settings : {}
            })).filter(c => c.id);
        } catch (e) {
            console.error("Failed to parse conversations:", e);
            localStorage.removeItem(STORAGE_KEYS.conversations);
            return [];
        }
    }

    function saveConversationsToStorage() {
        try {
            localStorage.setItem(STORAGE_KEYS.conversations, JSON.stringify(conversations));
        } catch (e) {
            console.error("Failed to save conversations:", e);
        }
    }

    function renderConversationList() {
        if (!conversationListElement) return;
        conversationListElement.innerHTML = '';
        if (conversations.length === 0) {
            if (noConversationsMessage) noConversationsMessage.style.display = 'block';
            return;
        }
        if (noConversationsMessage) noConversationsMessage.style.display = 'none';

        const sortedConversations = [...conversations].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        sortedConversations.forEach(conv => {
            const chatItemDiv = document.createElement('div');
            chatItemDiv.classList.add('chat-item');
            chatItemDiv.dataset.chatId = conv.id;

            const link = document.createElement('a');
            const chatUrl = `chat.html?id=${conv.id}`; // Construct the URL
            link.href = chatUrl; // Set the href attribute
            link.classList.add('chat-link');
            const titleText = conv.title || 'محادثة بدون عنوان';
            link.title = `فتح محادثة: ${titleText}\nتاريخ الإنشاء: ${new Date(conv.createdAt).toLocaleString('ar')}`;

            console.log(`Creating link for chat ${conv.id}: ${chatUrl}`); // Debugging log

            const titleSpan = document.createElement('span');
            titleSpan.classList.add('chat-title');
            titleSpan.textContent = titleText;

            const dateSpan = document.createElement('span');
            dateSpan.classList.add('chat-date');
            const dateIcon = document.createElement('i');
            dateIcon.className = 'far fa-clock';
            dateSpan.appendChild(dateIcon);
            dateSpan.appendChild(document.createTextNode(` ${new Date(conv.createdAt).toLocaleDateString('ar-EG-u-nu-latn')}`));

            link.appendChild(titleSpan);
            link.appendChild(dateSpan);

            const deleteButton = document.createElement('button');
            deleteButton.classList.add('delete-list-item-btn');
            deleteButton.title = 'حذف هذه المحادثة';
            deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';

            chatItemDiv.appendChild(link);
            chatItemDiv.appendChild(deleteButton);
            conversationListElement.appendChild(chatItemDiv);
        });
    }

    function handleDeleteConversation(chatId, chatTitle) {
        const title = chatTitle || 'هذه المحادثة';
        if (confirm(`هل أنت متأكد من رغبتك في حذف محادثة "${title}"؟`)) {
            // --- TODO: Call Backend API to delete the chat ---
            console.log(`Simulating delete request for chat ID: ${chatId}`);

            conversations = conversations.filter(conv => conv.id !== chatId);
            saveConversationsToStorage();
            renderConversationList();
            console.log(`Chat ${chatId} removed from local list.`);
        }
    }

    function handleStartNewChat() {
        console.log("Attempting to start a new chat...");
        const selectedModel = modelSelectIndex.value;
        const newConv = createNewConversationObject(selectedModel);

        conversations.unshift(newConv);
        saveConversationsToStorage();

        const targetUrl = `chat.html?id=${newConv.id}`;
        console.log(`New chat created (ID: ${newConv.id}). Redirecting to: ${targetUrl}`);

        // Redirect to the new chat page
        window.location.href = targetUrl;
    }

     function createNewConversationObject(initialModel) {
        const newId = Date.now().toString() + Math.random().toString(16).slice(2);
        return {
            id: newId,
            title: `محادثة جديدة (${new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit'})})`,
            messages: [{ role: "assistant", content: "مرحباً بك في Chat DZ! كيف يمكنني مساعدتك اليوم؟" }],
            createdAt: new Date().toISOString(),
            settings: {
                model: initialModel || 'mistralai/mistral-7b-instruct-v0.2',
                temperature: 0.7,
                max_tokens: 512
            }
        };
    }

    // API Key Management is REMOVED from this file.

}); // نهاية DOMContentLoaded
