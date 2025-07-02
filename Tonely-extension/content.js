console.log("התוסף נטען ✅");

// Add global CSS style for highlighting problematic words (only once)
const highlightStyle = document.createElement("style");
highlightStyle.innerHTML = `
  .highlighted-word {
    background-color: rgba(255, 0, 0, 0.15);
    border-radius: 4px;
    padding: 0 4px;
    cursor: help;
  }
`;
document.head.appendChild(highlightStyle);


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
        
        const incomingMessages = document.querySelectorAll(".message-in");
        const lastIncoming = incomingMessages[incomingMessages.length - 1];
        const contextText = lastIncoming?.innerText?.trim() || "";
        console.log("📥 ההודעה האחרונה מהצד השני:", contextText);

    
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
        const feedback = await fetchToneFeedback(message, contextText);
    
        // Handle flagged tone
        if (feedback.flagged) {
          showTonePopup(message, feedback.analysisText, feedback.highlightedWords, feedback.suggestedRewrite);
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

/**
 * Sends the user's message text to the tone analysis API and returns the result.
 * If the tone is problematic, the function includes feedback and a list of problematic words.
 * 
 * @param {string} messageText - The text to analyze.
 * @param {string} contextText - The last incoming message text for context. 
 * @returns {Promise<{ flagged: boolean, analysisText?: string, highlightedWords?: string[] }>}
 */
async function fetchToneFeedback(messageText, contextText) {
  try {
    const res = await fetch("https://tonely.onrender.com/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text: messageText, context: contextText })
    });

    if (!res.ok) throw new Error("Server returned an error");

    const data = await res.json();
    console.log("📡 תשובת ה־API התקבלה:", data);

    // If the message is marked as problematic and there is feedback → trigger popup
    if (data.problematic === true && data.feedback) {
      console.log("⚠️ ההודעה עלולה להיקלט כפוגענית או רגישה");
      return {
        flagged: true,
        analysisText: data.feedback,
        highlightedWords: data.problematic_words || [],
        suggestedRewrite: data.suggested_rewrite || null
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
function showTonePopup(originalMessage, analysisText, highlightedWords = [], suggestedRewrite = null) {
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
  // Limit popup height to avoid overflowing small screens
  popup.style.maxHeight = "80vh";           // Prevents the popup from exceeding 80% of the screen height
  popup.style.overflowY = "auto";           // Enables vertical scroll when content is too long
  popup.style.scrollbarWidth = "thin";      // Optional: makes scrollbar slimmer in Firefox
  popup.style.overscrollBehavior = "contain"; // Prevents scroll chaining to background


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
  bubble.textContent = "היי, יש לי משהו קטן להגיד... רוצה לשמוע?";
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
  // Add buttons and settings menu
  const { highlightCheckbox, altTextCheckbox } = createSettingsMenu(popup);
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

      const useHighlight = highlightCheckbox?.checked;
      const problematicWords = highlightedWords || [];

      feedbackBubble.textContent = analysisText

      if (useHighlight && originalMessage && problematicWords.length > 0) {
        const originalMessageHeader = document.createElement("div");
        originalMessageHeader.textContent = "מילים רגישות בהודעתך:";
        Object.assign(originalMessageHeader.style, {
          fontWeight: "bold",
          marginTop: "8px",
          marginBottom: "4px",
          fontSize: "14px",
          color: "#333"
        });
      
        const originalMessageBox = document.createElement("div");
        originalMessageBox.innerHTML = highlightWordsInFeedback(originalMessage, problematicWords);
        Object.assign(originalMessageBox.style, {
          backgroundColor: "#fffaf0",
          padding: "10px 14px",
          borderRadius: "12px",
          border: "1px solid #eee",
          fontSize: "14px",
          lineHeight: "1.5",
          direction: "rtl",
          whiteSpace: "pre-wrap"
        });

      
        feedbackBubble.appendChild(originalMessageHeader);
        feedbackBubble.appendChild(originalMessageBox);
      }

      appendSuggestedRewrite(feedbackBubble, suggestedRewrite, altTextCheckbox);
      

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

//settings⚙️
function createSettingsMenu(popup) {
  // Create the settings toggle button
  const settingsBtn = document.createElement("button");
  settingsBtn.textContent = "⚙️";
  Object.assign(settingsBtn.style, {
    position: "absolute",
    bottom: "12px",
    right: "12px",
    background: "none",
    border: "none",
    fontSize: "18px",
    cursor: "pointer"
  });

  // Create the settings dropdown menu
  const settingsMenu = document.createElement("div");
  settingsMenu.style.display = "none";
  Object.assign(settingsMenu.style, {
    position: "absolute",
    bottom: "48px", // above the button
    right: "12px",
    backgroundColor: "#f9f9f9",
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "8px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    fontSize: "14px",
    zIndex: "10000"
  });

  // Create checkbox for highlighting problematic words
  const highlightOption = document.createElement("label");
  const highlightCheckbox = document.createElement("input");
  highlightCheckbox.type = "checkbox";
  highlightCheckbox.style.marginLeft = "6px";
  highlightOption.appendChild(highlightCheckbox);
  highlightOption.appendChild(document.createTextNode("סמן מילים רגישות"));
  highlightOption.style.display = "block";
  highlightOption.style.marginBottom = "6px";

  // Create checkbox for alternative rephrasing
  const altTextOption = document.createElement("label");
  const altTextCheckbox = document.createElement("input");
  altTextCheckbox.type = "checkbox";
  altTextCheckbox.style.marginLeft = "6px";
  altTextOption.appendChild(altTextCheckbox);
  altTextOption.appendChild(document.createTextNode("הצג ניסוח חלופי"));
  altTextOption.style.display = "block";

  // Add options to the menu
  settingsMenu.appendChild(highlightOption);
  settingsMenu.appendChild(altTextOption);

  // Toggle menu visibility
  settingsBtn.addEventListener("click", () => {
    settingsMenu.style.display = settingsMenu.style.display === "none" ? "block" : "none";
    console.log("⚙️ תפריט הגדרות נפתח/נסגר");
  });

  // Append both elements directly to the popup container
  popup.appendChild(settingsBtn);
  popup.appendChild(settingsMenu);

  return {
    highlightCheckbox,
    altTextCheckbox
  };
}

/**
   * Highlights given words in a feedback string by wrapping them with <span>.
   * @param {string} feedbackText - The full feedback text from the LLM.
   * @param {string[]} words - Array of problematic words to highlight.
   * @returns {string} - The HTML string with highlighted spans.
   */
function highlightWordsInFeedback(feedbackText, words) {
  if (!words || words.length === 0) return feedbackText;

  const escapedWords = words.map(w =>
    w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );

  console.log("🔍 Highlighting words:", words);
  console.log("🔍 Escaped pattern:", escapedWords.join("|"));

  const regex = new RegExp(`(${escapedWords.join("|")})`, "gi");

  return feedbackText.replace(regex, match => {
    console.log("✨ Matching:", match);
    return `<span class="highlighted-word">${match}</span>`;
  });
}


/**
 * Appends the suggested rewrite to the feedback bubble if the option is enabled.
 * Displays the suggestion in a styled box with a copy button underneath.
 * The user can click the button to copy the text manually.
 *
 * @param {HTMLElement} container - The DOM element to which the rewrite block should be added.
 * @param {string} suggestedRewrite - The alternative message to suggest.
 * @param {HTMLInputElement} checkbox - The checkbox that enables this feature.
 */
function appendSuggestedRewrite(container, suggestedRewrite, checkbox) {
  if (!checkbox?.checked || !suggestedRewrite) return;

  // Label for the section
  const rewriteLabel = document.createElement("div");
  rewriteLabel.textContent = "ניסוח מוצע:";
  Object.assign(rewriteLabel.style, {
    fontWeight: "bold",
    marginTop: "12px",
    marginBottom: "4px",
    fontSize: "14px",
    color: "#333"
  });

  // The text box displaying the suggested message
  const rewriteBox = document.createElement("div");
  rewriteBox.textContent = suggestedRewrite;
  Object.assign(rewriteBox.style, {
    backgroundColor: "#f0f8ff",
    padding: "10px 14px",
    borderRadius: "12px",
    border: "1px solid #cce",
    fontSize: "14px",
    lineHeight: "1.5",
    direction: "rtl",
    userSelect: "text",
    whiteSpace: "pre-wrap"
  });

  // Copy button below the box
  const copyBtn = document.createElement("button");
  copyBtn.textContent = "📋 העתק";
  Object.assign(copyBtn.style, {
    marginTop: "6px",
    fontSize: "13px",
    padding: "6px 10px",
    cursor: "pointer",
    border: "1px solid #aaa",
    backgroundColor: "#fff",
    borderRadius: "8px",
    transition: "background-color 0.2s ease"
  });

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(suggestedRewrite);
      copyBtn.textContent = "✅ הועתק!";
      setTimeout(() => (copyBtn.textContent = "📋 העתק"), 1500);
    } catch (err) {
      console.error("❌ שגיאה בהעתקה:", err);
      copyBtn.textContent = "⚠️ נסה שוב";
    }
  });

  // Wrap and insert all
  container.appendChild(rewriteLabel);
  container.appendChild(rewriteBox);
  container.appendChild(copyBtn);
}



// send the original message
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



