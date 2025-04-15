import os
import logging
import json
import requests
from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase

# Set up logging for debugging
logging.basicConfig(level=logging.DEBUG)

# Create database base class
class Base(DeclarativeBase):
    pass

# Initialize database
db = SQLAlchemy(model_class=Base)

# Create Flask application
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dzteck_default_secret_key")

# Configure database
database_url = os.environ.get("DATABASE_URL")
if database_url:
    # Print for debugging
    logging.debug(f"DATABASE_URL is set: {database_url[:10]}...")
    
    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_recycle": 300,
        "pool_pre_ping": True,
    }
else:
    logging.error("DATABASE_URL environment variable is not set!")
    # Fallback for development only
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///dzteck.db"

# Get OpenAI API key from environment variables - this is used for OpenRouter
OPENROUTER_API_KEY = os.environ.get("OPENAI_API_KEY")
if not OPENROUTER_API_KEY:
    logging.warning("OPENAI_API_KEY environment variable is not set! OpenRouter API may not work.")

# Initialize the app with the database extension
db.init_app(app)

# Import models and chat service after db initialization
with app.app_context():
    from models import Chat, Message
    import chat_service

# OpenRouter API helper function
def call_openrouter_api(model, messages, temperature=0.7, max_tokens=1024):
    """
    Call OpenRouter API with the server's API key.
    
    Args:
        model: The model ID to use
        messages: List of message objects with role and content
        temperature: Temperature parameter for response randomness
        max_tokens: Maximum number of tokens to generate
        
    Returns:
        Generated response text or error message
    """
    # OpenRouter API endpoint
    api_url = "https://openrouter.ai/api/v1/chat/completions"
    
    # Using the server's API key from environment variables
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": request.host_url,  # Dynamic from current request
        "X-Title": "DzTeck Chat"
    }
    
    # Request body
    body = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    
    try:
        # Call the API
        response = requests.post(api_url, headers=headers, json=body)
        
        # Check for errors
        if not response.ok:
            error_data = response.json()
            error_msg = error_data.get('error', {}).get('message', f"Error: {response.status_code}")
            return {"error": error_msg}
        
        # Parse response
        data = response.json()
        content = data['choices'][0]['message']['content'].strip()
        
        return {"content": content}
        
    except Exception as e:
        logging.error(f"Error calling OpenRouter API: {str(e)}")
        return {"error": f"خطأ في الاتصال بـ OpenRouter: {str(e)}"}

# Main routes
@app.route('/')
def index():
    """Render the main chat interface."""
    chats = chat_service.get_all_chats()
    return render_template('index.html', chats=chats)
    
@app.route('/chat/<int:chat_id>')
def view_chat(chat_id):
    """View a specific chat."""
    chat = Chat.query.get_or_404(chat_id)
    messages = chat_service.get_chat_history(chat_id)
    return render_template('chat.html', chat=chat, messages=messages)

@app.route('/chat/new', methods=['POST'])
def create_chat():
    """Create a new chat."""
    model_name = request.form.get('model', 'mistralai/mistral-7b-instruct-v0.2')
    new_chat = chat_service.create_new_chat(model_name)
    return redirect(url_for('view_chat', chat_id=new_chat.id))

@app.route('/chat/<int:chat_id>/message', methods=['POST'])
def add_message(chat_id):
    """Add a message to the chat."""
    data = request.json
    content = data.get('content', '')
    
    if not content:
        return jsonify({'error': 'Content is required'}), 400
        
    # Add user message to database
    user_message = chat_service.add_message_to_chat(chat_id, 'user', content)
    
    if not user_message:
        return jsonify({'error': 'Chat not found'}), 404
    
    # Get chat details and history
    chat = Chat.query.get(chat_id)
    messages = chat_service.get_chat_history(chat_id)
    
    # Format messages for OpenRouter API
    formatted_messages = [
        {"role": msg.role, "content": msg.content} 
        for msg in messages if msg.role in ['system', 'user', 'assistant']
    ]
    
    # Call OpenRouter API
    ai_response = call_openrouter_api(
        model=chat.model,
        messages=formatted_messages,
        temperature=0.7,
        max_tokens=1024 if "mistral" in chat.model or "gemma" in chat.model else 2048
    )
    
    # Save the assistant's response to database
    if "content" in ai_response:
        assistant_message = chat_service.add_message_to_chat(chat_id, 'assistant', ai_response["content"])
        return jsonify({
            'id': assistant_message.id, 
            'role': 'assistant', 
            'content': assistant_message.content,
            'created_at': assistant_message.created_at.isoformat()
        })
    else:
        # Handle API error
        error_message = ai_response.get("error", "حدث خطأ غير معروف")
        error_msg = chat_service.add_message_to_chat(chat_id, 'assistant', error_message)
        return jsonify({
            'id': error_msg.id, 
            'role': 'assistant', 
            'content': error_message,
            'created_at': error_msg.created_at.isoformat()
        }), 200  # Still return 200 to handle on client

@app.route('/chat/<int:chat_id>/history')
def get_chat_history(chat_id):
    """Get chat history as JSON."""
    messages = chat_service.get_chat_history(chat_id)
    return jsonify([{
        'id': msg.id,
        'role': msg.role,
        'content': msg.content,
        'created_at': msg.created_at.isoformat()
    } for msg in messages if msg.role != 'system'])  # Don't show system messages to user

@app.route('/chat/<int:chat_id>/delete', methods=['POST'])
def delete_chat(chat_id):
    """Delete a chat."""
    success = chat_service.delete_chat(chat_id)
    if success:
        return redirect(url_for('index'))
    return jsonify({'error': 'Chat not found'}), 404

# API routes for AJAX calls from frontend
@app.route('/api/chats', methods=['GET'])
def api_get_chats():
    """API endpoint to get all chats."""
    chats = chat_service.get_all_chats()
    return jsonify([{
        'id': chat.id,
        'title': chat.title,
        'model': chat.model,
        'created_at': chat.created_at.isoformat(),
        'updated_at': chat.updated_at.isoformat()
    } for chat in chats])

# Error handlers
@app.errorhandler(404)
def page_not_found(e):
    return render_template('index.html'), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('index.html'), 500

# Initialize database tables
with app.app_context():
    db.create_all()  # Create tables based on the models
