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

    # Log the incoming message for debugging
    print(f"[INFO] Incoming message: {message.text}")

    try:
        # Send the prompt to OpenAI's Chat API 

        client = OpenAI()
        client.api_key = API_KEY
        completion = client.chat.completions.create(
          model="gpt-4o",
          messages=[
            {"role": "developer", "content": "You are a kind, supportive assistant helping users understand and rephrase messages with empathy."},
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
