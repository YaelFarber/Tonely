# Tonely

**Tonely** is a real-time emotional tone assistant for messaging platforms like WhatsApp Web.  
Built as a Chrome Extension with a GPT-based FastAPI backend, it helps users catch emotionally charged messages — *just before* they’re sent.

Whether it's anger, passive-aggressiveness, or unintended coldness, **Tonely gently reflects your tone**, helping you avoid unnecessary conflict and communicate more mindfully.

---

## 💡 The Problem

Text messages often lack tone.  
A message meant as neutral can come off as rude, sarcastic, or dismissive — hurting relationships.

---

## 🏯 Our Solution

Tonely intercepts outgoing messages at the **moment of sending**, detects emotionally sensitive language, and displays **non-judgmental feedback** like:

> _“This might sound harsh. Is that your intention?”_

Users can choose to send, edit, or ignore.

---

## ✨ Key Features

- Real-time emotional tone analysis
- Soft, empathetic feedback (no rewriting)
- Supports Hebrew, English, and more
- Chrome Extension for WhatsApp Web
- GPT-powered backend via FastAPI

---

## 🛠️ Tech Stack

- **Frontend**: JavaScript, HTML/CSS (Chrome Extension)
- **Backend**: Python, FastAPI, OpenAI API
- **Infra**: CORS-enabled API, local dev server, `.env` config

---

## 🧪 Quick Start

```bash
# Clone project
git clone https://github.com/YaelFarber/Tonely.git
cd Tonely

# Install frontend
npm install

# Install backend
pip install -r requirements.txt

# Run FastAPI
uvicorn main:app --reload
```

To load the extension in Chrome:
1. Go to `chrome://extensions`
2. Enable Developer Mode
3. Load `/Tonely/extension` as unpacked

---

## 📁 Project Structure

```
Tonely/
├── extension/      # Chrome extension frontend
├── backend/        # FastAPI tone analysis server
├── public/         # Assets
├── .env            # API keys
└── README.md       # Project docs
```

---

## 👥 Team

**Tonely** was created during the 2025 Hackathon by:  
- Hila Rosental   (https://github.com/Hila687)
- Yael Farber      (https://github.com/YaelFarber)
- Hila Miller         (https://github.com/HilaMiller) 
- Tamar Rozen   (https://github.com/tamarrozen) 


---

## 🧠 Why Tonely Stands Out

Compared to tools like Grammarly or Google Smart Compose, Tonely:

| Feature                          | Tonely  | Others  |
|----------------------------------|---------|---------|
| Real-time tone alerts            | ✅       | ❌      |
| Emotional reflection (not grammar) | ✅    | ❌      |
| Hebrew support                   | ✅       | ❌      |
| Non-intrusive feedback           | ✅       | ⚠️      |
| Built into existing messaging    | ✅       | ❌      |

---

## 📜 License

MIT License

---

> _“We didn’t even know most of these technologies when we started.  
Thanks to the hackathon, Tonely came to life — and we’ve been using it ever since!”_  
— Team Tonely
