document.addEventListener('DOMContentLoaded', () => {
    // --- عناصر الواجهة ---
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const modelSelect = document.getElementById('model-select-chat');
    const conversationListElement = document.getElementById('conversation-list-chat');
    const newChatButtonSidebar = document.getElementById('new-chat-button-sidebar');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const exportChatButton = document.getElementById('export-chat-button');
    const chatTitleElement = document.getElementById('chat-title');
    const temperatureInput = document.getElementById('temperature-input');
    const temperatureValue = document.getElementById('temperature-value');
    const maxTokensInput = document.getElementById('max-tokens-input');
    const searchInput = document.getElementById('search-input');
    const currentModelDisplay = document.getElementById('current-model-display');
    const sidebar = document.querySelector('.sidebar'); // للتحكم في الفتح/الإغلاق مستقبلاً

    // --- إعدادات API ---
    const OPENROUTER_API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
    let apiKey = localStorage.getItem('chatdz_apiKey') || ''; // تحميل مفتاح API

    // --- إدارة الحالة ---
    let allConversations = [];
    let currentConversationId = null;
    let currentConversation = null;
    let thinkingIndicator = null;
    let searchDebounceTimer;

    // --- إعدادات Text-to-Speech ---
    const synth = window.speechSynthesis;
    let currentUtterance = null;

    // --- التحميل الأولي ---
    function initializeChat() {
        if (!apiKey) {
             alert("لم يتم العثور على مفتاح OpenRouter API. يرجى العودة إلى الصفحة الرئيسية وإدخاله.");
             // يمكن إعادة التوجيه للصفحة الرئيسية
             // window.location.href = 'index.html';
             chatTitleElement.textContent = "خطأ: مفتاح API غير موجود";
             disableInput(true); // تعطيل كل شيء
             return;
        }

        loadDarkModePreference();
        allConversations = loadConversationsFromStorage();

        // الحصول على ID المحادثة من URL
        const urlParams = new URLSearchParams(window.location.search);
        const requestedId = urlParams.get('id');

        if (!requestedId || !allConversations.some(c => c.id == requestedId)) {
            console.error(`Conversation ID "${requestedId}" not found or invalid.`);
            // حاول الانتقال إلى أحدث محادثة أو العودة للرئيسية
             const latestConv = getLatestConversation();
             if (latestConv) {
                 switchConversation(latestConv.id, true); // true لتحديث URL
             } else {
                 chatTitleElement.textContent = "لم يتم العثور على المحادثة";
                 alert("لم يتم العثور على المحادثة المطلوبة. سيتم البدء بمحادثة جديدة.");
                 startNewChat(); // ابدأ محادثة جديدة إذا لم يوجد شيء
                 // أو أعد التوجيه: window.location.href = 'index.html';
             }
            return; // توقف التنفيذ الحالي لأن switchConversation أو startNewChat سيعيد التحميل
        }

        // تعيين المحادثة الحالية
        currentConversationId = requestedId;
        currentConversation = allConversations.find(c => c.id == currentConversationId);

        if (!currentConversation) {
             console.error("Unexpected error: Conversation object not found despite ID match.");
             chatTitleElement.textContent = "خطأ في تحميل المحادثة";
             return;
        }

        console.log("Current Conversation ID:", currentConversationId);
        console.log("Current Conversation Data:", currentConversation);


        // تحديث الواجهة
        renderSidebar(); // عرض القائمة الجانبية وتحديد العنصر النشط
        loadConversationData(); // تحميل عنوان ورسائل وإعدادات المحادثة الحالية
        setupEventListeners();
        adjustTextareaHeight();
    }

    // --- وظائف إدارة المحادثات (تشبه script.js لكن بتفاعل داخل chat.html) ---

    function loadConversationsFromStorage() {
        const saved = localStorage.getItem('chatdz_conversations');
        try {
            const parsed = saved ? JSON.parse(saved) : [];
            // التأكد من أن كل محادثة لديها كائن إعدادات صالح
            parsed.forEach(conv => {
                if (!conv.settings || typeof conv.settings !== 'object') {
                    conv.settings = { model: 'mistralai/mistral-7b-instruct-v0.2', temperature: 0.7, max_tokens: 512 };
                }
                 // تأكد من وجود الرسائل كـ array
                if (!Array.isArray(conv.messages)) {
                    conv.messages = [{ role: 'assistant', content: 'مرحباً! كيف يمكنني مساعدتك اليوم؟' }];
                }
            });
            return parsed;
        } catch (e) {
            console.error("Failed to parse conversations:", e);
            return [];
        }
    }

    function saveConversationsToStorage() {
        try {
            localStorage.setItem('chatdz_conversations', JSON.stringify(allConversations));
        } catch (e) {
            console.error("Failed to save conversations:", e);
        }
    }

    function getLatestConversation() {
        if (allConversations.length === 0) return null;
         return [...allConversations].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    }

    function switchConversation(newId, replaceHistory = false) {
         console.log(`Switching to conversation ${newId}`);
         const newUrl = `chat.html?id=${newId}`;
         if (replaceHistory) {
             window.history.replaceState({ id: newId }, '', newUrl); // تحديث URL بدون إضافة للتاريخ
         } else {
             window.location.href = newUrl; // إعادة تحميل الصفحة للمحادثة الجديدة
         }
          // الكود التالي سينفذ بعد إعادة التحميل في initializeChat
         // currentConversationId = newId;
         // currentConversation = allConversations.find(c => c.id == currentConversationId);
         // renderSidebar();
         // loadConversationData();
    }

    function startNewChat() {
         const newConv = createNewConversationObject(); // استخدام دالة إنشاء جديدة هنا
         allConversations.unshift(newConv);
         saveConversationsToStorage();
         // الانتقال الفوري للمحادثة الجديدة
         switchConversation(newConv.id, true); // تحديث URL بدون سجل تصفح جديد
         // إعادة تهيئة الواجهة للمحادثة الجديدة مباشرة
         currentConversationId = newConv.id;
         currentConversation = newConv;
         renderSidebar();
         loadConversationData();
    }

     function createNewConversationObject() {
        // يمكن استخدام النموذج المحدد في الإعدادات الحالية كأساس
        const baseModel = modelSelect.value || 'mistralai/mistral-7b-instruct-v0.2';
        const newId = Date.now().toString();
        return {
            id: newId,
            title: `محادثة (${new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit'})})`,
            messages: [{ role: "assistant", content: "مرحباً! كيف يمكنني مساعدتك اليوم؟" }],
            createdAt: new Date().toISOString(),
            settings: {
                model: baseModel,
                temperature: parseFloat(temperatureInput.value) || 0.7,
                max_tokens: parseInt(maxTokensInput.value) || 512
            }
        };
    }


    function loadConversationData() {
        if (!currentConversation) return;
        chatTitleElement.textContent = currentConversation.title || 'محادثة بدون عنوان';
        renderChatMessages(currentConversation.messages);
        loadConversationSettings(currentConversation.settings);
        searchInput.value = ''; // مسح البحث عند تحميل محادثة
        clearSearchHighlights();
    }

    function addMessageToCurrentConversation(role, content) {
        if (!currentConversation) return;
        const message = { role, content, timestamp: new Date().toISOString() }; // إضافة timestamp اختياري
        currentConversation.messages.push(message);
        // تحديث عنوان المحادثة بعد أول رسالة مستخدم
        if (role === 'user' && currentConversation.messages.length === 2) {
             const newTitle = content.substring(0, 35) + (content.length > 35 ? "..." : "");
             updateConversationTitle(currentConversation.id, newTitle);
        }
        saveConversationsToStorage(); // الحفظ التلقائي
    }

     function updateConversationTitle(convId, newTitle) {
        const conv = allConversations.find(c => c.id == convId);
        if (conv) {
            conv.title = newTitle;
            if (convId == currentConversationId) {
                chatTitleElement.textContent = newTitle; // تحديث العنوان في الواجهة فورًا
            }
            saveConversationsToStorage();
            renderSidebar(); // تحديث القائمة الجانبية بالعنوان الجديد
        }
    }

    function handleDeleteConversation(convIdToDelete) {
         if (confirm(`هل أنت متأكد من حذف هذه المحادثة (${allConversations.find(c=>c.id==convIdToDelete)?.title || convIdToDelete})؟ لا يمكن التراجع عن هذا الإجراء.`)) {
             allConversations = allConversations.filter(conv => conv.id != convIdToDelete);
             saveConversationsToStorage();

             // إذا تم حذف المحادثة الحالية، انتقل إلى محادثة أخرى أو الرئيسية
             if (convIdToDelete == currentConversationId) {
                 const latestConv = getLatestConversation();
                 if (latestConv) {
                     switchConversation(latestConv.id, true); // انتقل للأحدث بدون سجل
                 } else {
                     // لا توجد محادثات أخرى، عد للصفحة الرئيسية
                     window.location.href = 'index.html';
                 }
             } else {
                 renderSidebar(); // فقط أعد رسم القائمة الجانبية إذا لم تكن الحالية
             }
         }
     }

     function handleRenameConversation(convIdToRename) {
         const conv = allConversations.find(c => c.id == convIdToRename);
         if (!conv) return;
         const currentTitle = conv.title || '';
         const newTitle = prompt("أدخل العنوان الجديد للمحادثة:", currentTitle);
         if (newTitle !== null && newTitle.trim() !== '' && newTitle !== currentTitle) {
             updateConversationTitle(convIdToRename, newTitle.trim());
         }
     }


    // --- وظائف الواجهة الرسومية (UI) ---

    function renderSidebar() {
        conversationListElement.innerHTML = ''; // مسح القائمة
        const sortedConversations = [...allConversations].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        sortedConversations.forEach(conv => {
            const li = document.createElement('li');
            li.dataset.id = conv.id;
            if (conv.id == currentConversationId) {
                li.classList.add('active');
            }

            const titleSpan = document.createElement('span');
            titleSpan.classList.add('conv-title');
            titleSpan.textContent = conv.title || 'محادثة بدون عنوان';
            titleSpan.title = conv.title || 'محادثة بدون عنوان'; // Tooltip

             // إضافة مستمع لتبديل المحادثة عند النقر على العنوان
             titleSpan.addEventListener('click', () => {
                if (conv.id !== currentConversationId) {
                    switchConversation(conv.id);
                }
             });

            const actionsDiv = document.createElement('div');
            actionsDiv.classList.add('conv-actions');

            const renameButton = document.createElement('button');
            renameButton.classList.add('rename-conv-button');
            renameButton.innerHTML = '✏️';
            renameButton.title = 'إعادة تسمية';
            renameButton.addEventListener('click', (e) => {
                e.stopPropagation(); // منع النقر على الـ li عند الضغط على الزر
                handleRenameConversation(conv.id);
            });

            const deleteButton = document.createElement('button');
            deleteButton.classList.add('delete-conv-button');
            deleteButton.innerHTML = '🗑️';
            deleteButton.title = 'حذف';
            deleteButton.addEventListener('click', (e) => {
                 e.stopPropagation();
                 handleDeleteConversation(conv.id);
            });

            actionsDiv.appendChild(renameButton);
            actionsDiv.appendChild(deleteButton);

            li.appendChild(titleSpan);
            li.appendChild(actionsDiv);
            conversationListElement.appendChild(li);
        });
    }

    function renderChatMessages(messages) {
        chatBox.innerHTML = ''; // مسح الرسائل القديمة
        if (!messages || messages.length === 0) {
             // يمكن عرض رسالة بديلة هنا إذا كانت المحادثة فارغة تمامًا
             const emptyMsgDiv = document.createElement('div');
             emptyMsgDiv.textContent = "ابدأ بكتابة رسالة...";
             emptyMsgDiv.style.textAlign = 'center';
             emptyMsgDiv.style.padding = '20px';
             emptyMsgDiv.style.opacity = '0.5';
             chatBox.appendChild(emptyMsgDiv);
             return;
        }
        messages.forEach((msg, index) => addMessageToDOM(msg.role, msg.content, index));
        scrollToBottom();
    }

    function addMessageToDOM(sender, text, messageIndex) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
        messageDiv.dataset.index = messageIndex;

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');

        // دعم Markdown (استخدام marked.js)
        if (sender === 'assistant' && typeof marked === 'function') {
            try {
                // تنقية إضافية اختيارية قبل العرض (إذا كانت المكتبة لا تفعل ذلك بشكل كافٍ)
                // const sanitizedHtml = DOMPurify.sanitize(marked.parse(text || ''));
                // contentDiv.innerHTML = sanitizedHtml;
                contentDiv.innerHTML = marked.parse(text || ''); // استخدام مباشر
            } catch (e) {
                console.error("Error parsing Markdown:", e);
                contentDiv.textContent = text || ''; // عرض كنص عادي في حالة الخطأ
            }
        } else {
            contentDiv.textContent = text || '';
        }

        messageDiv.appendChild(contentDiv);

        // إضافة أزرار الإجراءات لرسائل البوت فقط (تجاهل رسالة الترحيب الأولى index=0)
        if (sender === 'assistant' && messageIndex > 0) {
            const actionsDiv = document.createElement('div');
            actionsDiv.classList.add('message-actions');
            actionsDiv.innerHTML = `
                <button class="action-button copy-button" title="نسخ">📋</button>
                <button class="action-button regenerate-button" title="إعادة توليد">🔄</button>
                <button class="action-button tts-button" title="تشغيل صوتي">🔊</button>
            `;
            messageDiv.appendChild(actionsDiv);
        }

        chatBox.appendChild(messageDiv);
    }

    // --- (وظائف UI أخرى مثل scrollToBottom, adjustTextareaHeight, show/removeThinkingIndicator, disableInput - استخدم نفس الكود من المثال السابق) ---
     function scrollToBottom() {
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function adjustTextareaHeight() {
        userInput.style.height = 'auto';
        const newHeight = Math.min(userInput.scrollHeight, 150); // حد أقصى للارتفاع 150px
        userInput.style.height = `${newHeight}px`;
    }

    function showThinkingIndicator() {
        if (thinkingIndicator) return;
        thinkingIndicator = document.createElement('div');
        // ... (نفس كود المؤشر السابق)
        thinkingIndicator.classList.add('message', 'bot-message', 'thinking');
        thinkingIndicator.dataset.index = currentConversation?.messages?.length || 0;
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        contentDiv.textContent = 'جار التفكير...';
        thinkingIndicator.appendChild(contentDiv);
        chatBox.appendChild(thinkingIndicator);
        scrollToBottom();
    }

    function removeThinkingIndicator() {
        if (thinkingIndicator) {
            thinkingIndicator.remove();
            thinkingIndicator = null;
        }
    }

    function disableInput(disabled) {
        userInput.disabled = disabled;
        sendButton.disabled = disabled;
        modelSelect.disabled = disabled;
        temperatureInput.disabled = disabled;
        maxTokensInput.disabled = disabled;
    }

    // --- وظائف API والمراسلة ---

    async function sendMessage() {
        const userText = userInput.value.trim();
        if (!userText || !currentConversation) return;
         if (!apiKey) {
             alert("مفتاح API غير موجود أو غير صالح. يرجى إضافته في الصفحة الرئيسية.");
             return;
         }

        // إضافة رسالة المستخدم
        const userMessageIndex = currentConversation.messages.length;
        addMessageToDOM('user', userText, userMessageIndex);
        addMessageToCurrentConversation('user', userText);
        userInput.value = '';
        adjustTextareaHeight();
        scrollToBottom();
        clearSearchHighlights(); // مسح التمييز عند إرسال رسالة جديدة

        showThinkingIndicator();
        disableInput(true);

        try {
            // استخدام سجل الرسائل للمحادثة الحالية وإعداداتها
            const messageHistory = currentConversation.messages.slice(1); // تجاهل الترحيب
            const requestBody = {
                model: currentConversation.settings.model,
                messages: messageHistory.map(m => ({ role: m.role, content: m.content })), // تأكد من التنسيق الصحيح
                temperature: currentConversation.settings.temperature,
                max_tokens: currentConversation.settings.max_tokens,
                // stream: false, // أو true إذا كنت تريد البث
            };

            console.log("Sending request:", requestBody);

            const response = await fetch(OPENROUTER_API_ENDPOINT, {
                method: 'POST',
                 headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'Chat DZ App',
                },
                body: JSON.stringify(requestBody)
            });

            removeThinkingIndicator();

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                 const errMsg = errorData?.error?.message || `API Error: ${response.status}`;
                 console.error("API Error Data:", errorData);
                 throw new Error(errMsg);
            }

            const data = await response.json();
            console.log("Received response:", data);
            const botReply = data.choices[0]?.message?.content;

            if (botReply) {
                const botMessageIndex = currentConversation.messages.length;
                addMessageToDOM('assistant', botReply.trim(), botMessageIndex);
                addMessageToCurrentConversation('assistant', botReply.trim());
                scrollToBottom();
            } else {
                throw new Error("لم يتم العثور على رد في الاستجابة.");
            }

        } catch (error) {
            console.error('Error sending message:', error);
            removeThinkingIndicator();
            addMessageToDOM('assistant', `حدث خطأ: ${error.message}`, currentConversation.messages.length);
            scrollToBottom();
        } finally {
            disableInput(false);
        }
    }

    // --- وظائف الإجراءات على الرسائل (copy, regenerate, speak - استخدم نفس الكود من المثال السابق) ---
    function handleMessageActions(event) {
        const button = event.target.closest('.action-button');
        if (!button || !currentConversation) return;

        const messageDiv = button.closest('.message');
        const messageIndex = parseInt(messageDiv.dataset.index);
         // التأكد من أن الفهرس صحيح وضمن حدود مصفوفة الرسائل
        if (isNaN(messageIndex) || messageIndex < 0 || messageIndex >= currentConversation.messages.length) {
             console.warn("Invalid message index for action:", messageIndex);
             return;
        }

        const message = currentConversation.messages[messageIndex];
        const messageContentElement = messageDiv.querySelector('.message-content');
        // محاولة أخذ المحتوى من كائن الرسالة أولاً، ثم من DOM كاحتياط
        const messageText = message?.content ?? messageContentElement?.textContent ?? '';

        if (button.classList.contains('copy-button')) {
            copyToClipboard(messageText);
        } else if (button.classList.contains('regenerate-button')) {
            regenerateResponse(messageIndex); // تمرير الفهرس الصحيح
        } else if (button.classList.contains('tts-button')) {
            speakText(messageText, button);
        }
    }

     function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            alert("تم نسخ النص!");
        }).catch(err => {
            console.error('Failed to copy: ', err);
            alert("فشل النسخ.");
        });
    }

    async function regenerateResponse(botMessageIndex) {
        if (!currentConversation || botMessageIndex < 1 || !apiKey) return; // لا يمكن إعادة توليد الترحيب
         if (!apiKey) {
             alert("مفتاح API غير موجود أو غير صالح.");
             return;
         }

        // إيجاد آخر رسالة مستخدم قبل هذه الرسالة
        let lastUserMessageIndex = -1;
        for (let i = botMessageIndex - 1; i >= 0; i--) {
            if (currentConversation.messages[i].role === 'user') {
                lastUserMessageIndex = i;
                break;
            }
        }
        if (lastUserMessageIndex === -1) return; // يجب أن يكون هناك رسالة مستخدم

         // إزالة رسالة البوت القديمة وكل ما بعدها
         currentConversation.messages.splice(botMessageIndex);
         renderChatMessages(currentConversation.messages); // عرض الرسائل المتبقية
         saveConversationsToStorage();

        showThinkingIndicator();
        disableInput(true);

        try {
            const messageHistory = currentConversation.messages.slice(1, lastUserMessageIndex + 1); // حتى رسالة المستخدم

             const requestBody = {
                model: currentConversation.settings.model,
                messages: messageHistory.map(m => ({ role: m.role, content: m.content })),
                temperature: currentConversation.settings.temperature,
                max_tokens: currentConversation.settings.max_tokens,
            };

             console.log("Regenerating request:", requestBody);

            const response = await fetch(OPENROUTER_API_ENDPOINT, { /* ... headers ... */
                 method: 'POST',
                 headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'Chat DZ App (Regen)',
                },
                 body: JSON.stringify(requestBody)
            });

            removeThinkingIndicator();

            if (!response.ok) {
                 const errorData = await response.json().catch(() => null);
                 const errMsg = errorData?.error?.message || `API Error: ${response.status}`;
                 throw new Error(errMsg);
            }

            const data = await response.json();
            const botReply = data.choices[0]?.message?.content;

            if (botReply) {
                 const newBotMessageIndex = currentConversation.messages.length; // الفهرس الجديد
                 addMessageToDOM('assistant', botReply.trim(), newBotMessageIndex);
                 addMessageToCurrentConversation('assistant', botReply.trim());
                 scrollToBottom();
            } else {
                 throw new Error("لم يتم العثور على رد في الاستجابة المعاد توليدها.");
            }

        } catch (error) {
            console.error('Error regenerating:', error);
            removeThinkingIndicator();
            addMessageToDOM('assistant', `خطأ في إعادة التوليد: ${error.message}`, currentConversation.messages.length);
            scrollToBottom();
        } finally {
            disableInput(false);
        }
    }

     function speakText(text, button) {
        // ... (نفس كود TTS السابق)
         if (!('speechSynthesis' in window)) {
            alert("المتصفح لا يدعم تحويل النص لصوت.");
            return;
        }
        if (synth.speaking) synth.cancel(); // إيقاف أي كلام سابق

        const plainText = text.replace(/```[\s\S]*?```/g, 'كود').replace(/`([^`]+)`/g, '$1').replace(/(\*|_){1,2}(.*?)\1{1,2}/g, '$2').replace(/\[(.*?)\]\(.*?\)/g, '$1');
        currentUtterance = new SpeechSynthesisUtterance(plainText);
        currentUtterance.lang = document.documentElement.lang || 'ar'; // استخدام لغة الصفحة أو العربية

        currentUtterance.onstart = () => button.textContent = '⏹️';
        currentUtterance.onend = () => button.textContent = '🔊';
        currentUtterance.onerror = (e) => {
            console.error('TTS Error:', e);
            button.textContent = '🔊';
            alert(`خطأ في تشغيل الصوت: ${e.error}`);
        };
        synth.speak(currentUtterance);
    }

    // --- وظائف البحث (نفس الكود السابق) ---
    function handleSearch() {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            const searchTerm = searchInput.value.trim().toLowerCase();
            clearSearchHighlights();
            if (searchTerm) {
                highlightSearchResults(searchTerm);
            }
        }, 300);
    }
     function clearSearchHighlights() {
        // الطريقة الأضمن هي إعادة رسم الرسائل
        if (currentConversation) renderChatMessages(currentConversation.messages);
        // أو إزالة الكلاس فقط (أقل دقة)
        // chatBox.querySelectorAll('.highlight').forEach(el => el.outerHTML = el.innerHTML);
     }
     function highlightSearchResults(term) {
        // ... (استخدم نفس دالة التمييز المعقدة من المثال السابق التي تستخدم TreeWalker)
        // ... أو طريقة أبسط باستخدام innerHTML (لكنها تدمر event listeners داخل الرسالة إذا وجدت)
         const regex = new RegExp(`(${term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
         chatBox.querySelectorAll('.message-content').forEach(contentEl => {
             // تنبيه: هذا يدمر أي عناصر HTML داخلية أخرى ويستبدلها بنص عادي + span
             // يجب استخدام TreeWalker للحفاظ على HTML الأصلي.
             const originalHTML = contentEl.innerHTML; // حفظ مؤقت (ليس الحل الأمثل)
             const newHTML = contentEl.textContent.replace(regex, `<span class="highlight">$1</span>`);
             if (newHTML !== contentEl.textContent) { // فقط إذا وجد تطابق
                 contentEl.innerHTML = newHTML;
             }
         });
     }

    // --- وظائف التصدير (نفس الكود السابق مع تعديل للحصول على المحادثة الحالية) ---
    function exportCurrentChat() {
        if (!currentConversation || currentConversation.messages.length <= 1) {
            alert("لا توجد رسائل كافية للتصدير.");
            return;
        }
        // ... (نفس كود التصدير السابق، تأكد من أنه يستخدم currentConversation)
        let chatContent = `محادثة: ${currentConversation.title}\n`;
        // ... (باقي معلومات التصدير) ...
        currentConversation.messages.forEach(msg => {
            const prefix = msg.role === 'user' ? 'أنت' : 'البوت';
            chatContent += `${prefix}: ${msg.content}\n\n`;
        });
        // ... (كود إنشاء وتنزيل الملف النصي TXT) ...
         const blob = new Blob([chatContent], { type: 'text/plain;charset=utf-8' });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         const safeTitle = (currentConversation.title || 'untitled').replace(/[^a-z0-9_\-ا-ي]/gi, '_').substring(0, 50);
         a.download = `ChatDZ_${safeTitle}.txt`;
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
         URL.revokeObjectURL(url);
    }

    // --- وظائف الوضع الليلي (نفس الكود السابق) ---
    function toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('chatdz_darkMode', isDarkMode);
        darkModeToggle.textContent = isDarkMode ? '☀️' : '🌙';
        darkModeToggle.title = isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي';
    }
    function loadDarkModePreference() {
        // ... (نفس كود تحميل تفضيل الوضع الليلي)
        const savedPreference = localStorage.getItem('chatdz_darkMode');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        let useDarkMode = savedPreference !== null ? savedPreference === 'true' : prefersDark;

        if (useDarkMode) {
            document.body.classList.add('dark-mode');
            darkModeToggle.textContent = '☀️';
            darkModeToggle.title = 'الوضع النهاري';
        } else {
            document.body.classList.remove('dark-mode');
             darkModeToggle.textContent = '🌙';
             darkModeToggle.title = 'الوضع الليلي';
        }
    }

    // --- وظائف الإعدادات ---
    function loadConversationSettings(settings) {
        if (!settings) settings = { model: 'mistralai/mistral-7b-instruct-v0.2', temperature: 0.7, max_tokens: 512 }; // افتراضيات

        modelSelect.value = settings.model || 'mistralai/mistral-7b-instruct-v0.2';
        temperatureInput.value = settings.temperature || 0.7;
        temperatureValue.textContent = temperatureInput.value;
        maxTokensInput.value = settings.max_tokens || 512;
        currentModelDisplay.textContent = modelSelect.options[modelSelect.selectedIndex]?.text || settings.model; // عرض اسم النموذج
    }

    function saveCurrentConversationSettings() {
        if (!currentConversation) return;
        currentConversation.settings = {
            model: modelSelect.value,
            temperature: parseFloat(temperatureInput.value),
            max_tokens: parseInt(maxTokensInput.value)
        };
        currentModelDisplay.textContent = modelSelect.options[modelSelect.selectedIndex]?.text || modelSelect.value;
        saveConversationsToStorage();
        console.log("Settings saved for current conversation:", currentConversation.settings);
    }

    // --- إعداد مستمعي الأحداث ---
    function setupEventListeners() {
        sendButton.addEventListener('click', sendMessage);
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        userInput.addEventListener('input', adjustTextareaHeight);
        newChatButtonSidebar.addEventListener('click', startNewChat);
        darkModeToggle.addEventListener('click', toggleDarkMode);
        exportChatButton.addEventListener('click', exportCurrentChat);
        chatBox.addEventListener('click', handleMessageActions); // تفويض الأحداث للأزرار الديناميكية

        // مستمعي أحداث الإعدادات
        modelSelect.addEventListener('change', saveCurrentConversationSettings);
        temperatureInput.addEventListener('input', () => {
            temperatureValue.textContent = temperatureInput.value;
            // الحفظ عند تغيير القيمة النهائية لتجنب الحفظ المتكرر أثناء السحب
        });
         temperatureInput.addEventListener('change', saveCurrentConversationSettings); // الحفظ عند الانتهاء من السحب
        maxTokensInput.addEventListener('change', saveCurrentConversationSettings);
        searchInput.addEventListener('input', handleSearch);

         // مستمع لتحديث URL عند تغيير حالة التصفح (للأمام/للخلف) - اختياري
         window.addEventListener('popstate', (event) => {
             console.log("Popstate event:", event.state);
             if (event.state && event.state.id) {
                 // أعد تحميل الواجهة للمعرف الموجود في الحالة
                 // هذا يتطلب إعادة هيكلة لتجنب إعادة تحميل الصفحة بالكامل
                 // switchConversation(event.state.id, true); // قد يسبب حلقة لا نهائية إذا لم يتم التعامل معه بحذر
                 window.location.reload(); // الحل الأبسط هو إعادة تحميل الصفحة
             }
         });
    }

    // --- بدء تشغيل التطبيق ---
    initializeChat();

});
