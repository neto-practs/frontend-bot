// chatbot.config.js
// Diseño: Dark Premium — Negro corporativo con acento #ffc600
// Inspiración: herramienta de trabajo de alto rendimiento, sector automoción

export const API_URL =
  window.ChatBotConfig?.backendUrl ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:4000/api/chat";
export const API_KEY =
  window.ChatBotConfig?.backendApiKey || import.meta.env.VITE_API_KEY || "";
export const HORAS_CADUCIDAD =
  Number(import.meta.env.VITE_HORAS_CADUCIDAD) || 8;
export const IVA_PERCENT = Number(import.meta.env.VITE_IVA_PERCENT) || 0.21;
export const MAX_Z_INDEX =
  Number(import.meta.env.VITE_MAX_Z_INDEX) || 2147483647;
export const MOBILE_BP = Number(import.meta.env.VITE_MOBILE_BP) || 768;

/**
 * ¿Usamos el layout de pantalla completa? (móvil + tablets táctiles)
 *
 * Las tablets como el iPad (ancho >= MOBILE_BP) se tratan como móvil porque el
 * panel flotante se descuadra con el teclado virtual de iOS. A pantalla completa
 * el comportamiento (anclar al visualViewport) es el mismo que en iPhone y es
 * fiable. Se detecta la tablet por puntero táctil primario (pointer: coarse),
 * de modo que un escritorio con ratón (pointer: fine) conserva el modo flotante.
 *
 * Debe mantenerse en sintonía con el media query de index.css:
 *   @media (max-width: 767px), (pointer: coarse)
 */
export const isMobileViewport = () => {
  if (typeof window === "undefined") return false;
  if (window.innerWidth < MOBILE_BP) return true;
  return window.matchMedia?.("(pointer: coarse)").matches ?? false;
};
export const FALLBACK_IMAGE =
  import.meta.env.VITE_FALLBACK_IMAGE ||
  "https://via.placeholder.com/150x100?text=Sin+Imagen";

// Claves de LocalStorage
export const STORAGE_KEY = "neto_chat_history";
export const SESSION_KEY = "neto_chat_inicio_sesion";
export const PIEZAS_KEY  = "neto_historial_piezas";
export const CONTEXT_KEY = "neto_chat_contexto";

// ── Paleta corporativa ────────────────────────────────────────────────────────
const BRAND = {
  yellow:     "#ffc600",
  yellowDark: "#e6b000",   // hover / pressed state
  yellowGlow: "rgba(255,198,0,0.18)",
  black:      "#111111",
  darkGray:   "#1c1c1c",   // header background
  midGray:    "#2a2a2a",   // secondary dark
  lightGray:  "#f5f5f5",   // chat body
  offWhite:   "#fafafa",   // input background
  textLight:  "#e8e8e8",   // text on dark backgrounds
  textDark:   "#111111",   // text on light backgrounds
  textMuted:  "#888888",
  border:     "#e0e0e0",
  darkBorder: "#333333",
};

// Avatar SVG — robot sobre fondo negro con ojo amarillo
const _SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="50" fill="${BRAND.darkGray}"/>
  <rect x="20" y="24" width="60" height="48" rx="12" fill="${BRAND.black}" stroke="${BRAND.yellow}" stroke-width="2.5"/>
  <circle cx="37" cy="44" r="8" fill="${BRAND.yellow}" opacity="0.95"/>
  <circle cx="37" cy="44" r="4" fill="${BRAND.black}"/>
  <circle cx="63" cy="44" r="8" fill="${BRAND.yellow}" opacity="0.95"/>
  <circle cx="63" cy="44" r="4" fill="${BRAND.black}"/>
  <rect x="42" y="54" width="16" height="4" rx="2" fill="${BRAND.yellow}" opacity="0.8"/>
  <rect x="46" y="4" width="8" height="16" rx="4" fill="${BRAND.yellow}"/>
  <circle cx="50" cy="4" r="5" fill="${BRAND.yellow}"/>
  <rect x="36" y="72" width="28" height="10" rx="5" fill="${BRAND.midGray}"/>
