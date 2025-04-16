// static/js/chat.js (Rebuilt - Professional, Voice, Delete, Backend-Reliant)

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. عناصر DOM الأساسية والمعرفات ---
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input'); // Textarea
    const sendButton = document.getElementById('send-button');
    const voiceInputButton = document.getElementById('voice-input-btn');
    const deleteChatButton = document.getElementById('delete-chat-btn');
    const chatIdElement = document.getElementById('chat-id');

    // التحقق الحاسم من وجود العناصر
    if (!chatBox || !userInput || !sendButton || !voiceInputButton || !deleteChatButton || !chatIdElement) {
        console.error("CRITICAL: Essential chat UI elements missing. Chat functionality disabled.");
        if(chatBox) chatBox.innerHTML = '<p style="color:red; text-align:center; padding:20px;">خطأ فادح في تحميل الواجهة.</p>';
        return; // إيقاف التنفيذ
    }

    const chatId = chatIdElement.value;

    // --- 2. نقاط نهاية الخادم (Server Endpoints) ---
    const MESSAGE_ENDPOINT = `/chat/${chatId}/message`;
    const DELETE_CHAT_ENDPOINT = `/chat/${chatId}`;
    const DELETE_MESSAGE_ENDPOINT_BASE = `/delete_message/${chatId}/`;

    // --- 3. تهيئة ميزات الصوت (Web Speech API) ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = SpeechRecognition ? new SpeechRecognition() : null;
    const synthesis = window.speechSynthesis;
    let isListening = false;

    if (recognition) {
        recognition.continuous = false; // توقف بعد نطق الجملة
        recognition.lang = 'ar-SA';     // اللغة العربية
        recognition.interimResults = false; // لا نريد نتائج مؤقتة

        recognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript.trim();
            userInput.value += (userInput.value ? ' ' : '') + transcript; // إضافة النص المستمع للحقل
            autoResizeTextarea(); // تحديث حجم الحقل
            userInput.focus();
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            let errorMsg = "حدث خطأ في التعرف على الصوت.";
            if (event.error === 'no-speech') errorMsg = "لم يتم اكتشاف أي كلام.";
            if (event.error === 'audio-capture') errorMsg = "فشل التقاط الصوت (تأكد من أذونات الميكروفون).";
            if (event.error === 'not-allowed') errorMsg = "تم رفض إذن استخدام الميكروفون.";
            displayStatusMessage(errorMsg, 'error');
        };

        recognition.onend = () => {
            isListening = false;
            voiceInputButton.classList.remove('listening');
             voiceInputButton.innerHTML = '<i class="fas fa-microphone"></i>'; // إرجاع الأيقونة الأصلية
            voiceInputButton.disabled = false;
             console.log('Speech recognition ended.');
        };

    } else {
        console.warn("Speech Recognition API not supported in this browser.");
        voiceInputButton.disabled = true; // تعطيل الزر إذا لم يكن مدعومًا
        voiceInputButton.title = "الإدخال الصوتي غير مدعوم في هذا المتصفح";
    }

    // --- 4. مستمعو الأحداث (Event Listeners) ---

    sendButton.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } });
    userInput.addEventListener('input', autoResizeTextarea);

    // زر الإدخال الصوتي
    voiceInputButton.addEventListener('click', toggleVoiceInput);

    // زر حذف المحادثة
    deleteChatButton.addEventListener('click', handleDeleteChat);

    // حذف رسالة فردية وتشغيل الصوت (تفويض الأحداث)
    chatBox.addEventListener('click', (event) => {
        const deleteBtn = event.target.closest('.delete-msg-btn');
        const speakBtn = event.target.closest('.speak-btn');

        if (deleteBtn) {
            handleIndividualMessageDelete(deleteBtn);
        } else if (speakBtn) {
            handleSpeakMessage(speakBtn);
        }
    });

    // --- 5. وظائف الواجهة الرسومية (UI Functions) ---

    function addMessageToUI(sender, text, messageId = null) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
        if (messageId) messageDiv.dataset.messageId = messageId;

        const iconDiv = document.createElement('div');
        iconDiv.classList.add('message-icon');
        const iconImg = document.createElement('img');
        iconImg.src = sender === 'user' ? '/static/img/user-icon.svg' : '/static/img/bot-icon.svg';
        iconImg.alt = sender;
        iconImg.onerror = () => iconDiv.remove(); // إزالة إذا فشل التحميل
        iconDiv.appendChild(iconImg);

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        contentDiv.innerHTML = escapeHTML(text).replace(/\n/g, '<br>');

        // *** زر الحذف يجب أن يضاف بواسطة الخادم للرسائل القديمة ***
        // لا نضيفه هنا للرسائل الجديدة تلقائياً لتجنب التعقيد

        // زر تشغيل الصوت (فقط لرسائل البوت)
        if (sender === 'assistant' && synthesis && text) { // تأكد أن synthesis مدعوم والنص موجود
            const speakButton = document.createElement('button');
            speakButton.classList.add('speak-btn');
            speakButton.title = 'تشغيل الصوت';
            speakButton.innerHTML = '<i class="fas fa-volume-up"></i>';
             // تخزين النص المراد نطقه في الزر نفسه لتسهيل الوصول إليه
             speakButton.dataset.textToSpeak = text;
            contentDiv.appendChild(speakButton); // الأفضل وضعه داخل contentDiv
        }

        messageDiv.appendChild(iconDiv);
        messageDiv.appendChild(contentDiv);
        chatBox.appendChild(messageDiv);
        scrollToBottom();
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function showThinkingIndicator() {
        removeThinkingIndicator();
        const thinkingDiv = document.createElement('div');
        thinkingDiv.id = 'thinking-indicator';
        thinkingDiv.classList.add('message', 'bot-message', 'thinking');
         const iconDiv = document.createElement('div');
        iconDiv.classList.add('message-icon');
        const iconImg = document.createElement('img');
        iconImg.src = '/static/img/bot-icon.svg';
        iconImg.alt = 'Bot thinking';
         iconImg.onerror = () => iconDiv.remove();
        iconDiv.appendChild(iconImg);
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content'); // المحتوى فارغ، النقاط تضاف بـ CSS
        const dotsDiv = document.createElement('div');
        dotsDiv.classList.add('thinking-dots');
        for (let i = 0; i < 3; i++) dotsDiv.appendChild(document.createElement('span'));
        contentDiv.appendChild(dotsDiv);
        thinkingDiv.appendChild(iconDiv);
        thinkingDiv.appendChild(contentDiv);
        chatBox.appendChild(thinkingDiv);
        scrollToBottom();
    }

    function removeThinkingIndicator() {
        const indicator = document.getElementById('thinking-indicator');
        if (indicator) indicator.remove();
    }

    // عرض رسالة حالة (خطأ، نجاح، معلومة)
    function displayStatusMessage(message, type = 'info') {
         // يمكنك إنشاء عنصر خاص لعرض هذه الرسائل أو إضافتها كرسالة بوت
         console.log(`Status (${type}): ${message}`);
         addMessageToUI('bot', `*(${type === 'error' ? 'خطأ' : 'معلومة'})* ${message}`);
    }

    function scrollToBottom() {
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function autoResizeTextarea() {
        userInput.style.height = 'auto';
        let newHeight = userInput.scrollHeight;
        const maxHeight = 150; // Max height approx 5 lines
        userInput.style.overflowY = newHeight > maxHeight ? 'scroll' : 'hidden';
        userInput.style.height = `${Math.min(newHeight, maxHeight)}px`;
    }

    // --- 6. وظائف منطق التطبيق (Application Logic) ---

    async function handleSendMessage() {
        const userText = userInput.value.trim();
        if (!userText) return;

        addMessageToUI('user', userText, `temp_${Date.now()}`);
        userInput.value = '';
        autoResizeTextarea();
        userInput.focus();
        showThinkingIndicator();

        try {
            const response = await fetch(MESSAGE_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' /* Add CSRF if needed */ },
                body: JSON.stringify({ content: userText })
            });

            removeThinkingIndicator();

            if (!response.ok) throw await generateErrorFromResponse(response, "فشل إرسال الرسالة");

            const data = await response.json();
            if (data.content) {
                addMessageToUI('assistant', data.content /*, data.bot_message_id */);
            } else {
                 throw new Error("تم استلام رد غير صحيح من الخادم.");
            }

        } catch (error) {
            console.error('Error sending message:', error);
            removeThinkingIndicator();
            displayStatusMessage(error.message || "حدث خطأ غير متوقع.", 'error');
        }
    }

    function toggleVoiceInput() {
        if (!recognition) return; // التأكد مرة أخرى

        if (isListening) {
            recognition.stop();
            // onend سيقوم بتحديث الواجهة
        } else {
            try {
                recognition.start();
                isListening = true;
                voiceInputButton.classList.add('listening');
                voiceInputButton.innerHTML = '<i class="fas fa-stop"></i>'; // أيقونة إيقاف
                 voiceInputButton.disabled = true; // تعطيل مؤقت لمنع الضغط السريع
                 setTimeout(() => { voiceInputButton.disabled = false; }, 500); // إعادة تفعيل بعد فترة قصيرة
                console.log('Speech recognition started.');
            } catch (error) {
                console.error("Error starting recognition:", error);
                 displayStatusMessage("فشل بدء التعرف على الصوت.", 'error');
                isListening = false; // التأكد من إعادة التعيين
                voiceInputButton.classList.remove('listening');
                 voiceInputButton.innerHTML = '<i class="fas fa-microphone"></i>';
            }
        }
    }

    function handleSpeakMessage(speakButton) {
        if (!synthesis) {
             displayStatusMessage("نطق النص غير مدعوم في هذا المتصفح.", 'error');
            return;
        }
        const textToSpeak = speakButton.dataset.textToSpeak;
        if (!textToSpeak) {
             console.warn("No text found to speak for this message.");
            return;
        }

        // إيقاف أي نطق حالي
        if (synthesis.speaking) {
            synthesis.cancel();
             document.querySelectorAll('.speak-btn.speaking i').forEach(icon => icon.className = 'fas fa-volume-up'); // Reset icons
             if (speakButton.classList.contains('speaking')) { // If stopping the currently speaking one
                speakButton.classList.remove('speaking');
                speakButton.querySelector('i').className = 'fas fa-volume-up';
                return; // Just stop
            }
        }

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'ar-SA'; // تحديد اللغة مهم جداً
        // يمكنك تجربة أصوات مختلفة إذا أردت
        // const voices = synthesis.getVoices();
        // utterance.voice = voices.find(voice => voice.lang === 'ar-SA');

        utterance.onstart = () => {
            speakButton.classList.add('speaking');
            speakButton.querySelector('i').className = 'fas fa-stop-circle'; // Change to stop icon
             console.log('Speech started for:', textToSpeak.substring(0, 20) + "...");
        };

        utterance.onend = () => {
            speakButton.classList.remove('speaking');
            speakButton.querySelector('i').className = 'fas fa-volume-up'; // Reset icon
             console.log('Speech ended.');
        };

        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event.error);
            displayStatusMessage(`فشل نطق النص: ${event.error}`, 'error');
            speakButton.classList.remove('speaking');
            speakButton.querySelector('i').className = 'fas fa-volume-up';
        };

        synthesis.speak(utterance);
    }


    function handleIndividualMessageDelete(deleteButton) {
        const messageElement = deleteButton.closest('.message');
        const messageId = messageElement?.dataset.messageId;

        if (messageId && confirm('تأكيد: هل تريد حذف هذه الرسالة؟')) {
            deleteMessageFromServer(messageId, messageElement);
        }
    }

    async function deleteMessageFromServer(messageId, messageElement) {
        console.log(`Deleting message ID: ${messageId}`);
        messageElement.style.opacity = '0.5'; // Visual feedback

        try {
            const response = await fetch(`${DELETE_MESSAGE_ENDPOINT_BASE}${messageId}`, {
                method: 'DELETE',
                headers: { /* Add CSRF if needed */ }
            });

            if (!response.ok) throw await generateErrorFromResponse(response, "فشل حذف الرسالة");

            console.log(`Message ${messageId} deleted from server.`);
            // Smooth removal animation
            messageElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease, height 0.3s ease, margin 0.3s ease, padding 0.3s ease';
            messageElement.style.opacity = '0';
            messageElement.style.transform = 'scale(0.95)';
            messageElement.style.height = '0';
            messageElement.style.margin = '0';
            messageElement.style.padding = '0';
            setTimeout(() => messageElement.remove(), 350);

        } catch (error) {
            console.error('Error deleting message:', error);
            displayStatusMessage(error.message || "حدث خطأ غير متوقع عند الحذف.", 'error');
            messageElement.style.opacity = '1'; // Restore on error
        }
    }

    async function handleDeleteChat() {
        if (!confirm('تحذير!\nسيتم حذف هذه المحادثة بالكامل.\nهل أنت متأكد من المتابعة؟')) return;

        deleteChatButton.disabled = true;
        deleteChatButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ...';

        try {
            const response = await fetch(DELETE_CHAT_ENDPOINT, {
                method: 'DELETE',
                headers: { /* Add CSRF if needed */ }
            });

            if (!response.ok) throw await generateErrorFromResponse(response, "فشل حذف المحادثة");

            console.log(`Chat ${chatId} deleted successfully.`);
            alert('تم حذف المحادثة بنجاح. سيتم توجيهك للصفحة الرئيسية.');
            window.location.href = '/'; // Redirect to home

        } catch (error) {
            console.error('Error deleting chat:', error);
            alert(`فشل حذف المحادثة: ${error.message}`);
            deleteChatButton.disabled = false; // Re-enable button on error
            deleteChatButton.innerHTML = '<i class="fas fa-trash-alt"></i> <span class="delete-text">حذف</span>';
        }
    }

     // Helper function to generate Error object from fetch response
     async function generateErrorFromResponse(response, defaultMessage) {
         let errorMsg = defaultMessage;
         try {
            // Try to parse JSON error first
            const errorData = await response.json();
            errorMsg = errorData.error || errorData.message || errorMsg;
         } catch (e) {
            // If not JSON, try plain text
            try {
                 errorMsg = await response.text() || errorMsg;
            } catch (e2) { /* Ignore further errors */ }
         }
         return new Error(`${errorMsg} (Status: ${response.status})`);
     }


    // --- 7. Initial Setup Calls ---
    scrollToBottom();
    autoResizeTextarea();

}); // End DOMContentLoaded
