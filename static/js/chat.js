// static/js/chat.js

document.addEventListener('DOMContentLoaded', () => {
    // --- عناصر DOM ---
    const chatArea = document.getElementById('chat-area');
    const messageInput = document.getElementById('message-input') as HTMLInputElement;
    const sendButton = document.getElementById('send-button');
    const typingIndicator = document.getElementById('typing-indicator');
    const chatEnd = document.getElementById('chat-end');
    const micButton = document.getElementById('mic-button');
    const micLevelIndicator = document.getElementById('mic-level-indicator');
    const sttStatus = document.getElementById('stt-status');
    const ttsStatus = document.getElementById('tts-status');
    const themeToggle = document.getElementById('theme-toggle');
    const themeIconLight = document.querySelector('.theme-icon-light');
    const themeIconDark = document.querySelector('.theme-icon-dark');
    const themeText = document.querySelector('.theme-text');
    const temperatureSlider = document.getElementById('temperature-slider') as HTMLInputElement;
    const temperatureValue = document.getElementById('temperature-value');
    const maxTokensInput = document.getElementById('max-tokens-input') as HTMLInputElement;
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    const searchBar = document.getElementById('search-bar');
    const searchToggleBtn = document.getElementById('search-toggle-btn');
    const chatList = document.querySelector('.chat-dropdown-list');
    const sidebarChatListContainer = document.querySelector('.sidebar-chat-list-container'); // حاوية قائمة المحادثات

    // --- بيانات المحادثة الحالية ---
    const chatIdMeta = document.querySelector('meta[name="chat-id"]');
    const chatModelMeta = document.querySelector('meta[name="chat-model"]');
    const CHAT_ID = chatIdMeta ? chatIdMeta.getAttribute('content') : null;
    const CHAT_MODEL = chatModelMeta ? chatModelMeta.getAttribute('content') : 'unknown';

    // --- حالة التطبيق ---
    let isLoading = false;
    let isListening = false;
    let currentSpeechUtterance: SpeechSynthesisUtterance | null = null;
    let currentSpeakingMessageId: string | null = null;
    let recognition: SpeechRecognition | null = null;
    let micLevelInterval: NodeJS.Timeout | null = null;
    let autoSaveTimeout: NodeJS.Timeout | null = null;

    // --- تهيئة Web Speech API ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const synthesis = window.speechSynthesis;
    const recognitionSupported = !!SpeechRecognition;
    const synthesisSupported = !!synthesis;

    // --- وظائف الواجهة ---
    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        // تأخير بسيط للسماح للـ DOM بالتحديث قبل التمرير
        setTimeout(() => chatEnd?.scrollIntoView({ behavior: behavior, block: 'end' }), 50);
    };

    const setLoadingState = (loading: boolean) => {
        isLoading = loading;
        const sendIcon = sendButton?.querySelector('.fa-paper-plane');
        const loadingIcon = sendButton?.querySelector('.loading-icon');

        if (sendButton) sendButton.disabled = loading || !messageInput?.value.trim();
        if (messageInput) messageInput.disabled = loading || isListening;
        if (micButton) micButton.disabled = loading;
        typingIndicator?.classList.toggle('hidden', !loading);

        if (loading) {
            sendIcon?.classList.add('hidden');
            loadingIcon?.classList.remove('hidden');
        } else {
            loadingIcon?.classList.add('hidden');
            sendIcon?.classList.remove('hidden');
        }
        if (!loading) scrollToBottom();
    };

    const addMessageToUI = (role: 'user' | 'ai' | 'error', text: string, messageId?: number | string) => {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-message', 'flex', role === 'user' ? 'justify-end' : 'justify-start');
        const uniqueId = messageId || `temp-${Date.now()}-${Math.random()}`; // ID مؤقت إذا لم يأت من الخادم
        messageDiv.dataset.messageId = String(uniqueId);

        const bubble = document.createElement('div');
        bubble.classList.add(
            'message-bubble', role, // إضافة كلاس الدور
            'max-w-[85%]', 'sm:max-w-[80%]', 'md:max-w-[75%]',
            'px-4', 'py-3', 'rounded-xl', 'shadow-md', 'relative', 'group'
        );
        // تطبيق الألوان والحواف بناءً على الدور
        if (role === 'user') bubble.classList.add('bg-blue-600', 'text-white', 'rounded-br-none');
        else if (role === 'error') bubble.classList.add('bg-red-700', 'text-white', 'rounded-bl-none');
        else bubble.classList.add('bg-slate-700', 'text-zinc-100', 'rounded-bl-none');


        const content = document.createElement('p');
        content.classList.add('whitespace-pre-wrap', 'leading-relaxed');
        content.textContent = text;
        bubble.appendChild(content);

        if (role === 'ai' || role === 'error') {
            const actionsDiv = createMessageActions(role, text, String(uniqueId));
            bubble.appendChild(actionsDiv);
        }

        messageDiv.appendChild(bubble);
        chatArea?.insertBefore(messageDiv, typingIndicator);
        scrollToBottom();
        saveChatLocally(); // حفظ تلقائي بعد إضافة رسالة
    };

    const createMessageActions = (role: 'ai' | 'error', text: string, messageId: string): HTMLDivElement => {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions mt-2 pt-1.5 border-t border-white/10 flex items-center justify-end gap-x-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200';
        actionsDiv.dir = 'ltr';

        if (role === 'ai') {
            // زر إعادة التوليد
            const regenButton = document.createElement('button');
            regenButton.className = 'regenerate-btn p-1.5 rounded-full hover:bg-white/20 text-gray-400 hover:text-white transition-colors';
            regenButton.title = 'إعادة توليد الرد';
            regenButton.innerHTML = '<i class="fas fa-sync-alt fa-xs"></i>';
            regenButton.onclick = () => regenerateLastResponse();
            actionsDiv.appendChild(regenButton);

            // زر النطق (إذا كان مدعومًا)
            if (synthesisSupported) {
                const speakButton = document.createElement('button');
                speakButton.className = 'speak-btn p-1.5 rounded-full hover:bg-white/20 text-gray-400 hover:text-white transition-colors';
                speakButton.title = 'نطق الرد';
                speakButton.innerHTML = '<i class="fas fa-volume-up fa-xs"></i>';
                speakButton.onclick = () => handleSpeak(text, messageId);
                actionsDiv.appendChild(speakButton);
            }
        }

        // زر النسخ
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-btn p-1.5 rounded-full hover:bg-white/20 text-gray-400 hover:text-white transition-colors';
        copyButton.title = 'نسخ النص';
        copyButton.innerHTML = '<i class="fas fa-copy fa-xs copy-icon"></i><i class="fas fa-check fa-xs text-green-400 hidden check-icon"></i>';
        copyButton.onclick = (e) => handleCopy(e.currentTarget as HTMLButtonElement, text);
        actionsDiv.appendChild(copyButton);

        return actionsDiv;
    };

    // --- وظائف API ---
    const sendMessageToServer = async () => {
        const messageText = messageInput.value.trim();
        if (!messageText || isLoading || !CHAT_ID) return;

        addMessageToUI('user', messageText);
        messageInput.value = '';
        setLoadingState(true);
        if (isSpeaking) cancelSpeech(); // إيقاف النطق عند الإرسال

        try {
            const response = await fetch(`/api/chat/${CHAT_ID}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageText,
                    temperature: parseFloat(temperatureSlider?.value || '0.7'),
                    max_tokens: parseInt(maxTokensInput?.value || '500')
                }),
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                addMessageToUI('error', data.reply || data.error || 'حدث خطأ غير معروف');
            } else {
                addMessageToUI('ai', data.reply, data.message_id);
                if (localStorage.getItem('autoSpeak') !== 'false' && synthesisSupported) {
                    handleSpeak(data.reply, data.message_id);
                }
            }
        } catch (error) {
            console.error('Send message error:', error);
            addMessageToUI('error', 'فشل الاتصال بالخادم.');
        } finally {
            setLoadingState(false);
        }
    };

    const regenerateLastResponse = async () => {
        if (isLoading || !CHAT_ID) return;

        const aiMessages = chatArea?.querySelectorAll('.chat-message .message-bubble.ai');
        const lastAiMessageBubble = aiMessages ? aiMessages[aiMessages.length - 1] : null;
        const lastAiMessageDiv = lastAiMessageBubble?.closest('.chat-message');
        const lastAiMessageId = lastAiMessageDiv?.getAttribute('data-message-id');

        if (!lastAiMessageDiv || !lastAiMessageId) {
            alert("لا توجد رسالة سابقة لإعادة توليدها.");
            return;
        }

        setLoadingState(true);
        lastAiMessageDiv.classList.add('opacity-50'); // تعتيم الرسالة القديمة

        try {
            const response = await fetch(`/api/regenerate/${CHAT_ID}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                    temperature: parseFloat(temperatureSlider?.value || '0.7'),
                    max_tokens: parseInt(maxTokensInput?.value || '500')
                }),
            });
            const data = await response.json();

            lastAiMessageDiv.remove(); // إزالة الرسالة القديمة بعد استلام الرد

            if (!response.ok || data.error) {
                addMessageToUI('error', data.reply || data.error || 'فشلت إعادة التوليد.');
            } else {
                addMessageToUI('ai', data.reply, data.message_id);
                 if (localStorage.getItem('autoSpeak') !== 'false' && synthesisSupported) {
                    handleSpeak(data.reply, data.message_id);
                }
            }
        } catch (error) {
            console.error('Regenerate error:', error);
            addMessageToUI('error', 'فشل الاتصال لإعادة التوليد.');
            lastAiMessageDiv.classList.remove('opacity-50'); // إعادة إظهار الرسالة القديمة عند الفشل
        } finally {
            setLoadingState(false);
        }
    };

    // --- وظائف الأزرار الإضافية ---
    const handleCopy = (button: HTMLButtonElement, text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            const copyIcon = button.querySelector('.copy-icon');
            const checkIcon = button.querySelector('.check-icon');
            copyIcon?.classList.add('hidden');
            checkIcon?.classList.remove('hidden');
            setTimeout(() => {
                copyIcon?.classList.remove('hidden');
                checkIcon?.classList.add('hidden');
            }, 1500);
        }).catch(err => console.error('Copy failed:', err));
    };

    const handleSpeak = (text: string, messageId: string | number) => {
        if (!synthesisSupported) return;
        const msgIdStr = String(messageId);

        // إيقاف النطق الحالي
        if (synthesis.speaking) {
            synthesis.cancel(); // سيؤدي هذا إلى تفعيل onend للutterance السابق
        }

        // إذا كان النقر على نفس زر النطق مرة أخرى، فقط أوقف
        if (isSpeaking && currentSpeakingMessageId === msgIdStr) {
            return; // cancel() تم استدعاؤها بالفعل
        }

        const utterance = new SpeechSynthesisUtterance(text);
        const voices = synthesis.getVoices();
        let arabicVoice = voices.find(v => v.lang.startsWith('ar') && v.name.includes('Female') && !v.localService);
        if (!arabicVoice) arabicVoice = voices.find(v => v.lang.startsWith('ar') && !v.localService);
        if (!arabicVoice) arabicVoice = voices.find(v => v.lang.startsWith('ar') && v.name.includes('Female'));
        if (!arabicVoice) arabicVoice = voices.find(v => v.lang.startsWith('ar'));
        if (arabicVoice) { utterance.voice = arabicVoice; utterance.lang = arabicVoice.lang; }
        else { utterance.lang = 'ar-SA'; }
        utterance.rate = 1.0; utterance.pitch = 1.0;

        currentSpeechUtterance = utterance;
        currentSpeakingMessageId = msgIdStr;

        // إزالة التمييز من الرسائل الأخرى وتطبيق التمييز على الحالية
        document.querySelectorAll('.message-bubble.speaking').forEach(el => el.classList.remove('speaking', 'ring-2', 'ring-brand-blue'));
        const currentMsgBubble = chatArea?.querySelector(`.chat-message[data-message-id="${msgIdStr}"] .message-bubble`);
        currentMsgBubble?.classList.add('speaking', 'ring-2', 'ring-brand-blue');

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
            setIsSpeaking(false);
            currentSpeechUtterance = null;
            currentSpeakingMessageId = null;
            currentMsgBubble?.classList.remove('speaking', 'ring-2', 'ring-brand-blue');
        };
        utterance.onerror = (e) => {
            console.error("TTS Error:", e);
            setIsSpeaking(false); currentSpeechUtterance = null; currentSpeakingMessageId = null;
            currentMsgBubble?.classList.remove('speaking', 'ring-2', 'ring-brand-blue');
            alert("حدث خطأ أثناء تشغيل الصوت.");
        };

        synthesis.speak(utterance);
    };

    // --- وظائف STT (Web Speech API) ---
    const startListening = () => {
        if (!recognition || isListening || isLoading) return;
        if (isSpeaking) cancelSpeech(); // إيقاف النطق قبل الاستماع
        try {
            recognition.start();
        } catch (e) {
            console.error("STT Start Error:", e);
            alert("لم يتمكن من بدء التعرف على الصوت. قد تحتاج إلى منح الإذن أولاً.");
        }
    };

    const stopListening = () => {
        if (recognition && isListening) {
            recognition.stop();
        }
    };

    // --- إعداد STT ---
    if (recognitionSupported) {
        recognition = new SpeechRecognition();
        recognition.lang = 'ar-SA';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            isListening = true;
            micButton?.classList.add('bg-red-600', 'hover:bg-red-700', 'animate-mic-pulse');
            micButton?.classList.remove('bg-purple-700', 'hover:bg-purple-800');
            micButton?.querySelector('i')?.classList.replace('fa-microphone', 'fa-stop');
            messageInput.placeholder = 'جاري الاستماع...';
            messageInput.disabled = true;
            if (micLevelIndicator) micLevelInterval = setInterval(() => {
                micLevelIndicator.style.transform = `scaleY(${Math.random()})`;
            }, 150);
        };

        recognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript.trim();
            messageInput.value = transcript;
            // إرسال تلقائي بعد التعرف
            if (transcript) sendMessageToServer();
        };

        recognition.onerror = (event) => {
            console.error('STT Error:', event.error);
            let errorMsg = `خطأ STT: ${event.error}`;
            if (event.error === 'no-speech') errorMsg = 'لم يتم اكتشاف كلام.';
            if (event.error === 'not-allowed') errorMsg = 'تم رفض إذن الميكروفون.';
            alert(errorMsg); // إبلاغ المستخدم
        };

        recognition.onend = () => {
            isListening = false;
            micButton?.classList.remove('bg-red-600', 'hover:bg-red-700', 'animate-mic-pulse');
            micButton?.classList.add('bg-purple-700', 'hover:bg-purple-800');
            micButton?.querySelector('i')?.classList.replace('fa-stop', 'fa-microphone');
            messageInput.placeholder = 'اكتب رسالتك هنا...';
            messageInput.disabled = isLoading;
            if (micLevelInterval) clearInterval(micLevelInterval);
            micLevelIndicator?.style.setProperty('transform', 'scaleY(0)');
            if (!isLoading) messageInput.focus();
        };
    } else {
        micButton?.classList.add('hidden');
        sttStatus?.classList.remove('hidden');
    }

    if (!synthesisSupported) {
        ttsStatus?.classList.remove('hidden');
        // لا حاجة لتعطيل الأزرار هنا لأنها تضاف ديناميكيًا مع التحقق
    }

    // --- البحث ---
    searchToggleBtn?.addEventListener('click', () => {
        searchBar?.classList.toggle('hidden');
        if (!searchBar?.classList.contains('hidden')) searchInput?.focus();
        else { searchInput.value = ''; filterMessages(''); }
    });
    searchInput?.addEventListener('input', (e) => filterMessages((e.target as HTMLInputElement).value));

    const filterMessages = (searchTerm: string) => {
        const term = searchTerm.toLowerCase().trim();
        chatArea?.querySelectorAll('.chat-message').forEach(msgElement => {
            const textContent = msgElement.querySelector('.message-bubble p')?.textContent?.toLowerCase() || '';
            msgElement.classList.toggle('hidden', !(term === '' || textContent.includes(term)));
        });
        scrollToBottom('auto'); // تمرير فوري عند البحث
    };

    // --- إدارة المحادثات (الشريط الجانبي) ---
    chatList?.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const chatItem = target.closest('.chat-dropdown-item');
        if (!chatItem) return;
        const chatId = chatItem.getAttribute('data-chat-id');
        if (!chatId) return;

        if (target.closest('.rename-chat-btn')) {
            e.preventDefault();
            const currentTitleElement = chatItem.querySelector('a');
            const currentTitle = currentTitleElement?.textContent?.trim() || '';
            const newTitle = prompt("أدخل العنوان الجديد:", currentTitle);
            if (newTitle && newTitle.trim() && newTitle !== currentTitle) {
                fetch(`/api/chats/${chatId}/rename`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: newTitle.trim() })
                })
                .then(res => res.ok ? res.json() : Promise.reject(res))
                .then(data => { if (currentTitleElement) currentTitleElement.textContent = data.new_title; if (CHAT_ID === chatId) document.title = `${data.new_title} - ياسمين GPT`; })
                .catch(async err => { const error = await err.json().catch(()=>({})); alert(`فشل إعادة التسمية: ${error.error || err.statusText}`); });
            }
        } else if (target.closest('.delete-chat-btn')) {
            e.preventDefault();
            if (confirm("هل أنت متأكد من حذف المحادثة؟")) {
                fetch(`/api/chats/${chatId}/delete`, { method: 'POST' })
                .then(res => res.ok ? res.json() : Promise.reject(res))
                .then(() => { chatItem.remove(); if (CHAT_ID === chatId) window.location.href = '/'; })
                .catch(async err => { const error = await err.json().catch(()=>({})); alert(`فشل الحذف: ${error.error || err.statusText}`); });
            }
        }
    });

    // --- ربط الأحداث الرئيسية ---
    sendButton?.addEventListener('click', sendMessageToServer);
    messageInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessageToServer(); } });
    micButton?.addEventListener('click', () => { if (isListening) stopListening(); else startListening(); });

    // --- إضافة مستمعي الأحداث للأزرار الديناميكية ---
    chatArea?.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const messageDiv = target.closest('.chat-message');
        const messageId = messageDiv?.getAttribute('data-message-id');
        const text = messageDiv?.querySelector('.message-bubble p')?.textContent || '';

        if (target.closest('.copy-btn') && messageId) {
            handleCopy(target.closest('.copy-btn') as HTMLButtonElement, text);
        } else if (target.closest('.speak-btn') && messageId) {
            handleSpeak(text, messageId);
        } else if (target.closest('.regenerate-btn') && messageId) {
            regenerateLastResponse();
        }
    });

    // --- الحفظ التلقائي للإعدادات (عند التغيير) ---
    // (تم ربطها مباشرة بـ event listeners الخاصة بالمدخلات)

    // --- التحميل الأولي ---
    if (chatArea) { // تأكد من وجود منطقة الدردشة قبل التمرير
        scrollToBottom('auto'); // تمرير فوري عند التحميل
    }
    messageInput?.focus();

}); // نهايةDOMContentLoaded
