from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
import os
import json

# Load environment variables from .env file
load_dotenv()

# Get OpenAI API key
API_KEY = os.getenv("OPENAI_API_KEY")
if not API_KEY:
    raise RuntimeError("⚠️ OPENAI_API_KEY not found. Please check your .env file.")

# Initialize FastAPI app
app = FastAPI()

# Configure CORS to allow requests from specific origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://web.whatsapp.com",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client once (not per request)
client = OpenAI(api_key=API_KEY)

# Define expected structure for incoming requests
class Message(BaseModel):
    text: str  # Message content to analyze

# Handle CORS preflight requests (OPTIONS)
@app.options("/analyze")
def preflight_handler():
    response = JSONResponse(content={"message": "Preflight OK"})
    response.headers["Access-Control-Allow-Origin"] = "https://web.whatsapp.com"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

# Analyze emotional tone of a message
@app.post("/analyze")
def analyze_message(message: Message):
    prompt = f"""
    You are an empathetic assistant. Analyze the message below and reply in compact JSON format with:

    - "tone": the detected emotional tone (e.g., angry, passive-aggressive, cold, dismissive, sarcastic, etc.).
    - "problematic": true if the tone might be perceived as emotionally difficult, harsh, or hurtful to the recipient (even subtly); false if the tone is safe and unlikely to cause discomfort or misunderstanding.

    If problematic is *true*, also include:
    - "feedback": a short, warm, and friendly reflection — in the same language as the original message — focusing on how the recipient might feel when reading it.
     Don't describe how the message is written. Instead, describe the emotional impact it may have on the person who receives it.
     Use natural, human-style language — informal is fine. Be kind and avoid overanalyzing or sounding robotic.
    At the end of the feedback, always add a gentle, conversational question inviting the sender to reflect or respond — like: "what do you think about it?" or "do you want to rephrase?"

    - "suggested_rewrite": offer a slightly softer or more emotionally aware alternative phrasing, preserving the original intent. Keep it in the same language.
    - "problematic_words": a list of emotionally charged or tone-affecting words or phrases that may have contributed to the problematic tone (if any)

    If problematic is *false*, return only:
    - "tone"
    - "problematic"

    HOWEVER:  
    If the message is short, emotionally neutral, and polite (e.g., "thanks", "ok", "noted", "sure", "got it", "fine", "understood", "אין בעיה", "סבבה"), or contains no emotional or interpersonal subtext — return this exact minimal JSON:

    {{ "tone": "neutral", "problematic": false }}

    Message: "{message.text}"

    Detect the message language automatically.  
    Respond *only* in compact JSON format — no markdown, no explanation, no extra text.
    Under no circumstances should any field (especially "feedback") be in a different language than the original message.
    """

    print(f"[INFO] Incoming message: {message.text}")

    try:
        completion = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are a kind, supportive assistant helping users understand and rephrase messages with empathy."
                },
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )

        # Validate and parse response
        if not completion.choices or not completion.choices[0].message or not completion.choices[0].message.content:
            raise HTTPException(status_code=500, detail="LLM returned empty response.")

        reply = completion.choices[0].message.content
        result = json.loads(reply)

        print(f"[INFO] LLM response: {result}")
        return result

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="❌ Failed to parse LLM response. Try again or adjust prompt.")
    except Exception as e:
        if hasattr(e, "status_code") and e.status_code == 401:
            raise HTTPException(status_code=401, detail="🔐 Invalid OpenAI API key.")
        raise HTTPException(status_code=500, detail=f"🔥 Unexpected error: {str(e)}")
