"""
نماذج لاستخدام OpenRouter API مع Python
"""
import os
import requests
import json
from openai import OpenAI

# الحصول على مفتاح API من متغيرات البيئة (تم تعيينه بواسطة Replit secrets)
OPENROUTER_API_KEY = os.environ.get("OPENAI_API_KEY")

if not OPENROUTER_API_KEY:
    print("تحذير: مفتاح OpenRouter API غير موجود")

# إعداد معلومات الموقع (اختياري)
SITE_URL = "https://dzteck.replit.app"
SITE_NAME = "DzTeck Chat"

def example1_using_openai_library():
    """
    استخدام مكتبة OpenAI للاتصال بـ OpenRouter API
    هذه طريقة سهلة ومبسطة للتكامل
    """
    # إنشاء عميل OpenAI باستخدام OpenRouter كقاعدة URL
    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=OPENROUTER_API_KEY
    )
    
    # إنشاء محادثة مع نموذج مختار
    completion = client.chat.completions.create(
        model="mistralai/mistral-7b-instruct-v0.2",  # نموذج مجاني من OpenRouter
        messages=[
            {
                "role": "system",
                "content": "أنت مساعد ذكي يتحدث اللغة العربية بطلاقة. قدم إجابات مفيدة وموجزة."
            },
            {
                "role": "user",
                "content": "ما هي أهم المعالم السياحية في الجزائر؟"
            }
        ],
        # إضافة ترويسات اختيارية لتصنيف موقعك على OpenRouter
        extra_headers={
            "HTTP-Referer": SITE_URL,
            "X-Title": SITE_NAME,
        }
    )
    
    # طباعة الرد
    print("مثال 1 باستخدام مكتبة OpenAI:")
    print(completion.choices[0].message.content)
    print("-" * 50)

def example2_using_requests():
    """
    استخدام مكتبة requests مباشرة مع OpenRouter API
    هذه طريقة أكثر مرونة للتحكم الكامل بتفاصيل الطلب
    """
    response = requests.post(
        url="https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "HTTP-Referer": SITE_URL,  # اختياري
            "X-Title": SITE_NAME,      # اختياري
            "Content-Type": "application/json"
        },
        data=json.dumps({
            "model": "google/gemma-7b-it",  # نموذج مجاني آخر
            "messages": [
                {
                    "role": "system",
                    "content": "أنت مساعد ذكي يتحدث اللغة العربية بطلاقة. قدم إجابات مفيدة وموجزة."
                },
                {
                    "role": "user",
                    "content": "اقترح ثلاثة أفكار لمشاريع برمجية للمبتدئين."
                }
            ],
            "temperature": 0.7,
            "max_tokens": 1000
        })
    )
    
    result = response.json()
    
    # طباعة الرد
    print("مثال 2 باستخدام مكتبة requests:")
    print(result["choices"][0]["message"]["content"])
    print("-" * 50)

def example3_try_gpt4o():
    """
    استخدام GPT-4o عبر OpenRouter
    ملاحظة: هذا النموذج ليس مجانيًا وسيستهلك رصيدًا من حسابك
    """
    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=OPENROUTER_API_KEY
    )
    
    completion = client.chat.completions.create(
        model="openai/gpt-4o",  # نموذج متقدم (مدفوع)
        messages=[
            {
                "role": "system",
                "content": "أنت مساعد ذكي يتحدث اللغة العربية بطلاقة. قدم إجابات مفيدة ومفصلة."
            },
            {
                "role": "user",
                "content": "اشرح كيف يمكن للتعلم الآلي تحسين قطاع الرعاية الصحية؟"
            }
        ],
        extra_headers={
            "HTTP-Referer": SITE_URL,
            "X-Title": SITE_NAME,
        }
    )
    
    print("مثال 3 باستخدام GPT-4o:")
    print(completion.choices[0].message.content)
    print("-" * 50)

def print_available_models():
    """
    الحصول على قائمة النماذج المتاحة من OpenRouter
    """
    response = requests.get(
        url="https://openrouter.ai/api/v1/models",
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}"
        }
    )
    
    models = response.json()
    
    print("النماذج المتاحة في OpenRouter:")
    print("=" * 50)
    
    free_models = []
    paid_models = []
    
    for model in models["data"]:
        model_id = model["id"]
        context_length = model.get("context_length", "غير معروف")
        pricing = model.get("pricing", {})
        
        # تحقق مما إذا كان النموذج مجانيًا
        input_price = pricing.get("input", 0)
        output_price = pricing.get("output", 0)
        
        is_free = input_price == 0 and output_price == 0
        
        model_info = {
            "id": model_id,
            "context_length": context_length,
            "input_price": input_price,
            "output_price": output_price
        }
        
        if is_free:
            free_models.append(model_info)
        else:
            paid_models.append(model_info)
    
    # طباعة النماذج المجانية
    print("\nالنماذج المجانية:")
    print("-" * 50)
    for model in free_models:
        print(f"النموذج: {model['id']}")
        print(f"سياق التوكن: {model['context_length']}")
        print(f"سعر الإدخال: {model['input_price']}")
        print(f"سعر الإخراج: {model['output_price']}")
        print("-" * 30)
    
    # طباعة بعض النماذج المدفوعة الشائعة
    print("\nبعض النماذج المدفوعة الشائعة:")
    print("-" * 50)
    popular_paid = [m for m in paid_models if any(name in m["id"] for name in ["openai", "anthropic", "claude", "llama"])]
    for model in popular_paid[:5]:  # طباعة أول 5 نماذج فقط
        print(f"النموذج: {model['id']}")
        print(f"سياق التوكن: {model['context_length']}")
        print(f"سعر الإدخال: {model['input_price']}")
        print(f"سعر الإخراج: {model['output_price']}")
        print("-" * 30)

if __name__ == "__main__":
    # تنفيذ أمثلة استخدام OpenRouter API
    try:
        # طباعة النماذج المتاحة
        print_available_models()
        
        # تنفيذ الأمثلة - اختر المثال الذي تريد تجربته
        # سيتم استهلاك رصيد من حسابك عند تنفيذ هذه الأمثلة
        
        print("\nهل تريد تنفيذ الأمثلة؟ (سيستهلك ذلك رصيدًا من حسابك)")
        choice = input("اكتب 'نعم' للمتابعة: ")
        
        if choice.lower() in ["نعم", "yes", "y"]:
            example1_using_openai_library()
            example2_using_requests()
            
            # تحذير: هذا المثال سيستخدم نموذجًا مدفوعًا
            use_gpt4 = input("هل تريد تجربة GPT-4o؟ (مدفوع) [نعم/لا]: ")
            if use_gpt4.lower() in ["نعم", "yes", "y"]:
                example3_try_gpt4o()
            
    except Exception as e:
        print(f"حدث خطأ: {e}")