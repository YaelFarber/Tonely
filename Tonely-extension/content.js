console.log("התוסף נטען ✅");

let suppressNextClick = false; // ← Prevent Tonely from re-triggering itself


// Keep track of the current send button
let currentSendButton = null;

// Check for send button every 500ms in case WhatsApp replaces it
const interval = setInterval(() => {
  const sendButton = document.querySelector('[aria-label="שליחה"]');

  // Only proceed if there's a button AND it's not already handled
  if (sendButton && sendButton !== currentSendButton) {
    console.log("✅ כפתור השליחה נמצא!");
    currentSendButton = sendButton;

    sendButton.addEventListener("click", async (event) => {
      if (suppressNextClick) {
        suppressNextClick = false; // Reset suppression for future clicks
        return; // Skip handling this click (it's triggered programmatically)
      }
    
      // Locate the input message box
      const inputBox = document.querySelector('div[aria-label="הקלדת הודעה"]');
      if (inputBox) {
        const message = inputBox?.innerText?.trim();
    
        // 🛡️ Skip analysis if there's no actual text (e.g., image or emoji only)
        if (!message || message === "") {
          console.log("ℹ️ אין טקסט להעריך – ייתכן שזו תמונה, קובץ או אמוג'י בלבד. לא נעשתה בדיקה.");
          return;
        }
    
        console.log("💬 ההודעה שנקלטה:", message);
    
        // Prevent the default message sending
        inputBox.innerText = "";
        event.stopImmediatePropagation();
        event.preventDefault();
    
        // 🔍 Call LLM or backend to get tone feedback
        const feedback = await fetchToneFeedback(message);
    
        // Handle flagged tone
        if (feedback.flagged) {
          showTonePopup(message, feedback.analysisText);
          console.log("⚠️ טונלי זיהה טון רגיש והציג פופאפ.");
        } else {
          sendOriginalMessage(message);
          console.log("✅ הטון תקין - ההודעה נשלחה כרגיל.");
        }
      } else {
        console.log("❗ לא נמצא שדה הקלדה – ייתכן שמבנה הדף השתנה.");
      }
    }, true);
    
      
  }
}, 500);

// Real integration with FastAPI server on Render
async function fetchToneFeedback(messageText) {
  try {
    const res = await fetch("https://tonely.onrender.com/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text: messageText })
    });

    if (!res.ok) throw new Error("Server returned an error");

    const data = await res.json();
    console.log("📡 תשובת ה־API התקבלה:", data);

    // If the message is marked as problematic and there is feedback → trigger popup
    if (data.problematic === true && data.feedback) {
      console.log("⚠️ ההודעה עלולה להיקלט כפוגענית או רגישה");
      return {
        flagged: true,
        analysisText: data.feedback
      };
    }

    // Otherwise, message is considered safe
    console.log("✅ ההודעה ניטרלית או בטוחה – תישלח כרגיל.");
    return { flagged: false };

  } catch (err) {
    console.error("❌ שגיאה בחיבור לשרת ה־LLM:", err);
    return { flagged: false }; // fallback: send message anyway
  }
}

/**
 * Speaks a given Hebrew text aloud using the Web Speech API.
 * This function looks for a Hebrew voice and uses it if available.
 * Can be used to add an optional "listen" button to your UI.
 *
 * @param {string} text - The Hebrew text to be spoken aloud.
 */
function speakText(text) {
  // Cancel any ongoing speech before starting a new one
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "he-IL"; // Set language to Hebrew
  utterance.rate = 1;       // Normal speaking rate
  utterance.pitch = 1;      // Normal pitch
  utterance.volume = 1;     // Full volume

  // Try to select a Hebrew voice (if available)
  const voices = window.speechSynthesis.getVoices();
  const hebrewVoice = voices.find(voice => voice.lang === "he-IL");

  if (hebrewVoice) {
    utterance.voice = hebrewVoice;
    console.log("🔊 קול עברי נמצא והוגדר.");
  } else {
    console.log("⚠️ קול עברי לא נמצא, משתמשים בקול ברירת מחדל.");
  }

  // Speak the text
  window.speechSynthesis.speak(utterance);
  console.log("📢 מקריא את הטקסט: ", text);
}


