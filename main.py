from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import openai
import os
from dotenv import load_dotenv
import json

load_dotenv()

API_KEY = os.getenv("OPENAI_API_KEY") 

if not API_KEY:
    raise RuntimeError("⚠️ OPENAI_API_KEY not found. Please check your .env file.")

openai.api_key = API_KEY

app = FastAPI()

class Message(BaseModel):
    text: str

@app.post("/analyze")
def analyze_message(message: Message):
    prompt = f"""
    Analyze the following message and respond in JSON format with:
    - "tone": emotional tone (e.g., angry, sarcastic, passive-aggressive, self-deprecating, neutral)
    - "feedback": supportive message
    - "suggestion": gentler alternative (or null)
    Message: "{message.text}"
    """

    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a kind, supportive assistant helping users understand and rephrase messages with empathy."},
                {"role": "user", "content": prompt}
            ]
        )
        reply = response.choices[0].message["content"]

        result = json.loads(reply)
        return result

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="❌ Failed to parse LLM response. Try again or adjust prompt.")

    except openai.error.AuthenticationError:
        raise HTTPException(status_code=401, detail="🔐 Invalid OpenAI API key.")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"🔥 Unexpected error: {str(e)}")
