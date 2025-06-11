from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import OpenAI
import os
from dotenv import load_dotenv
import json

load_dotenv()

API_KEY = os.getenv("OPENAI_API_KEY") 

if not API_KEY:
    raise RuntimeError("⚠️ OPENAI_API_KEY not found. Please check your .env file.")

# Set the OpenAI API key
#openai.api_key = API_KEY

# Initialize the FastAPI app
app = FastAPI()

# Serve static files from the 'example_data' folder (for testing with mock JSON response)
from fastapi.staticfiles import StaticFiles
app.mount("/example_data", StaticFiles(directory="example_data"), name="example_data")

# Define the expected structure of incoming POST requests
class Message(BaseModel):
    text: str  # The message content to analyze

TONE_RESPONSES = {
    "passive-aggressive": {
        "en": {
            "feedback": "It seems like you're expressing something indirectly. Let’s try to be more direct.",
            "suggestion": "Try stating your needs or thoughts in a more straightforward way."
        },
        "he": {
            "feedback": "נראה שאת מביעה משהו בעקיפין. אולי כדאי לנסח את הדברים בצורה ישירה יותר.",
            "suggestion": "נסי לומר את מה שאת מרגישה בצורה ברורה וישירה."
        }
    },
    "angry": {
        "en": {
            "feedback": "Your message sounds angry. It’s okay to feel that way.",
            "suggestion": "Try expressing your frustration with clarity but without blame."
        },
        "he": {
            "feedback": "נראה שאת כועסת. זה בסדר להרגיש כך.",
            "suggestion": "נסי לבטא את הכעס שלך בצורה ברורה אך לא מאשימה."
        }
    },
    "sarcastic": {
        "en": {
            "feedback": "There may be sarcasm in your tone. That can make it harder to understand your intent.",
            "suggestion": "Try expressing your thoughts more directly."
        },
        "he": {
            "feedback": "נראה שיש כאן סרקזם, וזה עלול להקשות על הבנה הדדית.",
            "suggestion": "נסי לנסח את מחשבותייך בצורה ברורה וישירה."
        }
    },
    "self-deprecating": {
        "en": {
            "feedback": "You might be being hard on yourself. Remember to show yourself some kindness.",
            "suggestion": "Try rephrasing to focus on your strengths or intentions."
        },
        "he": {
            "feedback": "נראה שאת קשה עם עצמך. מגיע לך יחס אוהד.",
            "suggestion": "נסי להתמקד בכוונות או בחוזקות שלך."
        }
    },
    "cynical": {
        "en": {
            "feedback": "There may be skepticism in your message. That’s okay—let’s try to keep it constructive.",
            "suggestion": "Try rephrasing to invite open conversation rather than shutting it down."
        },
        "he": {
            "feedback": "נראה שיש מסר ספקני בדברייך. זה בסדר – נשתדל לשמור על שיח בונה.",
            "suggestion": "נסחי את המסר כך שיזמין שיח פתוח במקום לחסום אותו."
        }
    },
    "anxious": {
        "en": {
            "feedback": "Your message seems to carry worry or uncertainty. You're not alone.",
            "suggestion": "Consider stating your concerns clearly so others can offer support."
        },
        "he": {
            "feedback": "נראה שהודעתך מבטאת דאגה או חוסר ביטחון. את לא לבד.",
            "suggestion": "נסי לנסח את החששות שלך באופן ברור, כדי שיקל על אחרים לעזור."
        }
    },
    "confused": {
        "en": {
            "feedback": "It sounds like you're unsure or seeking clarity. That’s totally fine.",
            "suggestion": "Try asking a direct question so it’s easier to help."
        },
        "he": {
            "feedback": "נראה שאת מחפשת הבהרה או לא בטוחה. זה לגמרי בסדר.",
            "suggestion": "נסחי שאלה ישירה כדי להקל על מי שמנסה לעזור לך."
        }
    },
    "neutral": {
        "en": {
            "feedback": "Your tone seems neutral.",
            "suggestion": None
        },
        "he": {
            "feedback": "הטון שלך נראה ניטרלי.",
            "suggestion": None
        }
    }
}

# Define the /analyze endpoint to receive messages and analyze their emotional tone
@app.post("/analyze")
def analyze_message(message: Message):
    # Construct the prompt for the language model
    prompt = f"""
    You are a kind assistant that helps users rephrase their messages in a clearer and more constructive tone.

    Please analyze the following message and respond in JSON format with:
    - "tone": emotional tone (e.g., angry, sarcastic, passive-aggressive, self-deprecating, neutral, etc.)
    - "feedback": super short reflection about the tone in the same language of the original message 
    - "suggestion": improved rephrasing of the original message in the same language

    Message: "{message.text}"
    """

    # Log the incoming message for debugging
    print(f"[INFO] Incoming message: {message.text}")

    try:
        # Send the prompt to OpenAI's Chat API 

        client = OpenAI()
        client.api_key = API_KEY
        completion = client.chat.completions.create(
          model="gpt-4o",
          messages=[
                {"role": "system", "content": "You are a kind, supportive assistant helping users understand and rephrase messages with empathy."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )

        ###
        # Extract the LLM's response
        reply = completion.choices[0].message.content


        # Convert the string response into a JSON object
        result = json.loads(reply)
        #print(result)
        # Log the response for debugging
        print(f"[INFO] LLM response: {result}")

        return result

    # Handle case where the model returns invalid JSON
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="❌ Failed to parse LLM response. Try again or adjust prompt.")

    # Handle authentication errors (wrong or missing API key)
    except Exception as e:
        # Optionally, check for authentication error if using openai.error.AuthenticationError
        if hasattr(e, "status_code") and e.status_code == 401:
            raise HTTPException(status_code=401, detail="🔐 Invalid OpenAI API key.")
        raise HTTPException(status_code=500, detail=f"🔥 Unexpected error: {str(e)}")
