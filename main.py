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

# Set the OpenAI API key
openai.api_key = API_KEY

# Initialize the FastAPI app
app = FastAPI()

# Serve static files from the 'example_data' folder (for testing with mock JSON response)
from fastapi.staticfiles import StaticFiles
app.mount("/example_data", StaticFiles(directory="example_data"), name="example_data")

# Define the expected structure of incoming POST requests
class Message(BaseModel):
    text: str  # The message content to analyze

# Define the /analyze endpoint to receive messages and analyze their emotional tone
@app.post("/analyze")
def analyze_message(message: Message):
    # Construct the prompt for the language model
    prompt = f"""
    Analyze the following message and respond in JSON format with:
    - "tone": emotional tone (e.g., angry, sarcastic, passive-aggressive, self-deprecating, neutral)
    - "feedback": supportive message
    - "suggestion": gentler alternative (or null)
    Message: "{message.text}"
    """

    try:
        # Log the incoming message for debugging
        print(f"[INFO] Incoming message: {message.text}")

        # Send the prompt to OpenAI's Chat API
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a kind, supportive assistant helping users understand and rephrase messages with empathy."},
                {"role": "user", "content": prompt}
            ]
        )

        # Extract the LLM's response
        reply = response.choices[0].message["content"]

        # Convert the string response into a JSON object
        result = json.loads(reply)

        # Log the response for debugging
        print(f"[INFO] LLM response: {result}")

        return result

    # Handle case where the model returns invalid JSON
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="❌ Failed to parse LLM response. Try again or adjust prompt.")

    # Handle authentication errors (wrong or missing API key)
    except openai.error.AuthenticationError:
        raise HTTPException(status_code=401, detail="🔐 Invalid OpenAI API key.")

    # Catch-all for other unexpected errors
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"🔥 Unexpected error: {str(e)}")