</svg>`;
export const BOT_AVATAR_URL = `data:image/svg+xml;base64,${btoa(_SVG)}`;

// ── buildConfig ───────────────────────────────────────────────────────────────
export const buildConfig = (wp = {}) => {
  const primary = wp.headerBg || BRAND.yellow;

  return {
    primary,
    accent:             BRAND.yellow,
    headerTitleColor:   wp.headerTitleColor    || BRAND.textDark,
    headerTitleText:    wp.headerTitleText     || "Soporte Recambios",
    headerAvatar:       wp.headerAvatar        || "",
    launcherIcon:       wp.launcherIcon        || "",
    launcherBg:         wp.launcherBg          || BRAND.yellow,
    launcherArrowColor: wp.launcherArrowColor  || "#000000",

    userDisplayName:    wp.userDisplayName     || "Tú",
    userBubbleBg:       wp.userBubbleBg        || BRAND.yellow,
    userTextColor:      wp.userTextColor       || BRAND.textDark,

    botBubbleBg:        wp.botBubbleBg         || "#ffffff",
    botTextColor:       wp.botTextColor        || BRAND.textDark,

    inputBoxBg:         wp.inputBoxBg          || BRAND.offWhite,
    inputFocusBorder:   wp.inputFocusBorder    || BRAND.yellow,
    sendBtnBg:          wp.sendBtnBg           || BRAND.yellow,
    inputContainerBg:   wp.inputContainerBg    || "#ffffff",
    inputBorderColor:   wp.inputBorderColor    || BRAND.border,

    badgeBg:            wp.badgeBg             || "#EF4444",
    chatBodyBg:         wp.chatBodyBg          || BRAND.lightGray,
    chatSize:           wp.chatSize            || "medium",

    optionsBtnBg:       wp.optionsBtnBg        || "#ffffff",
    optionsBtnColor:    wp.optionsBtnColor     || BRAND.textDark,
    optionsBtnBorder:   wp.optionsBtnBorder    || BRAND.yellow,
    optionsBtnHoverBg:  wp.optionsBtnHoverBg   || BRAND.yellow,

    maxSuggestions:     parseInt(wp.maxSuggestions) || 10,
    inputPlaceholder:   wp.inputPlaceholder    || "Escribe tu consulta...",
  };
};

// ── buildStyles ───────────────────────────────────────────────────────────────
export const buildStyles = (config, isMobile) => {
  // Tamaños de ventana según chatSize
  const sizes = {
    small:  { w: "300px", h: "min(520px, 82vh)" },
    medium: { w: "340px", h: "min(620px, 88vh)" },
    large:  { w: "390px", h: "min(720px, 92vh)" },
  };
  const sz = sizes[config.chatSize] || sizes.medium;

  return {
    headerStyle: {
      background:           config.primary,
      color:                config.headerTitleColor,
      padding:              isMobile ? "0 4px 0 12px" : "0 6px 0 16px",
      minHeight:            "84px",
      display:              "flex",
      alignItems:           "center",
      borderTopLeftRadius:  isMobile ? "0" : "20px",
      borderTopRightRadius: isMobile ? "0" : "20px",
      position:             "relative",
      boxSizing:            "border-box",
      overflow:             "hidden",
    },

    bodyStyle: {
      backgroundColor: config.chatBodyBg,
      flex:            "1",
      overflowY:       "auto",
    },

    userBubbleStyle: {
      backgroundColor: config.userBubbleBg,
      color:           config.userTextColor,
      borderRadius:    "18px 18px 4px 18px",
      padding:         "10px 14px",
      maxWidth:        "78%",
      wordBreak:       "break-word",
    },

    botBubbleStyle: {
      backgroundColor: config.botBubbleBg,
      color:           config.botTextColor,
      borderRadius:    "4px 18px 18px 18px",
      padding:         "10px 14px",
      maxWidth:        "78%",
      wordBreak:       "break-word",
    },

    // ==========================================================
    // NUEVO: ESTILOS DE LOS BOTONES DE OPCIONES / SUGERENCIAS
    // ==========================================================
    botOptionStyle: {
      backgroundColor: config.optionsBtnBg,
      color:           config.optionsBtnColor,
      border:          `1px solid ${config.optionsBtnBorder}`,
      borderRadius:    "8px",
      padding:         "11px 22px",
      margin:          "0",
      fontWeight:      "600",
      boxShadow:       "0 1px 3px rgba(0,0,0,0.05)",
      transition:      "all 0.2s ease-in-out",
      cursor:          "pointer",
      whiteSpace:      "nowrap",
      width:           "auto",
      maxWidth:        "none",
      flexShrink:      0,
    },
    botOptionHoveredStyle: {
      backgroundColor: config.optionsBtnHoverBg,
      color:           config.optionsBtnColor,
      border:          `1px solid ${config.optionsBtnBorder}`,
      transform:       "translateY(-2px)",
      boxShadow:       "0 4px 10px rgba(0, 0, 0, 0.12)",
    },
    // ==========================================================

    chatInputContainerStyle: {
      backgroundColor: config.inputContainerBg,
      padding:         "10px 12px",
      borderTop:       `1px solid ${config.inputBorderColor}`,
      display:         "flex",
      alignItems:      "center",
      gap:             "8px",
    },
    chatInputAreaStyle: {
      backgroundColor: config.inputBoxBg,
      height:          "46px",
      minHeight:       "46px",
      borderRadius:    "23px",
      // 16px mínimo en iOS para evitar el zoom automático al enfocar el input
      fontSize:        "16px",
      paddingLeft:     "18px",
      paddingRight:    "18px",
      flex:            "1",
      boxSizing:       "border-box",
      border:          `1.5px solid ${config.inputBorderColor}`,
    },
    chatInputAreaFocusedStyle: {
      border:     `1.5px solid ${config.inputFocusBorder}`,
      outline:    "none",
    },

    // REPARACIÓN DEL BOTÓN DE ENVIAR
    sendButtonStyle: {
      backgroundColor: config.sendBtnBg,
      borderRadius: "50%",
      width: "38px",
      height: "38px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      border: "none",
      flexShrink: 0,
    },
    sendIconStyle: {
      fill: config.headerTitleColor,
      width: "22px",
      height: "22px",
    },

    notificationBadgeStyle: {
      background: config.badgeBg,
      color:      "#fff",
    },

    notificationButtonStyle: { display: "none" },
    audioButtonStyle:        { display: "none" },
    footerStyle:             { display: "none", padding: 0, margin: 0, height: 0 },

    botBubbleAvatarStyle: {
      width:        "34px",
      height:       "34px",
      borderRadius: "50%",
      objectFit:    "cover",
    },

    chatButtonStyle: {
      background:  config.launcherBg,
      zIndex:       MAX_Z_INDEX,
    },

    chatWindowStyle: {
      zIndex:        MAX_Z_INDEX,
      display:       "flex",
      flexDirection: "column",
      ...(isMobile
        ? {
            // La altura real con teclado abierto la fija useMobileKeyboardFix.js
            // (anclaje al visualViewport). 100dvh es el valor base/fallback.
            inset:        0,
            width:        "100vw",
            height:       "100dvh",
            maxWidth:     "100vw",
            maxHeight:    "100dvh",
            borderRadius: 0,
            overflow:     "hidden",
          }
        : {
            bottom:       "24px",
            right:        "24px",
            width:        sz.w,
            height:       sz.h,
            borderRadius: "20px",
            boxShadow:    "0 20px 60px rgba(0,0,0,0.22)",
          }),
    },
  };
};

export const buildSettings = (config, isMobile) => ({
  device:         { applyMobileOptimizations: false },
  general:        { embedded: false, showFooter: false },
  tooltip:        { mode: "HIDDEN" },
  notification:   { disabled: false, showCount: true },
  audio:          { disabled: true },
  emoji:          { disabled: true },
  fileAttachment: { disabled: true },
  chatHistory: {
    storageKey:      STORAGE_KEY,
    disabled:        false,
    autoLoad:        true,
    showChatHistory: true,
  },
  header: {
    title:      config.headerTitleText,
    showAvatar: true,
    avatar:     config.headerAvatar || BOT_AVATAR_URL,
  },
  chatButton: {
    icon: config.launcherIcon || BOT_AVATAR_URL, 
  },
  botBubble: {
    showAvatar:    true,
    showTimestamp: false,
    avatar:        config.headerAvatar || BOT_AVATAR_URL,
  },
  chatInput: {
    enabledPlaceholderText: config.inputPlaceholder,
  },
});