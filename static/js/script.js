// static/js/script.js  
  
document.addEventListener('DOMContentLoaded', () => {  
  
    // --- الحصول على العناصر الأساسية ---  
    const chatBox = document.getElementById('chat-box');  
    const userInput = document.getElementById('user-input');  
    const sendButton = document.getElementById('send-button');  
    // Note: modelSelect is on index.html, not chat.html usually  
    // const modelSelect = document.getElementById('model-select');  
    const apiKeyInput = document.getElementById('api-key');  
    const toggleApiKeyButton = document.getElementById('toggle-api-key');  
    const currentChatId = document.getElementById('chat-id')?.value; // ID المحادثة الحالية  
  
    // --- API Endpoints ---  
    const OPENROUTER_API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';  
    // const SERVER_API_ENDPOINT = '/api'; // إذا كنت تستخدمه للتواصل مع الخادم  
  
    // النماذج المجانية (لأغراض منطق max_tokens مثلاً)  
    const FREE_MODELS = [  
        "mistralai/mistral-7b-instruct-v0.2",  
        "google/gemma-7b-it",  
        "nousresearch/nous-hermes-2-mistral-7b-dpo",  
        "openchat/openchat-7b",  
        "gryphe/mythomist-7b",  
        "01-ai/yi-1.5-9b-chat"  
    ];  
  
    // --- تاريخ المحادثة (يجب تحميله من الخادم لـ chat.html) ---  
    // هذا يجب أن يُملأ بالرسائل الفعلية من الخادم عند تحميل chat.html  
    // الكود أدناه يفترض أنه يبدأ فارغًا أو برسالة نظام/ترحيب  
    let conversationHistory = [];  
    // دالة لتحميل الرسائل الموجودة في HTML إلى conversationHistory  
    function loadInitialHistory() {  
        if (!chatBox) return;  
        const messages = chatBox.querySelectorAll('.message');  
        messages.forEach(msgElement => {  
            const contentElement = msgElement.querySelector('.message-content');  
            if (!contentElement) return; // تخطي إذا لم يوجد محتوى  
  
             // تجاهل زر الحذف عند استخلاص المحتوى النصي  
            const clonedContent = contentElement.cloneNode(true);  
            const deleteBtn = clonedContent.querySelector('.delete-msg-btn');  
            if (deleteBtn) {  
                deleteBtn.remove();  
            }  
            const textContent = clonedContent.textContent.trim();  
  
  
            if (textContent && !msgElement.classList.contains('thinking')) { // تجاهل مؤشر التفكير  
                let role = 'assistant'; // افتراضي  
                if (msgElement.classList.contains('user-message')) {  
                    role = 'user';  
                }  
                conversationHistory.push({ role: role, content: textContent });  
            }  
        });  
        console.log("Initial conversation history loaded:", conversationHistory);  
    }  
  
    // --- إضافة Event Listeners (فقط إذا كانت العناصر موجودة) ---  
    if (sendButton && userInput) {  
        sendButton.addEventListener('click', sendMessage);  
        userInput.addEventListener('keypress', function(event) {  
            if (event.key === 'Enter' && !event.shiftKey) { // إرسال بـ Enter، سطر جديد بـ Shift+Enter  
                 event.preventDefault(); // منع السطر الجديد الافتراضي  
                sendMessage();  
            }  
        });  
    } else {  
        console.warn("Send button or user input not found.");  
    }  
  
    if (toggleApiKeyButton && apiKeyInput) {  
        toggleApiKeyButton.addEventListener('click', function() {  
            const fieldType = apiKeyInput.getAttribute('type');  
            const icon = this.querySelector('img') || this.querySelector('i'); // التعامل مع صورة أو أيقونة  
  
            if (fieldType === 'password') {  
                apiKeyInput.setAttribute('type', 'text');  
                if (icon) icon.style.opacity = '0.7'; // أو تغيير الأيقونة لـ eye-slash  
            } else {  
                apiKeyInput.setAttribute('type', 'password');  
                 if (icon) icon.style.opacity = '1'; // أو تغيير الأيقونة لـ eye  
            }  
        });  
    } else {  
        console.warn("API Key toggle button or input not found.");  
    }  
  
    // تحميل مفتاح API المحفوظ والتركيز على الحقل  
    if (apiKeyInput) {  
        const savedApiKey = localStorage.getItem('openrouter_api_key');  
        if (savedApiKey) {  
            apiKeyInput.value = savedApiKey;  
        }  
        // حفظ المفتاح عند التغيير  
        apiKeyInput.addEventListener('change', () => {  
            const apiKey = apiKeyInput.value.trim();  
            if (apiKey) {  
                localStorage.setItem('openrouter_api_key', apiKey);  
                console.log("API Key saved to localStorage.");  
            } else {  
                 localStorage.removeItem('openrouter_api_key'); // إزالة إذا كان فارغًا  
                 console.log("API Key removed from localStorage.");  
            }  
        });  
    }  
  
    if (userInput) {  
        userInput.focus(); // التركيز على حقل الإدخال  
    }  
  
    // --- تحميل تاريخ المحادثة الأولي ---  
    loadInitialHistory();  
  
    // --- التمرير لأسفل ---  
    function scrollToBottom() {  
        if (chatBox) {  
            chatBox.scrollTop = chatBox.scrollHeight;  
        }  
    }  
    scrollToBottom(); // التمرير عند التحميل  
  
    // --- دوال معالجة الرسائل ---  
  
    // إضافة رسالة للعرض وللتاريخ  
    function addMessage(sender, text, messageId = null) {  
        if (!chatBox) return;  
  
        const messageDiv = document.createElement('div');  
        messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');  
        // إضافة معرف الرسالة إذا كان متاحًا (مهم للحذف)  
        if (messageId) {  
            messageDiv.dataset.messageId = messageId;  
        }  
  
        const iconDiv = document.createElement('div');  
        iconDiv.classList.add('message-icon');  
        const iconImg = document.createElement('img');  
        // تأكد من أن مسارات الأيقونات صحيحة  
        iconImg.src = sender === 'user' ? '/static/img/user-icon.svg' : '/static/img/bot-icon.svg';  
        iconImg.alt = sender === 'user' ? 'User' : 'Bot';  
        iconDiv.appendChild(iconImg);  
  
        const contentDiv = document.createElement('div');  
        contentDiv.classList.add('message-content');  
        // التعامل مع أسطر جديدة في النص  
        contentDiv.innerHTML = text.replace(/\n/g, '<br>'); // عرض الأسطر الجديدة كـ <br>  
  
        // إضافة زر الحذف لرسائل المستخدم (إذا كان ID متاحًا)  
        if (sender === 'user' && messageId) {  
            const deleteButton = document.createElement('button');  
            deleteButton.classList.add('delete-msg-btn');  
            deleteButton.title = 'حذف الرسالة';  
            deleteButton.dataset.msgId = messageId; // إضافة ID هنا أيضًا قد يكون مفيدًا  
            deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';  
            contentDiv.appendChild(deleteButton); // إضافته داخل contentDiv  
        }  
  
  
        messageDiv.appendChild(iconDiv); // أيقونة قبل المحتوى (سيتم عكس الترتيب بـ CSS لرسائل المستخدم)  
        messageDiv.appendChild(contentDiv);  
  
        chatBox.appendChild(messageDiv);  
        scrollToBottom();  
  
        // إضافة للتاريخ فقط إذا لم يكن مؤشر تفكير  
        if (!messageDiv.classList.contains('thinking')) {  
             // *** نقطة مهمة: لا تضف زر الحذف إلى conversationHistory ***  
             const historyContent = text; // النص الأصلي بدون زر الحذف  
            conversationHistory.push({  
                role: sender === 'user' ? 'user' : 'assistant',  
                content: historyContent  
            });  
            console.log("History updated:", conversationHistory);  
        }  
    }  
  
    // إظهار مؤشر التفكير  
    function showThinkingIndicator() {  
         if (!chatBox) return;  
        // إزالة أي مؤشر قديم أولاً  
        removeThinkingIndicator();  
  
        const thinkingDiv = document.createElement('div');  
        thinkingDiv.classList.add('message', 'bot-message', 'thinking');  
        thinkingDiv.id = 'thinking-indicator';  
  
        const iconDiv = document.createElement('div');  
        iconDiv.classList.add('message-icon');  
        const iconImg = document.createElement('img');  
        iconImg.src = '/static/img/bot-icon.svg';  
        iconImg.alt = 'Bot';  
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
        if (indicator) {  
            indicator.remove(); // استخدام remove() بدلاً من removeChild  
        }  
    }  
  
    // --- إرسال الرسالة واستدعاء API ---  
    async function sendMessage() {  
        if (!userInput || !apiKeyInput) return; // التأكد من وجود الحقول  
  
        const userText = userInput.value.trim();  
        const apiKey = apiKeyInput.value.trim();  
        const selectedModel = document.getElementById('model-name')?.value || 'mistralai/mistral-7b-instruct-v0.2'; // قراءة النموذج من الحقل المخفي  
  
        if (!userText) return;  
        if (!apiKey) {  
            alert('الرجاء إدخال مفتاح OpenRouter API!');  
            apiKeyInput.focus();  
            return;  
        }  
  
        // إضافة رسالة المستخدم للعرض (مع ID مؤقت أو يتم الحصول عليه لاحقًا من الخادم إن أمكن)  
        // حاليًا، لن يكون لدى الرسائل الجديدة ID للحذف حتى يتم إعادة تحميل الصفحة  
        // تحتاج إلى آلية لتحديث ID الرسالة بعد إرسالها بنجاح لو أردت الحذف الفوري  
        const tempUserMessageId = 'temp_' + Date.now(); // ID مؤقت للعرض فقط  
        addMessage('user', userText, tempUserMessageId);  
        userInput.value = '';  
        userInput.focus();  
        showThinkingIndicator();  
  
        try {  
            // إرسال جزء من تاريخ المحادثة (آخر 10 مثلاً)  
            const messagesToSend = conversationHistory.slice(-11); // آخر 10 + الرسالة الجديدة  
             // التأكد من أن الرسالة الأولى دائمًا هي الـ system prompt إذا لم تكن ضمن الـ 10 الأخيرة  
            if (messagesToSend.length > 0 && messagesToSend[0].role !== 'system') {  
                 // يمكنك إضافة رسالة النظام هنا إذا أردت دائمًا إرسالها  
                 // messagesToSend.unshift({ role: "system", content: "System prompt here..." });  
            }  
  
  
            const isFreeModel = FREE_MODELS.includes(selectedModel);  
            const requestBody = {  
                model: selectedModel,  
                messages: messagesToSend,  
                temperature: 0.7,  
                max_tokens: isFreeModel ? 1024 : 2048  
            };  
  
            const response = await fetch(OPENROUTER_API_ENDPOINT, {  
                method: 'POST',  
                headers: {  
                    'Authorization': `Bearer ${apiKey}`,  
                    'Content-Type': 'application/json',  
                    'HTTP-Referer': window.location.origin, // مهم لـ OpenRouter  
                    'X-Title': 'DzTeck Chat' // اختياري  
                },  
                body: JSON.stringify(requestBody)  
            });  
  
            removeThinkingIndicator();  
  
            if (!response.ok) {  
                const errorData = await response.json().catch(() => null);  
                let errorMessage = `Error: ${response.status} ${response.statusText}`;  
                if (errorData && errorData.error && errorData.error.message) {  
                     errorMessage = errorData.error.message;  
                     // تحقق خاص من أخطاء المفتاح  
                    if (response.status === 401) {  
                         errorMessage = `مفتاح API غير صالح أو غير مصرح به. (${errorMessage})`;  
                     } else if (response.status === 402 || errorMessage.includes('quota') || errorMessage.includes('credits')) {  
                         errorMessage = `تم تجاوز الحصة أو الرصيد المتاح للمفتاح. (${errorMessage})`;  
                     }  
                 } else {  
                    // قراءة النص العادي إذا لم يكن JSON  
                    const textError = await response.text();  
                    errorMessage = `Error ${response.status}: ${textError || response.statusText}`;  
                }  
                throw new Error(errorMessage);  
            }  
  
            const data = await response.json();  
            const botReply = data.choices[0]?.message?.content;  
  
            if (botReply) {  
                // إضافة رد البوت (بدون ID للحذف مبدئيًا)  
                addMessage('bot', botReply.trim());  
            } else {  
                addMessage('bot', 'لم يتم استقبال رد من النموذج.');  
            }  
  
            // !!! هنا يمكنك إرسال المحادثة إلى الخادم لحفظها إذا لزم الأمر !!!  
            // await saveConversationToServer(conversationHistory);  
  
        } catch (error) {  
            console.error('Error during sendMessage:', error);  
            removeThinkingIndicator();  
            // عرض رسالة الخطأ للمستخدم  
            addMessage('bot', `حدث خطأ: ${error.message}`);  
        }  
    }  
  
    // --- *** منطق حذف الرسائل *** ---  
    if (chatBox && currentChatId && currentChatId !== 'new') { // التأكد من وجود chatBox و ID محادثة صالح  
        chatBox.addEventListener('click', function(event) {  
            const deleteButton = event.target.closest('.delete-msg-btn');  
  
            if (deleteButton) {  
                // محاولة الحصول على ID الرسالة من data-message-id في العنصر الأب .message  
                 const messageElement = deleteButton.closest('.message');  
                 const messageId = messageElement?.dataset.messageId;  
  
  
                // التحقق من أن ID ليس مؤقتًا أو غير معروف  
                if (messageId && !messageId.startsWith('temp_') && messageId !== 'unknown' && messageElement) {  
                    if (confirm('هل أنت متأكد أنك تريد حذف هذه الرسالة؟')) {  
                        console.log(`Requesting delete for chat ${currentChatId}, message ${messageId}`);  
  
                        // !!! استدعاء الخادم لحذف الرسالة !!!  
                        // !!! تأكد من أن هذا المسار صحيح في تطبيق Flask/Django لديك !!!  
                        fetch(`/delete_message/${currentChatId}/${messageId}`, {  
                            method: 'DELETE', // أو POST حسب تصميم API لديك  
                            headers: {  
                                'Content-Type': 'application/json',  
                                // أضف Headers أخرى إذا لزم الأمر (مثل CSRF Token)  
                                // 'X-CSRFToken': getCookie('csrftoken') // مثال لـ Django  
                            }  
                        })  
                        .then(response => {  
                             if (!response.ok) {  
                                // محاولة قراءة رسالة الخطأ من الخادم  
                                return response.json().catch(() => response.text()).then(err => {  
                                    throw new Error(typeof err === 'string' ? err : err.error || `فشل الحذف: ${response.status}`);  
                                });  
                             }  
                            // افترض أن الخادم يعيد JSON عند النجاح (يمكن تعديله)  
                            return response.json();  
                        })  
                        .then(data => {  
                             // افترض أن الخادم يعيد { success: true } أو ما شابه  
                            if (data.success !== false) { // تحقق مرن  
                                console.log('Message deleted successfully on server.');  
                                // إزالة الرسالة من الواجهة ومن التاريخ المحلي  
                                messageElement.remove();  
                                conversationHistory = conversationHistory.filter(msg => msg.messageId !== messageId); // تحتاج لإضافة messageId للتاريخ عند التحميل لو أردت تحديثه  
                                // يمكنك إضافة إشعار نجاح صغير  
                            } else {  
                                throw new Error(data.error || 'فشل الحذف من الخادم.');  
                            }  
                        })  
                        .catch(error => {  
                            console.error('Error deleting message:', error);  
                            alert(`حدث خطأ أثناء حذف الرسالة: ${error.message}`);  
                        });  
                    }  
                } else if (messageId && messageId.startsWith('temp_')) {  
                    console.warn('Cannot delete unsaved message.');  
                    alert('لا يمكن حذف هذه الرسالة لأنها لم تحفظ بعد.');  
                } else {  
                    console.warn('Could not find valid message ID for deletion.');  
                }  
            }  
        });  
    } else {  
         if (currentChatId === 'new') {  
             console.info("Delete functionality disabled for new chats.");  
         } else {  
             console.warn("Chat box or chat ID not found, delete functionality disabled.");  
         }  
    }  
    // --- *** نهاية منطق حذف الرسائل *** ---  
  
}); // نهاية DOMContentLoaded اريد العمل على تطوير ملفات تطبيق وتغير الشكل وحفض سجل الدراسات مثل تطبيق chat gpt في قائمة منسدلة 
