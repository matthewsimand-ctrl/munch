import { createRoot } from "react-dom/client";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

rootElement.innerHTML = `
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#fffaf5;padding:24px;font-family:'Plus Jakarta Sans',system-ui,sans-serif;">
    <div style="text-align:center;">
      <div style="font-family:'Fraunces',Georgia,serif;font-size:28px;font-weight:700;color:#1c1917;">Munch</div>
      <div style="margin-top:8px;font-size:14px;color:#78716c;">Starting your kitchen…</div>
    </div>
  </div>
`;

window.setTimeout(() => {
  void import("./App.tsx").then(({ default: App }) => {
    createRoot(rootElement).render(<App />);
  });
}, 0);
