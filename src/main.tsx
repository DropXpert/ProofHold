import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { captureRefFromUrl } from "./lib/referral";
import "./index.css";

// Persist a ?ref=CODE before anything else reads/strips the URL.
captureRefFromUrl();

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Remove the inline splash once React has fully painted.
// Two rAFs ensure the lazy-loaded chunk has committed to the DOM
// before the splash fades — prevents the white/cream flash.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      (window as any).__hideSplash?.();
    });
  });
});
