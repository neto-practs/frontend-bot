import React from "react";

const CONFIGS = {
  maps: {
    label: "Cómo llegar",
    bg: "#4285F4",
    hover: "#3367D6",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
        <path d="M8 0C5.24 0 3 2.24 3 5c0 3.75 5 11 5 11s5-7.25 5-11c0-2.76-2.24-5-5-5zm0 6.5C7.17 6.5 6.5 5.83 6.5 5S7.17 3.5 8 3.5 9.5 4.17 9.5 5 8.83 6.5 8 6.5z" />
      </svg>
    ),
  },
  sobre_nosotros: {
    label: "Sobre nosotros",
    bg: "#475569",
    hover: "#334155",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
        <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm1 12H7V7h2v5zm0-6H7V4h2v2z" />
      </svg>
    ),
  },
  bajas: {
    label: "Bajas y tasaciones",
    bg: "#d97706",
    hover: "#b45309",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
        <path d="M14 2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-1 11H7v-1.5h6V13zm0-3H7V8.5h6V10zm0-3H7V5.5h6V7z" />
      </svg>
    ),
  },
  campa: {
    label: "Campa / Desguace",
    bg: "#10b981",
    hover: "#059669",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
        <path d="M8 1a2.5 2.5 0 0 1 2.5 2.5V4h-5v-.5A2.5 2.5 0 0 1 8 1zm3.5 3v-.5a3.5 3.5 0 1 0-7 0V4H1v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4h-3.5z" />
      </svg>
    ),
  },
};

const ContactButton = ({ btnType, url }) => {
  const config = CONFIGS[btnType];
  if (!config || !url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        backgroundColor: config.bg,
        color: "#ffffff",
        padding: "10px 14px",
        borderRadius: "8px",
        textDecoration: "none",
        fontWeight: "bold",
        fontSize: "14px",
        boxSizing: "border-box",
        transition: "background-color 0.2s ease",
        fontFamily: "inherit",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}
      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = config.hover)}
      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = config.bg)}
    >
      {config.icon}
      {config.label}
    </a>
  );
};

export default ContactButton;
