async function analyze() {
  const text = document.getElementById("userMessage").value;
  const outputDiv = document.getElementById("output");
  const toneSpan = document.getElementById("tone");
  const feedbackSpan = document.getElementById("feedback");
  const suggestionDiv = document.getElementById("suggestion");

 
  outputDiv.style.display = "none";
  toneSpan.innerText = "";
  feedbackSpan.innerText = "";
  suggestionDiv.innerText = "";

  try {
    const response = await fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "שגיאה כללית בשרת");
    }

    const data = await response.json();

    toneSpan.innerText = data.tone || "לא זוהה";
    feedbackSpan.innerText = data.feedback || "—";
    suggestionDiv.innerText = data.suggestion || "—";
    outputDiv.style.display = "block";

  } catch (error) {
    outputDiv.style.display = "block";
    toneSpan.innerText = "⚠️";
    feedbackSpan.innerText = "נראה שיש בעיה זמנית: " + error.message;
    suggestionDiv.innerText = "נסה שוב בעוד רגע או בדוק את החיבור";
  }
}