// Function to apply hover effects to a button
function applyHoverEffects(button, originalColor = null, hoverColor = null) {
  button.addEventListener("mouseenter", () => {
    button.style.filter = "brightness(1.1)";
    button.style.boxShadow = "0 2px 6px rgba(0,0,0,0.1)";
    if (hoverColor) button.style.backgroundColor = hoverColor;
  });

  button.addEventListener("mouseleave", () => {
    button.style.filter = "none";
    button.style.boxShadow = "none";
    if (originalColor) button.style.backgroundColor = originalColor;
  });
}


// Function to show the tone feedback popup
function showTonePopup(originalMessage, analysisText) {
  const existingPopup = document.getElementById("tone-popup");
  if (existingPopup) existingPopup.remove();

  const popup = document.createElement("div");
  popup.id = "tone-popup";

  // === Shared styling ===
  popup.style.position = "fixed";
  popup.style.bottom = "20px";
  popup.style.left = "20px";
  popup.style.backgroundColor = "#ffffff";
  popup.style.border = "1px solid #ddd";
  popup.style.padding = "20px";
  popup.style.borderRadius = "16px";
  popup.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
  popup.style.zIndex = "9999";
  popup.style.fontFamily = "sans-serif";
  popup.style.maxWidth = "360px";
  popup.style.direction = "rtl";
  popup.style.opacity = "0";
  popup.style.transform = "translateY(10px)";
  popup.style.transition = "opacity 0.3s ease, transform 0.3s ease";

  // === Initial content ===
  const topRow = document.createElement("div");
  topRow.className = "tone-row";
  topRow.style.display = "flex";
  topRow.style.alignItems = "flex-start";
  topRow.style.justifyContent = "flex-start";
  topRow.style.gap = "12px";
  topRow.style.marginBottom = "16px";

  const tonelyImg = document.createElement("img");
  tonelyImg.src = chrome.runtime.getURL("assets/Tonely.png");
  tonelyImg.alt = "Tonely character";
  tonelyImg.style.height = "60px";
  tonelyImg.style.flexShrink = "0";

  const bubble = document.createElement("div");
  bubble.className = "tone-bubble";
  bubble.textContent = "היי, רק רציתי לשאול... רוצה לשמוע איך זה אולי יישמע?";
  Object.assign(bubble.style, {
    backgroundColor: "#eef5f8",
    padding: "10px 14px",
    borderRadius: "16px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    fontSize: "15px",
    lineHeight: "1.5",
    direction: "rtl",
    transition: "all 0.3s ease"
  });

  topRow.appendChild(tonelyImg);
  topRow.appendChild(bubble);

  const buttonRow = document.createElement("div");
  buttonRow.className = "tone-buttons";
  buttonRow.style.display = "flex";
  buttonRow.style.flexDirection = "row-reverse";
  buttonRow.style.gap = "8px";

  const readButton = document.createElement("button");
  readButton.textContent = "כן, קרא לי רגע";
  const sendButton = document.createElement("button");
  sendButton.textContent = "שלח כמו שהוא";

  [readButton, sendButton].forEach(btn => {
    Object.assign(btn.style, {
      padding: "8px 14px",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "14px"
    });
  });

  readButton.style.backgroundColor = "#fff";
  readButton.style.border = "1px solid #ccc";
  readButton.style.color = "#333";
  sendButton.style.backgroundColor = "#00a884";
  sendButton.style.color = "white";

  applyHoverEffects(readButton);
  applyHoverEffects(sendButton, "#00a884", "#00866d");

  buttonRow.appendChild(readButton);
  buttonRow.appendChild(sendButton);

  popup.appendChild(topRow);
  popup.appendChild(buttonRow);
  document.body.appendChild(popup);
  requestAnimationFrame(() => {
    popup.style.opacity = "1";
    popup.style.transform = "translateY(0)";
  });

  sendButton.addEventListener("click", () => {
    sendOriginalMessage(originalMessage);
    popup.remove();
    console.log("📨 המשתמש בחר לשלוח את ההודעה כרגיל.");
  });

  readButton.addEventListener("click", () => {
    popup.style.transition = "all 0.3s ease";
    popup.style.transform = "scale(0.97) translateY(5px)";
    popup.style.opacity = "0";
    setTimeout(() => {
      popup.innerHTML = "";

      const feedbackRow = document.createElement("div");
      feedbackRow.style.display = "flex";
      feedbackRow.style.alignItems = "flex-start";
      feedbackRow.style.justifyContent = "flex-start";
      feedbackRow.style.gap = "12px";
      feedbackRow.style.marginBottom = "16px";

      const feedbackImg = tonelyImg.cloneNode();

      const feedbackBubble = document.createElement("div");
      feedbackBubble.textContent = analysisText;
      Object.assign(feedbackBubble.style, {
        backgroundColor: "#f5f8fa",
        padding: "10px 14px",
        borderRadius: "16px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        fontSize: "15px",
        lineHeight: "1.5",
        direction: "rtl"
      });

      feedbackRow.appendChild(feedbackImg);
      feedbackRow.appendChild(feedbackBubble);

      const actionRow = document.createElement("div");
      actionRow.style.display = "flex";
      actionRow.style.flexDirection = "row-reverse";
      actionRow.style.gap = "8px";

      const editButton = document.createElement("button");
      editButton.textContent = "ערוך הודעה";
      const sendAnywayButton = document.createElement("button");
      sendAnywayButton.textContent = "שלח בכל זאת";

      [editButton, sendAnywayButton].forEach(btn => {
        Object.assign(btn.style, {
          padding: "8px 14px",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "14px"
        });
      });

      editButton.style.backgroundColor = "#fff";
      editButton.style.border = "1px solid #ccc";
      editButton.style.color = "#333";
      sendAnywayButton.style.backgroundColor = "#00a884";
      sendAnywayButton.style.color = "white";

      applyHoverEffects(editButton);
      applyHoverEffects(sendAnywayButton, "#00a884", "#00866d");

      actionRow.appendChild(editButton);
      actionRow.appendChild(sendAnywayButton);

      // === Add speak button ===
      const speakButton = document.createElement("button");
      speakButton.textContent = "🔊 השמע לי את זה";
      Object.assign(speakButton.style, {
        backgroundColor: "#eef5f8",
        color: "#333",
        border: "none",
        borderRadius: "8px",
        padding: "8px 14px",
        fontSize: "14px",
        cursor: "pointer"
      });

      speakButton.addEventListener("click", () => {
        speakText(analysisText);
        console.log("🔊 טונלי הקריא את הפידבק בקול.");
      });

      applyHoverEffects(speakButton);

      actionRow.appendChild(speakButton);

      const closeBtn = document.createElement("button");
      closeBtn.textContent = "×";
      Object.assign(closeBtn.style, {
        position: "absolute",
        top: "8px",
        left: "12px",
        background: "none",
        border: "none",
        fontSize: "18px",
        cursor: "pointer"
      });
      closeBtn.onclick = () => popup.remove();

      popup.appendChild(closeBtn);
      popup.appendChild(feedbackRow);
      popup.appendChild(actionRow);

      requestAnimationFrame(() => {
        popup.style.opacity = "1";
        popup.style.transform = "scale(1) translateY(0)";
      });

      editButton.addEventListener("click", () => {
        const inputBox = document.querySelector('div[aria-label="הקלדת הודעה"]');
        if (inputBox) inputBox.innerText = originalMessage;
        popup.remove();
        console.log("✏️ המשתמש בחר לערוך את ההודעה.");
      });

      sendAnywayButton.addEventListener("click", () => {
        sendOriginalMessage(originalMessage);
        popup.remove();
        console.log("📨 המשתמש בחר לשלוח את ההודעה בכל זאת.");
      });
    }, 300);
  });
}


function sendOriginalMessage(text) {
  const inputBox = document.querySelector('div[aria-label="הקלדת הודעה"]');
  if (!inputBox) {
    console.error("❌ תיבת ההקלדה לא נמצאה.");
    return;
  }

  inputBox.innerText = text;
  inputBox.dispatchEvent(new InputEvent("input", { bubbles: true }));

  setTimeout(() => {
    const sendButton = document.querySelector('button[aria-label="שליחה"]');
    if (sendButton) {
      suppressNextClick = true; // ← IGNORE this next programmatic click
      sendButton.click();
      console.log("📤 ההודעה נשלחה בהצלחה על ידי Tonely.");
    } else {
      console.error("❌ כפתור שליחה לא נמצא.");
    }
  }, 100);
}



