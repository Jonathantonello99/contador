import React from "react";
import { createRoot } from "react-dom/client";

import App from "./App.jsx";
import "./style.css";

const rootElement =
  document.getElementById("root");

if (!rootElement) {
  throw new Error(
    'Elemento HTML "#root" não encontrado.'
  );
}

const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
