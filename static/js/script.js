// static/js/script.js
document.addEventListener('DOMContentLoaded', () => {
  const chatList = document.getElementById('chat-list');
  if (chatList) {
    chatList.addEventListener('click', (event) => {
      const deleteBtn = event.target.closest('.delete-list-item-btn');
      if (deleteBtn) {
        const chatItem = deleteBtn.closest('.chat-item');
        const chatId = chatItem.dataset.chatId;
        if (confirm('هل تريد حذف هذه المحادثة؟')) {
          fetch(`/chat/${chatId}`, { method: 'DELETE' })
            .then(res => res.ok ? chatItem.remove() : alert("فشل الحذف"))
            .catch(err => alert("خطأ أثناء الحذف"));
        }
      }
    });
  }
});
