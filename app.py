import os
import logging
import json
import requests
from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase

# إعدادات اللوج
logging.basicConfig(level=logging.DEBUG)

class Base(DeclarativeBase): pass
db = SQLAlchemy(model_class=Base)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dzteck_default_secret_key")

# إعداد قاعدة البيانات
database_url = os.environ.get("DATABASE_URL")
if database_url:
    logging.debug(f"DATABASE_URL is set: {database_url[:10]}...")
    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {"pool_recycle": 300, "pool_pre_ping": True}
else:
    logging.error("DATABASE_URL is not set!")
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///dzteck.db"

# مفاتيح API
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
if not OPENROUTER_API_KEY:
    logging.warning("OPENROUTER_API_KEY is not set!")

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
if not TELEGRAM_BOT_TOKEN:
    logging.warning("TELEGRAM_BOT_TOKEN is not set!")

db.init_app(app)

with app.app_context():
    from models import Chat, Message
    import chat_service

# استدعاء OpenRouter API
def call_openrouter_api(model, messages, temperature=0.7, max_tokens=1024):
    api_url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": request.host_url,
        "X-Title": "DzTeck Chat"
    }
    body = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    try:
        response = requests.post(api_url, headers=headers, json=body)
        if not response.ok:
            return {"error": response.json().get('error', {}).get('message', "API Error")}
        return {"content": response.json()['choices'][0]['message']['content'].strip()}
    except Exception as e:
        logging.error(f"OpenRouter error: {e}")
        return {"error": f"خطأ في الاتصال بـ OpenRouter: {str(e)}"}

# Telegram Webhook endpoint
@app.route('/api/telegram', methods=['POST'])
def telegram_webhook():
    data = request.json
    message = data.get('message', {})
    chat_id = message.get('chat', {}).get('id')
    user_text = message.get('text', '')

    if not chat_id or not user_text:
        return "no content", 200

    # بناء محادثة OpenRouter
    messages = [{"role": "user", "content": user_text}]
    ai_response = call_openrouter_api(
        model="mistralai/mistral-7b-instruct-v0.2",
        messages=messages
    )

    reply_text = ai_response.get("content", "عذرًا، لم أتمكن من الفهم.")

    # الرد عبر Telegram
    telegram_api = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    requests.post(telegram_api, json={"chat_id": chat_id, "text": reply_text})

    return "ok", 200

# باقي الواجهات (نفس السابق)
@app.route('/')
def index():
    chats = chat_service.get_all_chats()
    return render_template('index.html', chats=chats)

@app.route('/chat/<int:chat_id>')
def view_chat(chat_id):
    chat = Chat.query.get_or_404(chat_id)
    messages = chat_service.get_chat_history(chat_id)
    return render_template('chat.html', chat=chat, messages=messages)

@app.route('/chat/new', methods=['POST'])
def create_chat():
    model_name = request.form.get('model', 'mistralai/mistral-7b-instruct-v0.2')
    new_chat = chat_service.create_new_chat(model_name)
    return redirect(url_for('view_chat', chat_id=new_chat.id))

@app.route('/chat/<int:chat_id>/message', methods=['POST'])
def add_message(chat_id):
    data = request.json
    content = data.get('content', '')
    if not content:
        return jsonify({'error': 'Content is required'}), 400

    user_message = chat_service.add_message_to_chat(chat_id, 'user', content)
    if not user_message:
        return jsonify({'error': 'Chat not found'}), 404

    chat = Chat.query.get(chat_id)
    messages = chat_service.get_chat_history(chat_id)
    formatted_messages = [{"role": msg.role, "content": msg.content} for msg in messages if msg.role in ['system', 'user', 'assistant']]

    ai_response = call_openrouter_api(
        model=chat.model,
        messages=formatted_messages,
        temperature=0.7,
        max_tokens=1024 if "mistral" in chat.model or "gemma" in chat.model else 2048
    )

    if "content" in ai_response:
        assistant_message = chat_service.add_message_to_chat(chat_id, 'assistant', ai_response["content"])
        return jsonify({
            'id': assistant_message.id,
            'role': 'assistant',
            'content': assistant_message.content,
            'created_at': assistant_message.created_at.isoformat()
        })
    else:
        error_message = ai_response.get("error", "حدث خطأ غير معروف")
        error_msg = chat_service.add_message_to_chat(chat_id, 'assistant', error_message)
        return jsonify({
            'id': error_msg.id,
            'role': 'assistant',
            'content': error_message,
            'created_at': error_msg.created_at.isoformat()
        }), 200

@app.route('/chat/<int:chat_id>/history')
def get_chat_history(chat_id):
    messages = chat_service.get_chat_history(chat_id)
    return jsonify([{
        'id': msg.id,
        'role': msg.role,
        'content': msg.content,
        'created_at': msg.created_at.isoformat()
    } for msg in messages if msg.role != 'system'])

@app.route('/chat/<int:chat_id>/delete', methods=['POST'])
def delete_chat(chat_id):
    success = chat_service.delete_chat(chat_id)
    if success:
        return redirect(url_for('index'))
    return jsonify({'error': 'Chat not found'}), 404

@app.route('/api/chats', methods=['GET'])
def api_get_chats():
    chats = chat_service.get_all_chats()
    return jsonify([{
        'id': chat.id,
        'title': chat.title,
        'model': chat.model,
        'created_at': chat.created_at.isoformat(),
        'updated_at': chat.updated_at.isoformat()
    } for chat in chats])

@app.errorhandler(404)
def page_not_found(e):
    return render_template('index.html'), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('index.html'), 500

with app.app_context():
    db.create_all()
