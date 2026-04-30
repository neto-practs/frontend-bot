import { useRef } from "react";

/**
 * Custom Hook para gestionar la memoria persistente del Chatbot.
 * Aísla toda la lógica de lectura y escritura en el localStorage.
 * * @returns {Object} Referencias y métodos para interactuar con la memoria.
 */
export const useBotMemory = () => {
  //Memoria a largo plazo (Sobrevive a recargas F5)
  const lastSearchRef = useRef(localStorage.getItem("NFW_LAST_SEARCH") || "");
  const isLockedRef = useRef(localStorage.getItem("NFW_IS_LOCKED") === "true");

  //Memoria a corto plazo (Chivato temporal para la UI)
  const justUnlockedVerRef = useRef(false);

  /**
   * Echa o quita el cerrojo del bot, guardándolo en el disco duro.
   * @param {boolean} isLocked - true para bloquear, false para liberar.
   */
  const setLock = (isLocked) => {
    isLockedRef.current = isLocked;
    localStorage.setItem("NFW_IS_LOCKED", isLocked ? "true" : "false");
  };

  /**
   * Guarda la última búsqueda exitosa en la memoria.
   * @param {string} term - El texto buscado por el usuario (ej. "freno").
   */
  const setSearch = (term) => {
    lastSearchRef.current = term;
    localStorage.setItem("NFW_LAST_SEARCH", term);
  };

  return {
    lastSearchRef,
    isLockedRef,
    justUnlockedVerRef,
    setLock,
    setSearch,
  };
};
