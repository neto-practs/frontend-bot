import { useRef } from "react";

/**
 * Custom Hook para gestionar la memoria persistente del Chatbot.
 * Aísla toda la lógica de lectura y escritura en el localStorage.
 * * @returns {Object} Referencias y métodos para interactuar con la memoria.
 */
export const useBotMemory = () => {
  // Memoria a largo plazo (Sobrevive a recargas F5)
  const lastSearchRef = useRef("");
  const isLockedRef = useRef(false);

  // Inicialización segura
  try {
    lastSearchRef.current = localStorage.getItem("NFW_LAST_SEARCH") || "";
    isLockedRef.current = localStorage.getItem("NFW_IS_LOCKED") === "true";
  } catch (e) {
    console.warn("[ChatBot] No se pudo leer la memoria (posible modo incógnito).");
  }

  // Memoria a corto plazo (Chivato temporal para la UI)
  const justUnlockedVerRef = useRef(false);

  /**
   * Echa o quita el cerrojo del bot, guardándolo en el disco duro.
   * @param {boolean} isLocked - true para bloquear, false para liberar.
   */
  const setLock = (isLocked) => {
    isLockedRef.current = isLocked;
    try {
      localStorage.setItem("NFW_IS_LOCKED", isLocked ? "true" : "false");
    } catch (e) {
      console.warn("[ChatBot] No se pudo guardar el bloqueo en memoria.");
    }
  };

  /**
   * Guarda la última búsqueda exitosa en la memoria.
   * @param {string} term - El texto buscado por el usuario (ej. "freno").
   */
  const setSearch = (term) => {
    lastSearchRef.current = term;
    try {
      localStorage.setItem("NFW_LAST_SEARCH", term);
    } catch (e) {
      console.warn("[ChatBot] No se pudo guardar la búsqueda en memoria.");
    }
  };

  return {
    lastSearchRef,
    isLockedRef,
    justUnlockedVerRef,
    setLock,
    setSearch,
  };
};
