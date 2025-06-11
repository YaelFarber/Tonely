console.log("התוסף נטען ✅");

// Keep track of the current send button
let currentSendButton = null;

// Check for send button every 500ms in case WhatsApp replaces it
const interval = setInterval(() => {
  const sendButton = document.querySelector('[aria-label="שליחה"]');

  // Only proceed if there's a button AND it's not already handled
  if (sendButton && sendButton !== currentSendButton) {
    console.log("✅ כפתור השליחה נמצא!");
    currentSendButton = sendButton;

    // Attach listener in capture phase to intercept before WhatsApp handles it
    sendButton.addEventListener("click", (event) => {
      const inputBox = document.querySelector('div[aria-label="הקלדת הודעה"]');
      if (inputBox) {
        const message = inputBox.innerText.trim();
        console.log("💬 ההודעה שנקלטה:", message);

        // Clear message text to prevent sending
        inputBox.innerText = "";

        // Stop the event from continuing (prevent message from sending)
        event.stopImmediatePropagation();
        event.preventDefault();

        console.log("🛑 ההודעה נמחקה ונחסמה למשלוח.");
      }
    }, true); // capture mode
  }
}, 500);
