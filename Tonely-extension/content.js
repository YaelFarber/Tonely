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
  // Remove existing popup if one exists
  const existingPopup = document.getElementById("tone-popup");
  if (existingPopup) {
    existingPopup.remove();
  }

  // Create popup container
  const popup = document.createElement("div");
  popup.id = "tone-popup";

  // Create text: "Tonely has something to say"
  const messageText = document.createElement("p");
  messageText.innerHTML = 'ל<span dir="ltr">Tonely</span> יש משהו לומר, תרצה לשמוע?';
  messageText.style.marginBottom = "12px";

  // Create "Read" button
  const readButton = document.createElement("button");
  readButton.textContent = "קרא";

  // Create "Send" button
  const sendButton = document.createElement("button");
  sendButton.textContent = "שלח";

  // Shared styling
  [readButton, sendButton].forEach((btn) => {
    btn.style.padding = "6px 12px";
    btn.style.border = "none";
    btn.style.borderRadius = "6px";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "14px";
    btn.style.marginLeft = "8px";
  });

  readButton.style.backgroundColor = "#eee";
  sendButton.style.backgroundColor = "#00a884";
  sendButton.style.color = "white";

  // Add buttons and text to popup
  popup.appendChild(messageText);
  popup.appendChild(readButton);
  popup.appendChild(sendButton);

  // Style the popup
  popup.style.position = "fixed";
  popup.style.bottom = "20px";
  popup.style.left = "20px";
  popup.style.backgroundColor = "#fff";
  popup.style.border = "1px solid #ccc";
  popup.style.padding = "16px";
  popup.style.borderRadius = "8px";
  popup.style.boxShadow = "0 2px 6px rgba(0,0,0,0.15)";
  popup.style.zIndex = "9999";
  popup.style.fontFamily = "sans-serif";
  popup.style.maxWidth = "300px";

  // Append to the page
  document.body.appendChild(popup);

  // ✅ "Send" button logic: Send the message anyway
  sendButton.addEventListener("click", () => {
    sendOriginalMessage(originalMessage); // you already have this function
    popup.remove();
    console.log("📨 המשתמש בחר לשלוח את ההודעה כרגיל.");
  });

  // ✅ "Read" button logic: Show the analysis and add "Edit" option
  readButton.addEventListener("click", () => {
    popup.innerHTML = ""; // Clear existing content

    const feedbackText = document.createElement("p");
    feedbackText.textContent = analysisText;
    feedbackText.style.marginBottom = "12px";

    const editButton = document.createElement("button");
    editButton.textContent = "ערוך הודעה";

    const sendAnywayButton = document.createElement("button");
    sendAnywayButton.textContent = "שלח בכל זאת";

    [editButton, sendAnywayButton].forEach((btn) => {
      btn.style.padding = "6px 12px";
      btn.style.border = "none";
      btn.style.borderRadius = "6px";
      btn.style.cursor = "pointer";
      btn.style.fontSize = "14px";
      btn.style.marginLeft = "8px";
    });

    editButton.style.backgroundColor = "#f0f0f0";
    sendAnywayButton.style.backgroundColor = "#00a884";
    sendAnywayButton.style.color = "white";

    popup.appendChild(feedbackText);
    popup.appendChild(editButton);
    popup.appendChild(sendAnywayButton);

    // Edit button: Put message back in input box
    editButton.addEventListener("click", () => {
      const inputBox = document.querySelector('div[aria-label="הקלדת הודעה"]');
      if (inputBox) {
        inputBox.innerText = originalMessage;
      }
      popup.remove();
      console.log("✏️ המשתמש בחר לערוך את ההודעה.");
    });

    // Send anyway button
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



