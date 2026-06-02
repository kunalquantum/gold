import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { useUniverseStore } from "./store/useUniverseStore";
import "./index.css";

// Dev-only: expose the store for inspection/testing in the browser console.
if (import.meta.env.DEV) {
  (window as unknown as { __universe?: unknown }).__universe = useUniverseStore;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
