// static/js/chat.js (Modern, Backend-Reliant Version)

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. عناصر DOM الأساسية والمعرفات ---
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input'); // تم تغييره إلى textarea
    const sendButton = document.getElementById('send-button');
    const deleteChatButton = document.getElementById('delete-chat-btn'); // زر حذف المحادثة
    const chatIdElement = document.getElementById('chat-id');

    // التحقق من وجود العناصر الأساسية
    if (!chatBox || !userInput || !sendButton || !chatIdElement || !deleteChatButton) {
        console.error("CRITICAL: Essential chat UI elements missing. Chat functionality disabled.");
        // يمكنك تعطيل واجهة الإدخال بالكامل هنا
        if (userInput) userInput.disabled = true;
        if (sendButton) sendButton.disabled = true;
        // عرض رسالة خطأ دائمة
        const errorDiv = document.createElement('div');
        errorDiv.textContent = "خطأ فادح: فشل تحميل واجهة المحادثة. يرجى إعادة تحميل الصفحة.";
        errorDiv.style.color = 'red';
        errorDiv.style.textAlign = 'center';
        errorDiv.style.padding = '20px';
        chatBox.innerHTML = ''; // مسح أي رسائل قد تكون موجودة
        chatBox.appendChild(errorDiv);
        return;
    }

    const chatId = chatIdElement.value;

    // --- 2. نقاط نهاية الخادم (Server Endpoints) ---
    const MESSAGE_ENDPOINT = `/chat/${chatId}/message`;
    const DELETE_CHAT_ENDPOINT = `/chat/${chatId}`; // لحذف المحادثة كلها
    const DELETE_MESSAGE_ENDPOINT_BASE = `/delete_message/${chatId}/`; // لحذف رسالة فردية

    // --- 3. مستمعو الأحداث (Event Listeners) ---

    // إرسال الرسالة
    sendButton.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    });
    // تغيير حجم textarea تلقائيًا (اختياري لكن يحسن التجربة)
    userInput.addEventListener('input', autoResizeTextarea);
    autoResizeTextarea(); // ضبط الحجم الأولي

    // حذف المحادثة بأكملها
    deleteChatButton.addEventListener('click', handleDeleteChat);

    // حذف رسالة فردية (استخدام تفويض الأحداث)
    chatBox.addEventListener('click', (event) => {
        const deleteButton = event.target.closest('.delete-msg-btn');
        if (deleteButton) {
            const messageElement = deleteButton.closest('.message');
            const messageId = messageElement?.dataset.messageId;
            if (messageId && messageId !== 'unknown' && !messageId.startsWith('temp_')) {
                 // تأكيد مزدوج لحذف المحادثة
                 if (confirm('هل أنت متأكد من حذف هذه الرسالة؟ لا يمكن التراجع عنها.')) {
                    handleDeleteMessage(messageId, messageElement);
                 }
            } else {
                console.warn('Invalid or temporary message ID, cannot delete.');
            }
        }
    });

    // --- 4. وظائف الواجهة الرسومية (UI Functions) ---

    // إضافة رسالة للعرض
    function addMessageToUI(sender, text, messageId = null) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
        if (messageId) {
            messageDiv.dataset.messageId = messageId; // إضافة ID للـ data attribute
        }

        const iconDiv = document.createElement('div');
        iconDiv.classList.add('message-icon');
        const iconImg = document.createElement('img');
        iconImg.src = sender === 'user' ? '/static/img/user-icon.svg' : '/static/img/bot-icon.svg';
        iconImg.alt = sender;
        iconImg.onerror = () => { iconDiv.style.display = 'none'; }; // إخفاء الأيقونة إذا لم يتم تحميل الصورة
        iconDiv.appendChild(iconImg);

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
         // تحويل النص إلى HTML آمن (مهم لمنع XSS إذا كان الرد يتضمن شيئًا غير متوقع)
         // ويعرض الأسطر الجديدة بشكل صحيح
        contentDiv.innerHTML = escapeHTML(text).replace(/\n/g, '<br>');

        // *** زر حذف الرسالة الفردية يجب أن يأتي من الخادم للرسائل القديمة ***
        // نضيفه هنا فقط للرسائل الجديدة التي يرسلها المستخدم *بعد* التأكد من حفظها (إذا أمكن)
        // حاليًا، الكود لا يضيف زر الحذف للرسائل الجديدة المرسلة خلال الجلسة
        // لأننا نحتاج للتأكد من أن الخادم حفظها وأعاد ID.

        messageDiv.appendChild(iconDiv);
        messageDiv.appendChild(contentDiv);
        chatBox.appendChild(messageDiv);
        scrollToBottom();
    }

     // دالة لتنظيف HTML (حماية أساسية من XSS)
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    // إظهار مؤشر التفكير
    function showThinkingIndicator() {
        removeThinkingIndicator(); // إزالة القديم إن وجد
        const thinkingDiv = document.createElement('div');
        thinkingDiv.id = 'thinking-indicator';
        thinkingDiv.classList.add('message', 'bot-message', 'thinking');
        // ... (نفس كود بناء المؤشر كما في المثال السابق) ...
         const iconDiv = document.createElement('div');
        iconDiv.classList.add('message-icon');
        const iconImg = document.createElement('img');
        iconImg.src = '/static/img/bot-icon.svg'; // أيقونة البوت
        iconImg.alt = 'Bot thinking';
         iconImg.onerror = () => { iconDiv.style.display = 'none'; };
        iconDiv.appendChild(iconImg);

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        const dotsDiv = document.createElement('div');
        dotsDiv.classList.add('thinking-dots');
        for (let i = 0; i < 3; i++) {
            dotsDiv.appendChild(document.createElement('span'));
        }
        contentDiv.appendChild(dotsDiv);

        thinkingDiv.appendChild(iconDiv);
        thinkingDiv.appendChild(contentDiv);
        chatBox.appendChild(thinkingDiv);
        scrollToBottom();
    }

    // إزالة مؤشر التفكير
    function removeThinkingIndicator() {
        const indicator = document.getElementById('thinking-indicator');
        if (indicator) indicator.remove();
    }

    // عرض رسالة خطأ عامة في الواجهة
    function displayGlobalError(message) {
        addMessageToUI('bot', `⚠️ **خطأ:** ${message}`);
    }

    // تغيير حجم textarea تلقائيًا
    function autoResizeTextarea() {
        userInput.style.height = 'auto'; // إعادة التعيين للحصول على scrollHeight الصحيح
        let newHeight = userInput.scrollHeight;
        // حد أقصى للارتفاع (مثلاً 5 أسطر)
        const maxHeight = 120; // يمكن تعديل هذا الرقم
        if (newHeight > maxHeight) {
            newHeight = maxHeight;
            userInput.style.overflowY = 'scroll'; // إظهار شريط التمرير
        } else {
            userInput.style.overflowY = 'hidden'; // إخفاء شريط التمرير
        }
        userInput.style.height = `${newHeight}px`;
    }

    // --- 5. وظائف الاتصال بالخادم (Backend Communication) ---

    // إرسال رسالة المستخدم
    async function handleSendMessage() {
        const userText = userInput.value.trim();
        if (!userText) return;

        addMessageToUI('user', userText, `temp_${Date.now()}`); // عرض فوري بـ ID مؤقت
        userInput.value = '';
        autoResizeTextarea(); // إعادة ضبط ارتفاع textarea
        userInput.focus();
        showThinkingIndicator();

        try {
            const response = await fetch(MESSAGE_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // 'X-CSRFToken': getCookie('csrftoken') // أضف إذا لزم الأمر
                },
                body: JSON.stringify({ content: userText })
            });

            removeThinkingIndicator();

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `خطأ في الخادم: ${response.status}` }));
                throw new Error(errorData.error || `خطأ غير معروف من الخادم`);
            }

            const data = await response.json();
            // تأكد من أن الخادم يعيد حقل 'content' للرد
            if (data.content) {
                 // الخادم يجب أن يعيد ID للرسائل الجديدة إذا أردنا تفعيل الحذف لها لاحقاً
                 addMessageToUI('bot', data.content /*, data.bot_message_id */);
            } else {
                console.warn("Server response missing 'content'.", data);
                displayGlobalError("تم استلام رد غير متوقع من الخادم.");
            }

        } catch (error) {
            console.error('Error sending message:', error);
            removeThinkingIndicator();
            displayGlobalError(error.message || "فشل إرسال الرسالة. يرجى المحاولة مرة أخرى.");
        }
    }

    // حذف المحادثة بأكملها
    async function handleDeleteChat() {
         if (!confirm('تحذير! سيتم حذف هذه المحادثة بالكامل بما فيها جميع الرسائل. هل أنت متأكد؟')) {
             return;
         }

        console.log(`Requesting delete for chat ID: ${chatId}`);
        // تعطيل الزر مؤقتًا لمنع النقرات المتعددة
        deleteChatButton.disabled = true;
        deleteChatButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جارٍ الحذف...';


        try {
            const response = await fetch(DELETE_CHAT_ENDPOINT, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                     // 'X-CSRFToken': getCookie('csrftoken') // أضف إذا لزم الأمر
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `فشل الحذف: ${response.status}` }));
                throw new Error(errorData.error || "خطأ غير معروف عند حذف المحادثة.");
            }

            // نجح الحذف في الخادم
            console.log(`Chat ${chatId} deleted successfully.`);
            alert('تم حذف المحادثة بنجاح!');
            // إعادة التوجيه للصفحة الرئيسية
            window.location.href = '/'; // أو المسار الصحيح للصفحة الرئيسية

        } catch (error) {
            console.error('Error deleting chat:', error);
            alert(`فشل حذف المحادثة: ${error.message}`);
            // إعادة تفعيل الزر عند الفشل
            deleteChatButton.disabled = false;
            deleteChatButton.innerHTML = '<i class="fas fa-trash-alt"></i> مسح المحادثة';

        }
    }

    // حذف رسالة فردية
    async function handleDeleteMessage(messageId, messageElement) {
        console.log(`Requesting delete for message ID: ${messageId}`);
        messageElement.style.opacity = '0.5'; // تعتيم بصري مؤقت

        try {
            const response = await fetch(`${DELETE_MESSAGE_ENDPOINT_BASE}${messageId}`, {
                method: 'DELETE',
                 headers: {
                    'Content-Type': 'application/json',
                     // 'X-CSRFToken': getCookie('csrftoken') // أضف إذا لزم الأمر
                 }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `فشل الحذف: ${response.status}` }));
                throw new Error(errorData.error || "خطأ غير معروف عند حذف الرسالة.");
            }

            console.log(`Message ${messageId} deleted from server.`);
            // إزالة العنصر من الواجهة بسلاسة (اختياري)
            messageElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            messageElement.style.opacity = '0';
            messageElement.style.transform = 'translateX(-20px)'; // تأثير انزلاق بسيط
            setTimeout(() => messageElement.remove(), 300); // إزالة بعد انتهاء الانتقال

        } catch (error) {
            console.error('Error deleting message:', error);
            alert(`فشل حذف الرسالة: ${error.message}`);
            messageElement.style.opacity = '1'; // إعادة الشفافية عند الفشل
        }
    }

    // --- 6. تهيئة أولية ---
    scrollToBottom(); // تأكد من التمرير للأسفل عند التحميل
    autoResizeTextarea(); // ضبط ارتفاع textarea الأولي

}); // نهاية DOMContentLoaded
