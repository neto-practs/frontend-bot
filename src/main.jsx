import React from "react";
import ReactDOM from "react-dom/client";
import FloatingWidget from './components/Chat/FloatingWidget';
import "./index.css";

const rootElement = document.getElementById("neto-floating-widget-root");

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    //<React.StrictMode>
     // {" "}
      <FloatingWidget />
      //{" "}
    //</React.StrictMode>,
  );
}
