import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { PreviewDetails } from "../../components/assistant/preview-details";
function Review() {
  const [index, setIndex] = useState(0);
  return <main>
    <p className="aw-eyebrow">Local synthetic acceptance — not authenticated hosted evidence</p>
    <h1>Apopka campaign personalization</h1>
    <nav aria-label="Synthetic test account">
      {["Subscriber A", "Subscriber B", "Missing business fields"].map((label, i) => <button key={label} onClick={() => setIndex(i)}>{label}</button>)}
    </nav>
    <article className="assistant-preview"><PreviewDetails proposal={window.fixture[index]} /></article>
  </main>;
}
createRoot(document.getElementById("root")).render(<Review />);
