from datetime import datetime
from app import db
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

class Chat(db.Model):
    """Model representing a chat conversation."""
    __tablename__ = 'chats'
    
    id = Column(Integer, primary_key=True)
    title = Column(String(100), nullable=False, default="محادثة جديدة")
    model = Column(String(100), nullable=False)  # نموذج الذكاء الاصطناعي المستخدم
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقة مع جدول الرسائل
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Chat {self.id}: {self.title}>"

class Message(db.Model):
    """Model representing a message within a chat."""
    __tablename__ = 'messages'
    
    id = Column(Integer, primary_key=True)
    chat_id = Column(Integer, ForeignKey('chats.id'), nullable=False)
    role = Column(String(20), nullable=False)  # 'user' أو 'assistant' أو 'system'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # العلاقة مع جدول المحادثات
    chat = relationship("Chat", back_populates="messages")
    
    def __repr__(self):
        return f"<Message {self.id} ({self.role}): {self.content[:20]}...>"