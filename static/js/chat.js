document.addEventListener('DOMContentLoaded', () => {
  const chatBox = document.getElementById('chat-box');
  const userInput = document.getElementById('user-input');
  const sendButton = document.getElementById('send-button');
  const apiKeyInput = document.getElementById('api-key');
  const modelName = document.getElementById('model-name')?.value;
  const chatId = document.getElementById('chat-id')?.value;
  const tempSlider = document.getElementById('temperature');
  const maxTokenInput = document.getElementById('max-tokens');
  const exportBtn = document.getElementById('export-chat-btn');
  const darkToggle = document.getElementById('toggle-dark-mode');
  const searchInput = document.getElementById('search-chat');

  let history = [];

  function addMessage(role, content, silent = false) {
    const msg = document.createElement('div');
    msg.classList.add('message', role === 'user' ? 'user-message' : 'bot-message');
    msg.innerHTML = content.replace(/\n/g, '<br>');

    if (role === 'assistant') {
      const copy = document.createElement('button');
      copy.className = 'copy-btn';
      copy.innerHTML = '<i class="fas fa-copy"></i>';
      copy.onclick = () => {
        navigator.clipboard.writeText(msg.textContent);
        alert("تم نسخ الرد!");
      };

      const regen = document.createElement('button');
      regen.className = 'regenerate-btn';
      regen.innerHTML = '<i class="fas fa-sync"></i>';
      regen.onclick = () => {
        history.pop();
        sendToAPI();
        msg.remove();
      };

      const speak = document.createElement('button');
      speak.className = 'speak-btn';
      speak.innerHTML = '<i class="fas fa-volume-up"></i>';
      speak.onclick = () => {
        const u = new SpeechSynthesisUtterance(msg.textContent);
        u.lang = 'ar-SA';
        speechSynthesis.speak(u);
      };

      msg.appendChild(copy);
      msg.appendChild(regen);
      msg.appendChild(speak);
    }

    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;

    if (!silent) {
      history.push({ role, content });
      localStorage.setItem(`yasmin_chat_${chatId}`, JSON.stringify(history));
    }
  }

  function sendToAPI() {
    const text = userInput.value.trim();
    if (!text || !apiKeyInput.value) return;
    addMessage('user', text);
    userInput.value = '';

    addMessage('assistant', '...');

    fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKeyInput.value}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': location.origin,
        'X-Title': 'Yasmin GPT Chat v1'
      },
      body: JSON.stringify({
        model: modelName,
        messages: [...history, { role: 'user', content: text }],
        temperature: parseFloat(tempSlider.value),
        max_tokens: parseInt(maxTokenInput.value)
      })
    })
    .then(res => res.json())
    .then(data => {
      chatBox.lastChild.remove();
      const reply = data.choices?.[0]?.message?.content || "لا يوجد رد.";
      addMessage('assistant', reply);
    });
  }

  sendButton.addEventListener('click', sendToAPI);

  // الوضع الليلي
  darkToggle?.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('yasmin_dark', document.body.classList.contains('dark-mode'));
  });
  if (localStorage.getItem('yasmin_dark') === 'true') {
    document.body.classList.add('dark-mode');
  }

  // التصدير
  exportBtn?.addEventListener('click', () => {
    const text = history.map(m => `${m.role}: ${m.content}`).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `yasmin-chat-${Date.now()}.txt`;
    a.click();
  });

  // البحث
  searchInput?.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase();
    document.querySelectorAll('.message').forEach(m => {
      m.style.display = m.textContent.toLowerCase().includes(q) ? 'block' : 'none';
    });
  });

  // تحميل المحادثة
  const saved = localStorage.getItem(`yasmin_chat_${chatId}`);
  if (saved) {
    JSON.parse(saved).forEach(m => addMessage(m.role, m.content, true));
    history = JSON.parse(saved);
  }
});
