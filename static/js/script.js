document.addEventListener('DOMContentLoaded', () => {
  const chatItems = document.querySelectorAll('.chat-dropdown-item');

  chatItems.forEach(item => {
    const renameBtn = item.querySelector('.rename-chat-btn');
    const deleteBtn = item.querySelector('.delete-chat-btn');

    renameBtn.addEventListener('click', () => {
      const chatId = item.dataset.chatId;
      const newTitle = prompt("أدخل عنوانًا جديدًا:");
      if (newTitle) {
        fetch(`/chat/${chatId}/rename`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle })
        }).then(() => {
          item.querySelector('a').textContent = newTitle;
        });
      }
    });

    deleteBtn.addEventListener('click', () => {
      const chatId = item.dataset.chatId;
      if (confirm("هل تريد حذف هذه المحادثة؟")) {
        fetch(`/chat/${chatId}`, { method: 'DELETE' }).then(() => {
          item.remove();
        });
      }
    });
  });
});
