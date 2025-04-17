<!DOCTYPE html><html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    {# ** الخادم يجب أن يمرر chat.id, chat.title, chat.model ** #}
    <title>{{ chat.title | default('محادثة') }} - DzTeck.ai</title>
    <meta name="description" content="محادثة ذكية مع {{ chat.model | default('AI') }} على DzTeck.ai">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" crossorigin="anonymous" referrerpolicy="no-referrer" />
    <link rel="stylesheet" href="{{ url_for('static', filename='css/style.css') }}">
     <!-- <link rel="icon" href="{{ url_for('static', filename='img/favicon.ico') }}"> -->
</head>// وضع صيانة: تعطيل كل التفاعل
document.addEventListener('DOMContentLoaded', () => {
  alert("هذه الصفحة في وضع الصيانة حالياً. لا يمكن التفاعل مع النموذج.");
  return; // منع تنفيذ باقي الكود
});
<body>
    <div class="chat-container">
        <!-- الهيدر الأصلي لصفحة المحادثة -->
        <header class="chat-header chat-page-header">
            <div class="logo-area">
                <a href="{{ url_for('index') }}" class="back-button" title="العودة لقائمة المحادثات">
                    <i class="fas fa-arrow-right"></i>
                </a>
                 <img src="{{ url_for('static', filename='img/logo.svg') }}" alt="DzTeck Logo" class="logo-img" onerror="this.style.display='none'">
            </div>
            <div class="header-content">
                <h1 class="chat-title-header" title="{{ chat.title | default('محادثة') }}">{{ chat.title | default('محادثة') }}</h1>
                <span class="model-info-header">النموذج: {{ chat.model | default('غير محدد') }}</span>
            </div>
            <div class="header-actions">
                <button id="delete-chat-btn" title="حذف هذه المحادثة بالكامل">
                    <i class="fas fa-trash-alt"></i>
                    <span class="delete-text">حذف</span> <!-- نص يظهر في الشاشات الأكبر -->
                </button>
            </div>
        </header><!-- منطقة عرض الرسائل -->
    <div class="chat-box" id="chat-box">
        {# ** عرض الرسائل من الخادم - كل message يجب أن تحتوي على id, role, content ** #}
        {% for message in messages %}
        <div class="message {{ 'user-message' if message.role == 'user' else 'bot-message' }}" data-message-id="{{ message.id }}"> {# *** ID ضروري من الخادم *** #}
            <div class="message-icon">
                 <img src="{{ url_for('static', filename='img/user-icon.svg' if message.role == 'user' else 'img/bot-icon.svg') }}" alt="{{ message.role }}" onerror="this.style.display='none'">
            </div>
            <div class="message-content">
                {# استخدم safe فقط إذا كنت متأكدًا تمامًا من أن المحتوى آمن #}
                {{ message.content }} {# الأفضل عدم استخدام safe هنا افتراضيًا #}

                {# زر حذف الرسالة الفردية للمستخدم (يجب أن يضيفه الخادم) #}
                {% if message.role == 'user' %}
                <button class="delete-msg-btn" title="حذف الرسالة">
                    <i class="fas fa-times"></i> {# أيقونة X أصغر للحذف الفردي #}
                </button>
                {% endif %}

                 {# زر تشغيل الصوت لرسائل البوت #}
                {% if message.role != 'user' %}
                <button class="speak-btn" title="تشغيل الصوت">
                    <i class="fas fa-volume-up"></i>
                </button>
                {% endif %}
            </div>
        </div>
        {% endfor %}
        {# الرسائل الجديدة والإشعارات ستضاف هنا بواسطة JS #}
    </div>

    <!-- منطقة الإدخال (Textarea + Voice + Send) -->
    <div class="input-section">
        <div class="input-area">
             {# زر الإدخال الصوتي #}
             <button id="voice-input-btn" class="action-button" title="الإدخال الصوتي">
                <i class="fas fa-microphone"></i>
            </button>
            {# حقل إدخال النص #}
            <textarea id="user-input" placeholder="اكتب رسالتك أو استخدم الميكروفون..." rows="1"></textarea>
            {# زر الإرسال #}
            <button id="send-button" class="action-button" title="إرسال">
                <i class="fas fa-paper-plane"></i>
            </button>
        </div>
    </div>

    <!-- الفوتر الأصلي -->
     <footer class="chat-footer">
        <p>© {{ now.year if now else '2024' }} DzTeck.ai - Developed by Rahmani</p>
        <p class="footer-tagline">الذكاء الاصطناعي يتحدث العربية.</p>
    </footer>

    <!-- Hidden Fields -->
    <input type="hidden" id="chat-id" value="{{ chat.id }}">
     {# لا حاجة لـ model-name إذا كان الخادم يعالجه #}
</div>

<!-- ربط ملف JavaScript المحدث -->
<script src="{{ url_for('static', filename='js/chat.js') }}"></script>

</body>
</html> اكتب لي الكود
