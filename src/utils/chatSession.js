import {
  STORAGE_KEY,
  SESSION_KEY,
  PIEZAS_KEY,
  CONTEXT_KEY,
  HORAS_CADUCIDAD,
} from "../chatbot.config";

const MS_POR_HORA = 1000 * 60 * 60;

/**
 * Controla la caducidad de la sesión del usuario.
 */
export const gestionarSesionChat = () => {
  const ahora = Date.now();
  const inicioSesion = localStorage.getItem(SESSION_KEY);

  if (!inicioSesion) {
    localStorage.setItem(SESSION_KEY, ahora.toString());
    return;
  }

  const horasTranscurridas = (ahora - parseInt(inicioSesion, 10)) / MS_POR_HORA;

  if (horasTranscurridas >= HORAS_CADUCIDAD) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PIEZAS_KEY);
    localStorage.removeItem(CONTEXT_KEY);
    localStorage.setItem(SESSION_KEY, ahora.toString());
  }
};

/**
 * Saneamiento del historial de react-chatbotify.
 * Asegura que los mensajes corruptos se conviertan en marcadores válidos.
 */
export const sanitizeChatHistory = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const history = JSON.parse(raw);
    if (!Array.isArray(history)) return;

    const wp = window.ChatBotConfig || {};
    const txtRefinar = wp.refineBtnText || "Seguir afinando";
    const txtVer = wp.viewBtnText || "Ver resultados";

    let changed = false;
    let lastUserInput = "";

    const safeHistory = history.map((msg) => {
      // 1. Rastreamos el último input real del usuario
      if (msg.sender === "USER" || msg.role === "user") {
        if (msg.content !== txtRefinar && msg.content !== txtVer) {
          lastUserInput = msg.content;
        }
        return msg;
      }

      // 2. Procesamos mensajes del BOT
      const content = msg.content;
      
      // Un mensaje debe ser convertido a marcador si está corrupto o vacío, 
      // pero solo si tenemos un contexto de búsqueda (lastUserInput).
      const isCorrupt = msg.type === "object" || content === "[object Object]";
      const isBlank = content === "" || content === null;

      if ((isCorrupt || isBlank) && lastUserInput) {
        changed = true;
        return {
          ...msg,
          type: "string",
          content: `[[PIEZAS:${lastUserInput}]]`,
        };
      }

      return msg;
    });

    if (changed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safeHistory));
    }
  } catch (e) {
    console.error("[ChatBot] Error saneando el historial:", e);
  }
};
