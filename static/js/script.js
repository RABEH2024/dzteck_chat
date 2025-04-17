document.addEventListener('DOMContentLoaded', () => {
  const chatList = document.getElementById('chat-list');

  if (chatList) {
    chatList.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.delete-list-item-btn');
      if (deleteBtn) {
        const chatItem = deleteBtn.closest('.chat-item');
        const chatId = chatItem.dataset.chatId;

        if (confirm("هل تريد حذف هذه المحادثة؟")) {
          fetch(`/chat/${chatId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
          }).then(res => {
            if (res.ok) {
              chatItem.remove();
            } else {
              alert('فشل الحذف');
            }
          });
        }
      }
    });
  }
});
