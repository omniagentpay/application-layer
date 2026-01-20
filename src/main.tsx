import { StrictMode, startTransition } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Use startTransition for non-urgent updates
const root = createRoot(document.getElementById("root")!);

startTransition(() => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
