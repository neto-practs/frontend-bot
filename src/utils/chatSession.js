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
 * Si ha pasado el tiempo límite desde el inicio de sesión,
 * elimina el historial completo y reinicia el contador.
 */
export const gestionarSesionChat = () => {
  const ahora = Date.now();
  const ultimaActividad = localStorage.getItem(SESSION_KEY);

  // Si es la primera vez, guardamos la sesión y salimos
  if (!ultimaActividad) {
    localStorage.setItem(SESSION_KEY, ahora.toString());
    return;
  }

  const horasTranscurridas =
    (ahora - parseInt(ultimaActividad, 10)) / MS_POR_HORA;

  if (horasTranscurridas >= HORAS_CADUCIDAD) {
    //  1. BORRAMOS TODO el LocalStorage
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PIEZAS_KEY);
    localStorage.removeItem(CONTEXT_KEY);

    localStorage.removeItem("NFW_LAST_SEARCH");
    localStorage.removeItem("NFW_IS_LOCKED");

    // Reiniciamos el temporizador
    localStorage.setItem(SESSION_KEY, ahora.toString());
  } else {
    // Renovamos el contador si NO ha caducado.
    // Así el temporizador de 8 horas se reinicia con cada visita/recarga de la página.
    localStorage.setItem(SESSION_KEY, ahora.toString());
  }
};

/**
 * Saneamiento del historial de react-chatbotify.
 * Corrige fallos de serialización de la librería (ej. "[object Object]")
 * y formatea los mensajes de piezas para que el DOM Injector los procese correctamente.
 */
export const sanitizeChatHistory = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const history = JSON.parse(raw);

    // Evitamos que .map() rompa la app si el JSON no es un Array
    if (!Array.isArray(history)) return;

    // LECTURA DE TEXTOS DINÁMICOS DE WP
    const wp = window.ChatBotConfig || {};
    const txtRefinar = wp.refineBtnText || "Seguir afinando";
    const txtVer = wp.viewBtnText || "Ver resultados";

    let changed = false;
    let lastUserInput = "";

    const safeHistory = history.map((msg) => {
      // Guardamos la última intención de búsqueda del usuario
      if (msg.sender === "USER" || msg.role === "user") {
        // ESCUDO DINÁMICO: Ignora los clics en los botones sin importar cómo se llamen en WP
        if (msg.content !== txtRefinar && msg.content !== txtVer) {
          lastUserInput = msg.content;
        }
      }

      // Detectamos mensajes corruptos o etiquetas crudas del bot
      const isCorruptObject =
        msg.type === "object" || msg.content === "[object Object]";
      const isRawTag =
        typeof msg.content === "string" && msg.content.includes("[[PIEZAS:");

      if (msg && (isCorruptObject || isRawTag)) {
        changed = true;

        return {
          ...msg,
          type: "string", // Forzamos a string para que el inyector del DOM lo capture
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
