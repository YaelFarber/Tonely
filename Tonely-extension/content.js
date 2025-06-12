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
        suppressNextClick = false; // Reset the flag for future sends
        return; // Don't handle this click – it's from Tonely
      }
    
      const inputBox = document.querySelector('div[aria-label="הקלדת הודעה"]');
      if (inputBox) {
        const message = inputBox.innerText.trim();
        console.log("💬 ההודעה שנקלטה:", message);
    
        // Block the original send
        inputBox.innerText = "";
        event.stopImmediatePropagation();
        event.preventDefault();
    
        // Use real LLM-based tone analysis
        const feedback = await fetchToneFeedback(message);
    
        if (feedback.flagged) {
          showTonePopup(message, feedback.analysisText);
          console.log("⚠️ טונלי זיהה טון רגיש והציג פופאפ.");
        } else {
          sendOriginalMessage(message);
          console.log("✅ הטון תקין - ההודעה נשלחה כרגיל.");
        }
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


function showTonePopup(originalMessage, analysisText) {
  const existingPopup = document.getElementById("tone-popup");
  if (existingPopup) {
    existingPopup.remove();
  }

  const popup = document.createElement("div");
  popup.id = "tone-popup";

  // === Character + bubble container ===
  const topRow = document.createElement("div");
  topRow.style.display = "flex";
  topRow.style.alignItems = "flex-start";
  topRow.style.justifyContent = "flex-start";
  topRow.style.gap = "12px";
  topRow.style.marginBottom = "16px";

  // === Tonely image ===
  const tonelyImg = document.createElement("img");
  tonelyImg.src = chrome.runtime.getURL("assets/Tonely.png");
  tonelyImg.alt = "Tonely character";
  tonelyImg.style.height = "60px";
  tonelyImg.style.width = "auto";
  tonelyImg.style.flexShrink = "0";

  // === Speech bubble ===
  const bubble = document.createElement("div");
  bubble.textContent = "היי, רק רציתי לשאול... רוצה לשמוע איך זה אולי יישמע?";
  bubble.style.backgroundColor = "#eef5f8";
  bubble.style.padding = "10px 14px";
  bubble.style.borderRadius = "16px";
  bubble.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
  bubble.style.fontSize = "15px";
  bubble.style.lineHeight = "1.5";
  bubble.style.direction = "rtl";

  topRow.appendChild(tonelyImg);
  topRow.appendChild(bubble);

  // === Buttons ===
  const buttonRow = document.createElement("div");
  buttonRow.style.display = "flex";
  buttonRow.style.flexDirection = "row-reverse";
  buttonRow.style.gap = "8px";

  const readButton = document.createElement("button");
  readButton.textContent = "כן, קרא לי רגע";

  const sendButton = document.createElement("button");
  sendButton.textContent = "שלח כמו שהוא";

  [readButton, sendButton].forEach((btn) => {
    btn.style.padding = "8px 14px";
    btn.style.border = "none";
    btn.style.borderRadius = "8px";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "14px";
  });

  readButton.style.backgroundColor = "#fff";
  readButton.style.border = "1px solid #ccc";
  readButton.style.color = "#333";

  sendButton.style.backgroundColor = "#00a884";
  sendButton.style.color = "white";

  buttonRow.appendChild(readButton);
  buttonRow.appendChild(sendButton);

  // === Popup styling ===
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

  // Append everything
  popup.appendChild(topRow);
  popup.appendChild(buttonRow);
  document.body.appendChild(popup);

  // Animate in
  requestAnimationFrame(() => {
    popup.style.opacity = "1";
    popup.style.transform = "translateY(0)";
  });

  // Button logic
  sendButton.addEventListener("click", () => {
    sendOriginalMessage(originalMessage);
    popup.remove();
    console.log("📨 המשתמש בחר לשלוח את ההודעה כרגיל.");
  });

  readButton.addEventListener("click", () => {
  popup.innerHTML = "";

  // === Character + bubble container ===
  const feedbackRow = document.createElement("div");
  feedbackRow.style.display = "flex";
  feedbackRow.style.alignItems = "flex-start";
  feedbackRow.style.justifyContent = "flex-start";
  feedbackRow.style.gap = "12px";
  feedbackRow.style.marginBottom = "16px";

  const feedbackImg = document.createElement("img");
  feedbackImg.src = chrome.runtime.getURL("assets/Tonely.png");
  feedbackImg.alt = "Tonely character";
  feedbackImg.style.height = "60px";
  feedbackImg.style.width = "auto";
  feedbackImg.style.flexShrink = "0";

  const feedbackBubble = document.createElement("div");
  feedbackBubble.textContent = analysisText;
  feedbackBubble.style.backgroundColor = "#f5f8fa";
  feedbackBubble.style.padding = "10px 14px";
  feedbackBubble.style.borderRadius = "16px";
  feedbackBubble.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
  feedbackBubble.style.fontSize = "15px";
  feedbackBubble.style.lineHeight = "1.5";
  feedbackBubble.style.direction = "rtl";

  feedbackRow.appendChild(feedbackImg);
  feedbackRow.appendChild(feedbackBubble);

  // === Action buttons ===
  const actionRow = document.createElement("div");
  actionRow.style.display = "flex";
  actionRow.style.flexDirection = "row-reverse";
  actionRow.style.gap = "8px";

  const editButton = document.createElement("button");
  editButton.textContent = "ערוך הודעה";

  const sendAnywayButton = document.createElement("button");
  sendAnywayButton.textContent = "שלח בכל זאת";

  [editButton, sendAnywayButton].forEach((btn) => {
    btn.style.padding = "8px 14px";
    btn.style.border = "none";
    btn.style.borderRadius = "8px";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "14px";
  });

  editButton.style.backgroundColor = "#fff";
  editButton.style.border = "1px solid #ccc";
  editButton.style.color = "#333";

  sendAnywayButton.style.backgroundColor = "#00a884";
  sendAnywayButton.style.color = "white";

  actionRow.appendChild(editButton);
  actionRow.appendChild(sendAnywayButton);

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  closeBtn.style.position = "absolute";
  closeBtn.style.top = "8px";
  closeBtn.style.left = "12px";
  closeBtn.style.background = "none";
  closeBtn.style.border = "none";
  closeBtn.style.fontSize = "18px";
  closeBtn.style.cursor = "pointer";
  closeBtn.onclick = () => popup.remove();
  popup.appendChild(closeBtn);


  // Append everything to popup
  popup.appendChild(feedbackRow);
  popup.appendChild(actionRow);

  // Button actions
  editButton.addEventListener("click", () => {
    const inputBox = document.querySelector('div[aria-label="הקלדת הודעה"]');
    if (inputBox) {
      inputBox.innerText = originalMessage;
    }
    popup.remove();
    console.log("✏️ המשתמש בחר לערוך את ההודעה.");
  });

  sendAnywayButton.addEventListener("click", () => {
    sendOriginalMessage(originalMessage);
    popup.remove();
    console.log("📨 המשתמש בחר לשלוח את ההודעה בכל זאת.");
  });
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



