// --- START OF FILE static/js/chat.js (Revised and Enhanced) ---

document.addEventListener('DOMContentLoaded', () => {

    // --- الأساسيات: الحصول على عناصر DOM والمعرفات ---
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const chatIdElement = document.getElementById('chat-id');
    const modelNameElement = document.getElementById('model-name'); // قد لا يكون ضروريًا إذا كان الخادم يعرف النموذج

    // التحقق من وجود العناصر الأساسية قبل المتابعة
    if (!chatBox || !userInput || !sendButton || !chatIdElement) {
        console.error("Error: Essential chat elements (chat-box, user-input, send-button, chat-id) not found. Chat functionality disabled.");
        // يمكنك عرض رسالة خطأ للمستخدم هنا إذا أردت
        // displayErrorMessage("حدث خطأ في تحميل واجهة المحادثة.");
        return; // إيقاف تنفيذ السكربت إذا كانت العناصر مفقودة
    }

    const chatId = chatIdElement.value;
    // const modelName = modelNameElement ? modelNameElement.value : null; // اختياري الآن

    // --- نقاط نهاية الخادم (Server Endpoints) ---
    // تأكد من أن هذه المسارات تتطابق مع المسارات في تطبيق Flask/Django
    const MESSAGE_ENDPOINT = `/chat/${chatId}/message`; // لإرسال رسالة والحصول على رد
    const HISTORY_ENDPOINT = `/chat/${chatId}/history`; // لجلب سجل المحادثة (إذا كنت تفضل ذلك على تحميله مع الصفحة)
    const DELETE_ENDPOINT_BASE = `/delete_message/${chatId}/`; // المسار الأساسي للحذف (سيضاف messageId لاحقًا)

    // --- سجل المحادثة (يتم تحميله من الخادم أو مُضمّن في HTML) ---
    // لا نعتمد على تحديثه هنا بكثرة، الخادم هو المصدر الأساسي
    // let conversationHistory = []; // يمكنك الاحتفاظ به إذا أردت استخدامه لشيء ما

    // --- إضافة مستمعي الأحداث ---
    sendButton.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keypress', function(event) {
        // إرسال عند الضغط على Enter (بدون Shift)
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // منع السلوك الافتراضي لإضافة سطر جديد
            handleSendMessage();
        }
    });

    // --- *** إضافة مستمع لحذف الرسائل *** ---
    chatBox.addEventListener('click', function(event) {
        const deleteButton = event.target.closest('.delete-msg-btn'); // البحث عن زر الحذف

        if (deleteButton) {
            const messageElement = deleteButton.closest('.message');
            const messageId = messageElement?.dataset.messageId; // اقرأ ID من data attribute

            // التحقق من وجود ID صالح وأنه ليس رسالة لم تحفظ بعد
            if (messageId && messageId !== 'unknown' && !messageId.startsWith('temp_') && messageElement) {
                // طلب تأكيد من المستخدم
                if (confirm('هل أنت متأكد أنك تريد حذف هذه الرسالة؟ لا يمكن التراجع عن هذا الإجراء.')) {
                    handleDeleteMessage(messageId, messageElement);
                }
            } else if (messageId && (messageId.startsWith('temp_') || messageId === 'unknown')) {
                 console.warn('Cannot delete temporary or unknown message ID.');
                 // يمكنك إظهار رسالة للمستخدم هنا (اختياري)
                 // alert('لا يمكن حذف هذه الرسالة الآن.');
            } else {
                console.warn('Could not find valid message ID for deletion.');
            }
        }
    });
    // --- *** نهاية مستمع حذف الرسائل *** ---


    // --- التركيز على حقل الإدخال عند تحميل الصفحة ---
    userInput.focus();

    // --- التمرير لأسفل ---
    function scrollToBottom() {
        // التأكد مرة أخرى من وجود chatBox لتجنب الأخطاء
        const currentChatBox = document.getElementById('chat-box');
        if (currentChatBox) {
            currentChatBox.scrollTop = currentChatBox.scrollHeight;
        }
    }
    scrollToBottom(); // التمرير لأسفل عند التحميل الأولي

    // --- دوال الواجهة الرسومية (UI Functions) ---

    // دالة إضافة رسالة للعرض (لا تحدث السجل هنا)
    function addMessageToUI(sender, text, messageId = null) {
         const currentChatBox = document.getElementById('chat-box'); // التأكد من وجوده
         if (!currentChatBox) return;

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');

        // *** إضافة معرّف الرسالة كـ data attribute ***
        // هذا ضروري للحذف. تأكد أن الخادم يضيفه للرسائل عند تحميل الصفحة.
        if (messageId) {
            messageDiv.dataset.messageId = messageId;
        }

        // أيقونة المرسل
        const iconDiv = document.createElement('div');
        iconDiv.classList.add('message-icon');
        const iconImg = document.createElement('img');
        // تأكد من صحة مسارات الأيقونات
        iconImg.src = sender === 'user' ? '/static/img/user-icon.svg' : '/static/img/bot-icon.svg';
        iconImg.alt = sender;
        iconDiv.appendChild(iconImg);

        // محتوى الرسالة (استخدام innerHTML لعرض <br> بشكل صحيح)
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        contentDiv.innerHTML = text.replace(/\n/g, '<br>'); // استبدال الأسطر الجديدة بـ <br>

        // *** إضافة زر الحذف (فقط إذا كانت رسالة مستخدم ولها ID) ***
        // هذا يضاف للرسائل الجديدة التي تظهر خلال الجلسة
        // الرسائل القديمة يجب أن يأتي الزر معها من الخادم
        if (sender === 'user' && messageId && !messageId.startsWith('temp_')) { // لا نضيف زر حذف للرسائل المؤقتة
            const deleteButton = document.createElement('button');
            deleteButton.classList.add('delete-msg-btn');
            deleteButton.title = 'حذف الرسالة';
            // لا حاجة لـ data-msg-id هنا لأننا سنقرأه من العنصر الأب .message
            deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
            contentDiv.appendChild(deleteButton); // الأفضل وضعه داخل contentDiv
        }

        messageDiv.appendChild(iconDiv);
        messageDiv.appendChild(contentDiv);
        currentChatBox.appendChild(messageDiv);
        scrollToBottom();
    }

    // دالة عرض رسالة خطأ في الواجهة
    function displayErrorMessage(message) {
        addMessageToUI('bot', `⚠️ خطأ: ${message}`);
    }

    // دالة إظهار مؤشر "يفكر..."
    function showThinkingIndicator() {
        const currentChatBox = document.getElementById('chat-box');
        if (!currentChatBox) return;
        // إزالة أي مؤشر قديم أولاً
        removeThinkingIndicator();

        const thinkingDiv = document.createElement('div');
        thinkingDiv.id = 'thinking-indicator'; // ID لإزالته لاحقًا
        thinkingDiv.classList.add('message', 'bot-message', 'thinking'); // إضافة فئة thinking

        const iconDiv = document.createElement('div');
        iconDiv.classList.add('message-icon');
        const iconImg = document.createElement('img');
        iconImg.src = '/static/img/bot-icon.svg'; // أيقونة البوت
        iconImg.alt = 'Bot thinking';
        iconDiv.appendChild(iconImg);

        // محتوى المؤشر (نقاط متحركة)
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        const dotsDiv = document.createElement('div');
        dotsDiv.classList.add('thinking-dots');
        for (let i = 0; i < 3; i++) {
            dotsDiv.appendChild(document.createElement('span'));
        }
        contentDiv.appendChild(dotsDiv); // إضافة النقاط للمحتوى

        thinkingDiv.appendChild(iconDiv);
        thinkingDiv.appendChild(contentDiv);
        currentChatBox.appendChild(thinkingDiv);
        scrollToBottom();
    }

    // دالة إزالة مؤشر "يفكر..."
    function removeThinkingIndicator() {
        const indicator = document.getElementById('thinking-indicator');
        if (indicator) {
            indicator.remove(); // استخدام .remove() أحدث وأبسط
        }
    }


    // --- دوال الاتصال بالخادم (Server Communication) ---

    // دالة إرسال الرسالة للخادم
    async function handleSendMessage() {
        const userText = userInput.value.trim();

        if (!userText) return; // لا ترسل رسالة فارغة

        // 1. إضافة رسالة المستخدم للواجهة فورًا (مع ID مؤقت)
        const tempMessageId = `temp_${Date.now()}`;
        addMessageToUI('user', userText, tempMessageId);

        // 2. مسح حقل الإدخال والتركيز عليه
        userInput.value = '';
        userInput.focus();

        // 3. إظهار مؤشر التفكير
        showThinkingIndicator();

        try {
            // 4. إرسال الرسالة إلى الخادم
            const response = await fetch(MESSAGE_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // أضف أي headers أخرى قد يحتاجها الخادم (مثل CSRF token)
                    // 'X-CSRFToken': getCookie('csrftoken') // مثال لـ Django
                },
                body: JSON.stringify({ content: userText }) // إرسال المحتوى فقط
            });

            // 5. إزالة مؤشر التفكير بمجرد وصول الرد (سواء نجح أم فشل)
            removeThinkingIndicator();

            // 6. التحقق من نجاح استجابة الخادم
            if (!response.ok) {
                // محاولة قراءة رسالة الخطأ من الخادم
                 let errorMsg = `فشل الاتصال بالخادم (${response.status})`;
                 try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg; // استخدم رسالة الخطأ من الخادم إن وجدت
                 } catch (e) {
                    // إذا لم تكن الاستجابة JSON، اقرأها كنص عادي
                    errorMsg = await response.text() || errorMsg;
                 }
                throw new Error(errorMsg);
            }

            // 7. قراءة رد البوت من الخادم
            const data = await response.json();

            // 8. إضافة رد البوت للواجهة
            // يجب أن يتضمن الرد من الخادم ID الرسالة الحقيقي إذا أردت تحديث المؤقت
            // const botMessageId = data.message_id; // افترض أن الخادم يعيد ID
            addMessageToUI('bot', data.content /*, botMessageId*/ );

             // (اختياري) تحديث ID رسالة المستخدم المؤقتة إذا أعاده الخادم
             // const userMessageElement = chatBox.querySelector(`[data-message-id="${tempMessageId}"]`);
             // if (userMessageElement && data.user_message_id) {
             //    userMessageElement.dataset.messageId = data.user_message_id;
             // }

        } catch (error) {
            console.error('Error sending message:', error);
            removeThinkingIndicator(); // تأكد من إزالته في حالة الخطأ أيضًا
            // عرض رسالة خطأ للمستخدم في الواجهة
            displayErrorMessage(error.message || "فشل إرسال الرسالة.");
        }
    }

    // دالة حذف الرسالة (استدعاء الخادم وإزالة من الواجهة)
    async function handleDeleteMessage(messageId, messageElement) {
        console.log(`Attempting to delete message: ${messageId}`);
        // إضافة مؤشر بصري للحذف (اختياري)
        messageElement.style.opacity = '0.5';

        try {
            const response = await fetch(`${DELETE_ENDPOINT_BASE}${messageId}`, {
                method: 'DELETE', // أو 'POST' حسب تصميم الخادم
                headers: {
                    'Content-Type': 'application/json',
                     // أضف أي headers أخرى قد يحتاجها الخادم (مثل CSRF token)
                    // 'X-CSRFToken': getCookie('csrftoken')
                }
            });

            if (!response.ok) {
                 let errorMsg = `فشل الحذف (${response.status})`;
                 try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg;
                 } catch (e) {
                    errorMsg = await response.text() || errorMsg;
                 }
                throw new Error(errorMsg);
            }

            // تمت العملية بنجاح في الخادم
            console.log(`Message ${messageId} deleted successfully on server.`);
            // إزالة العنصر من الواجهة
            messageElement.remove();
            // يمكنك عرض رسالة نجاح صغيرة (اختياري)
            // showNotification('تم حذف الرسالة بنجاح');

        } catch (error) {
            console.error('Error deleting message:', error);
            // عرض خطأ للمستخدم وإعادة الشفافية للعنصر
            alert(`فشل حذف الرسالة: ${error.message}`);
            messageElement.style.opacity = '1'; // إعادة الشفافية عند الفشل
        }
    }

    // (اختياري) دالة جلب CSRF token من الكوكيز (إذا كنت تستخدم Django أو إطار عمل مشابه)
    // function getCookie(name) {
    //     let cookieValue = null;
    //     if (document.cookie && document.cookie !== '') {
    //         const cookies = document.cookie.split(';');
    //         for (let i = 0; i < cookies.length; i++) {
    //             const cookie = cookies[i].trim();
    //             if (cookie.substring(0, name.length + 1) === (name + '=')) {
    //                 cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
    //                 break;
    //             }
    //         }
    //     }
    //     return cookieValue;
    // }

}); // نهاية DOMContentLoaded
// --- END OF FILE static/js/chat.js ---
