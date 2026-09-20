import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./style.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Elemento "#root" não encontrado.');
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <App />
);
