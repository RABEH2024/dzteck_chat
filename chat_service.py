"""
خدمة المحادثة: المسؤولة عن إنشاء وتخزين المحادثات
"""
from app import db
from models import Chat, Message

def create_new_chat(model_name):
    """
    إنشاء محادثة جديدة
    
    Args:
        model_name: اسم نموذج الذكاء الاصطناعي المستخدم
    
    Returns:
        كائن محادثة جديد
    """
    new_chat = Chat(
        title="محادثة جديدة",
        model=model_name
    )
    
    # إضافة رسالة النظام الافتتاحية
    system_message = Message(
        role="system",
        content="أنت مساعد ذكي ومفيد يتحدث باللغة العربية بطلاقة. أجب بدقة ووضوح على أسئلة المستخدم. كن مهذباً ودقيقاً في إجاباتك. استخدم اللغة العربية الفصحى البسيطة السهلة الفهم. أنت تمثل واجهة محادثة DzTeck.",
        chat=new_chat
    )
    
    # إضافة رسالة المساعد الترحيبية
    assistant_message = Message(
        role="assistant",
        content="مرحباً بك في DzTeck! كيف يمكنني مساعدتك اليوم؟",
        chat=new_chat
    )
    
    db.session.add(new_chat)
    db.session.add(system_message)
    db.session.add(assistant_message)
    db.session.commit()
    
    return new_chat

def add_message_to_chat(chat_id, role, content):
    """
    إضافة رسالة إلى محادثة
    
    Args:
        chat_id: معرف المحادثة
        role: دور المرسل (user, assistant, system)
        content: محتوى الرسالة
    
    Returns:
        كائن الرسالة المضافة
    """
    chat = Chat.query.get(chat_id)
    if not chat:
        return None
    
    message = Message(
        chat_id=chat_id,
        role=role,
        content=content
    )
    
    # تحديث وقت تعديل المحادثة
    chat.updated_at = db.func.now()
    
    db.session.add(message)
    db.session.commit()
    
    return message

def get_chat_history(chat_id, limit=20):
    """
    استرجاع تاريخ المحادثة
    
    Args:
        chat_id: معرف المحادثة
        limit: الحد الأقصى لعدد الرسائل المسترجعة
    
    Returns:
        قائمة برسائل المحادثة
    """
    messages = Message.query.filter_by(chat_id=chat_id).order_by(Message.created_at.asc()).limit(limit).all()
    return messages

def get_all_chats():
    """
    استرجاع كل المحادثات
    
    Returns:
        قائمة بكل المحادثات مرتبة من الأحدث إلى الأقدم
    """
    chats = Chat.query.order_by(Chat.updated_at.desc()).all()
    return chats

def delete_chat(chat_id):
    """
    حذف محادثة
    
    Args:
        chat_id: معرف المحادثة
    
    Returns:
        True إذا تم الحذف بنجاح، False خلاف ذلك
    """
    chat = Chat.query.get(chat_id)
    if not chat:
        return False
    
    db.session.delete(chat)
    db.session.commit()
    return True