document.addEventListener('DOMContentLoaded', () => {
    const conversationListElement = document.getElementById('conversation-list-index');
    const noConversationsMessage = document.getElementById('no-conversations-message');
    const startNewChatButton = document.getElementById('start-new-chat-button');
    const modelSelectIndex = document.getElementById('model-select-index');
    const apiKeyInput = document.getElementById('api-key-index');

    // --- تحميل مفتاح API ---
    loadApiKey();

    // --- تحميل وعرض المحادثات ---
    let conversations = loadConversationsFromStorage();
    renderConversationList();

    // --- مستمعو الأحداث ---
    startNewChatButton.addEventListener('click', startNewChat);
    apiKeyInput.addEventListener('change', saveApiKey);

    // --- وظائف ---

    function loadConversationsFromStorage() {
        const saved = localStorage.getItem('chatdz_conversations');
        try {
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to parse conversations:", e);
            return [];
        }
    }

    function saveConversationsToStorage() {
        try {
            localStorage.setItem('chatdz_conversations', JSON.stringify(conversations));
        } catch (e) {
            console.error("Failed to save conversations:", e);
            alert("خطأ: لا يمكن حفظ المحادثات، قد تكون مساحة التخزين ممتلئة.");
        }
    }

    function renderConversationList() {
        conversationListElement.innerHTML = ''; // مسح القائمة
        if (conversations.length === 0) {
            noConversationsMessage.style.display = 'block';
            return;
        }
        noConversationsMessage.style.display = 'none';

        // فرز المحادثات (الأحدث أولاً)
        const sortedConversations = [...conversations].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        sortedConversations.forEach(conv => {
            const li = document.createElement('li');
            li.dataset.id = conv.id;

            const link = document.createElement('a');
            link.href = `chat.html?id=${conv.id}`;
            link.textContent = conv.title || 'محادثة بدون عنوان';
            link.title = `تاريخ الإنشاء: ${new Date(conv.createdAt).toLocaleString()}`;

            const deleteButton = document.createElement('button');
            deleteButton.classList.add('delete-conv-button');
            deleteButton.dataset.id = conv.id;
            deleteButton.innerHTML = '🗑️';
            deleteButton.title = 'حذف المحادثة';
            deleteButton.addEventListener('click', handleDeleteConversation);

            li.appendChild(link);
            li.appendChild(deleteButton);
            conversationListElement.appendChild(li);
        });
    }

    function handleDeleteConversation(event) {
        const button = event.target.closest('.delete-conv-button');
        const convIdToDelete = button.dataset.id;

        if (confirm(`هل أنت متأكد من رغبتك في حذف هذه المحادثة؟ هذا الإجراء لا يمكن التراجع عنه.`)) {
            conversations = conversations.filter(conv => conv.id != convIdToDelete);
            saveConversationsToStorage();
            renderConversationList(); // إعادة رسم القائمة
            console.log(`Conversation ${convIdToDelete} deleted.`);
        }
    }

    function startNewChat() {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            alert("الرجاء إدخال مفتاح OpenRouter API أولاً!");
            apiKeyInput.focus();
            return;
        }
        saveApiKey(); // حفظ المفتاح المدخل

        const newConv = createNewConversationObject();
        conversations.unshift(newConv); // إضافة المحادثة الجديدة في بداية القائمة
        saveConversationsToStorage();

        // الانتقال إلى صفحة المحادثة الجديدة
        window.location.href = `chat.html?id=${newConv.id}`;
    }

     function createNewConversationObject() {
        const selectedModel = modelSelectIndex.value;
        const newId = Date.now().toString();
        return {
            id: newId,
            title: `محادثة جديدة (${new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit'})})`,
            messages: [{ role: "assistant", content: "مرحباً! كيف يمكنني مساعدتك اليوم؟" }],
            createdAt: new Date().toISOString(),
            settings: { // إعدادات أولية من الصفحة الرئيسية
                model: selectedModel,
                temperature: 0.7, // قيمة افتراضية
                max_tokens: 512   // قيمة افتراضية
            }
        };
    }

    function saveApiKey() {
        localStorage.setItem('chatdz_apiKey', apiKeyInput.value.trim());
        console.log("API Key saved locally.");
    }

    function loadApiKey() {
        const savedKey = localStorage.getItem('chatdz_apiKey');
        if (savedKey) {
            apiKeyInput.value = savedKey;
        }
    }

});
