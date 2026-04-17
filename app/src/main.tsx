/**
 * main.tsx — Application entry point.
 *
 * Renders the root React component into the DOM. This is the standard
 * Vite + React entry point, loaded by index.html.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found. Check index.html.");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
