// static/js/chat.js
document.addEventListener('DOMContentLoaded', () => {
  const sendBtn = document.getElementById('send-button');
  const userInput = document.getElementById('user-input');
  const chatBox = document.getElementById('chat-box');

  sendBtn.addEventListener('click', () => {
    const text = userInput.value.trim();
    if (!text) return;

    // عرض رسالة المستخدم
    const userDiv = document.createElement('div');
    userDiv.className = 'message user-message';
    userDiv.textContent = text;
    chatBox.appendChild(userDiv);

    // إرسال إلى API (تجريبي)
    fetch('/api/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text })
    })
      .then(res => res.json())
      .then(data => {
        const botDiv = document.createElement('div');
        botDiv.className = 'message bot-message';
        botDiv.textContent = data.response || "لا يوجد رد.";
        chatBox.appendChild(botDiv);
      });

    userInput.value = '';
  });
});
