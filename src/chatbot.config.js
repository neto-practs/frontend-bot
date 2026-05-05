export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000/api/chat";
export const API_KEY = import.meta.env.VITE_API_KEY || "";
export const HORAS_CADUCIDAD =
  Number(import.meta.env.VITE_HORAS_CADUCIDAD) || 8;
export const IVA_PERCENT = Number(import.meta.env.VITE_IVA_PERCENT) || 0.21;
export const MAX_Z_INDEX =
  Number(import.meta.env.VITE_MAX_Z_INDEX) || 2147483647;
export const MOBILE_BP = Number(import.meta.env.VITE_MOBILE_BP) || 768;
export const FALLBACK_IMAGE =
  import.meta.env.VITE_FALLBACK_IMAGE ||
  "https://via.placeholder.com/150x100?text=Sin+Imagen";

// Claves de LocalStorage
export const STORAGE_KEY = "neto_chat_history";
export const SESSION_KEY = "neto_chat_inicio_sesion";
export const PIEZAS_KEY = "neto_historial_piezas";
export const CONTEXT_KEY = "neto_chat_contexto";

/**
 * CONFIGURACIÓN BASE
 * Mapea los valores de WordPress a una estructura limpia.
 */
export const buildConfig = (wp = {}) => {
  const primaryColor = wp.headerBg || "#99c355";

  return {
    primary: primaryColor,
    headerTitleColor: wp.headerTitleColor || "#ffffff",
    headerTitleText: wp.headerTitleText || "Soporte Recambios",
    headerAvatar: wp.headerAvatar || "",
    launcherIcon: wp.launcherIcon || "",
    launcherBg: wp.launcherBg || primaryColor,
    userDisplayName: wp.userDisplayName || "Tú",
    userBubbleBg: wp.userBubbleBg || primaryColor,
    userTextColor: wp.userTextColor || "#ffffff",
    botBubbleBg: wp.botBubbleBg || "#f0f2f5",
    botTextColor: wp.botTextColor || "#000000",
    inputBoxBg: wp.inputBoxBg || "#f4f4f4",
    inputFocusBorder: wp.inputFocusBorder || primaryColor,
    sendBtnBg: wp.sendBtnBg || primaryColor,
    inputContainerBg: wp.inputContainerBg || "#ffffff",
    inputBorderColor: wp.inputBorderColor || "#eeeeee",
    badgeBg: wp.badgeBg || "red",
    chatBodyBg: wp.chatBodyBg || "#f9f9f9",
    chatSize: wp.chatSize || "medium", 
  };
};

/**
 * ESTILOS VISUALES
 * Define los estilos que inyectaremos en la librería.
 */
export const buildStyles = (config, isMobile) => {
  // Lógica de tamaño dinámico para escritorio
  let desktopWidth = "300px";
  let desktopHeight = "min(600px, 85vh)"; // Tamaño "medium" por defecto

  if (config.chatSize === "small") {
    desktopWidth = "280px";
    desktopHeight = "min(500px, 80vh)";
  } else if (config.chatSize === "large") {
    desktopWidth = "360px";
    desktopHeight = "min(720px, 90vh)";
  }

  return {
    headerStyle: {
      background: config.primary,
      color: config.headerTitleColor,
      fontSize: "16px",
      padding: "18px",
      fontWeight: "600",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    bodyStyle: {
      backgroundColor: config.chatBodyBg,
      flex: "1",
      overflowY: "auto",
    },
    userBubbleStyle: {
      backgroundColor: config.userBubbleBg,
      color: config.userTextColor,
      borderRadius: "15px 15px 2px 15px",
      padding: "12px",
      maxWidth: "80%",
      wordBreak: "break-word",
    },
    botBubbleStyle: {
      backgroundColor: config.botBubbleBg,
      color: config.botTextColor,
      borderRadius: "15px 15px 15px 2px",
      padding: "12px",
      maxWidth: "80%",
      wordBreak: "break-word",
    },
    chatInputContainerStyle: {
      backgroundColor: config.inputContainerBg,
      padding: "10px",
      borderTop: `1px solid ${config.inputBorderColor}`,
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    chatInputAreaStyle: {
      backgroundColor: config.inputBoxBg,
      height: "44px",
      minHeight: "44px",
      borderRadius: "22px",
      fontSize: "15px",
      paddingLeft: "16px",
      paddingRight: "16px",
      flex: "1",
      boxSizing: "border-box",
    },
    chatInputAreaFocusedStyle: {
      border: `1.5px solid ${config.inputFocusBorder}`,
      outline: "none",
      boxShadow: "none",
    },
    sendButtonStyle: {
      opacity: "0",
      position: "absolute",
      width: "1px",
      height: "1px",
      overflow: "hidden",
    },
    closeChatIconStyle: {
      fill: config.headerTitleColor,
      width: "25px",
      height: "25px",
    },
    notificationBadgeStyle: { background: config.badgeBg, color: "#fff" },

    // Desactivamos elementos redundantes
    notificationButtonStyle: { display: "none" },
    audioButtonStyle: { display: "none" },
    footerStyle: { display: "none", padding: 0, margin: 0, height: 0 },

    botBubbleAvatarStyle: {
      width: "36px",
      height: "36px",
      borderRadius: "50%",
      objectFit: "cover",
    },
    chatButtonStyle: {
      background: config.launcherIcon ? "transparent" : config.launcherBg,
      boxShadow: config.launcherIcon ? "none" : "0 4px 12px rgba(0,0,0,0.3)",
      zIndex: MAX_Z_INDEX,
    },
    chatWindowStyle: {
      zIndex: MAX_Z_INDEX,
      display: "flex",
      flexDirection: "column",
      ...(isMobile
        ? {
            inset: 0,
            width: "100vw",
            height: "100dvh",
            maxWidth: "100vw",
            maxHeight: "100dvh",
            borderRadius: 0,
          }
        : {
            bottom: "10px",
            right: "20px",
            width: desktopWidth,       // <--- Variable asignada dinámicamente
            height: desktopHeight,     // <--- Variable asignada dinámicamente
            borderRadius: "16px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
          }),
    },
  };
};

/**
 * AJUSTES FUNCIONALES
 * Configura los módulos de la librería react-chatbotify.
 */
export const buildSettings = (config, isMobile) => ({
  device: { applyMobileOptimizations: false },
  general: { embedded: false, showFooter: false },
  tooltip: { mode: "HIDDEN" },
  notification: { disabled: false, showCount: true },
  audio: { disabled: true },
  emoji: { disabled: true },
  fileAttachment: { disabled: true },
  chatHistory: {
    storageKey: STORAGE_KEY,
    disabled: false,
  },
  header: {
    title: config.headerTitleText,
    showAvatar: true,
    ...(config.headerAvatar && { avatar: config.headerAvatar }),
  },
  chatButton: {
    ...(config.launcherIcon && { icon: config.launcherIcon }),
  },
  botBubble: {
    showAvatar: true,
    showTimestamp: false,
    ...(config.headerAvatar && { avatar: config.headerAvatar }),
  },
});