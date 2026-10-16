import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";
import { registerServiceWorker } from "./storage/serviceWorker";
const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error('Root element "#root" not found in index.html');
}
createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
if (import.meta.env.PROD) {
  // Fire and forget: registration failure only means no offline support.
  void registerServiceWorker(`${import.meta.env.BASE_URL}sw.js`);
}
