import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { applyUiSettings } from "./store/settings.js";
import { runBlankSlateReset } from "./systems/blankSlate.js";
import "./styles/theme.css";
import "./styles/chat.css";

runBlankSlateReset();
applyUiSettings();

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
