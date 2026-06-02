import { useRef } from "react";
import { API_KEY, API_URL, PIEZAS_KEY, CONTEXT_KEY } from "../chatbot.config";
import { gestionarSesionChat } from "../utils/chatSession";

/**
 * Realiza la petición POST al backend del Chatbot.
 *
 * @param {string} userInput - El texto que el usuario ha introducido en el chat.
 * @param {string} contextoAnterior - La memoria de la conversación anterior.
 * @returns {Promise<Object>} La respuesta JSON procesada del servidor.
 * @throws {Error} Si la conexión falla o el servidor devuelve un status != 200.
 */
const fetchBotResponse = async (userInput, contextoAnterior) => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": API_KEY,
    },
    body: JSON.stringify({ message: userInput, contexto: contextoAnterior }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Conexión rechazada por el servidor");
  }

  return response.json();
};



/**
 * Helper: Recupera el historial de piezas de la sesión actual (o vacío si caducó).
 * @returns {Object} Un mapa clave-valor con las búsquedas y sus piezas asociadas.
 */
const getInitialHistorial = () => {
  try {
    const saved = localStorage.getItem(PIEZAS_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.warn(
      "[ChatBot] El historial de piezas no se pudo leer. Iniciando limpio.",
    );
    return {};
  }
};

/**
 * Maneja la lógica de negocio: llamadas a red, persistencia
 * de resultados y gestión de estados de error/stock/memoria.
 *
 * @returns {Object} Funciones `handleBotMessage` y `getPiezas` para usar en la UI.
 */
export const useBotLogic = () => {
  const historialPiezas = useRef({});
  const contextoRef = useRef("");

  /**
   * Procesa el mensaje del usuario y devuelve la respuesta en texto para la UI.
   * Almacena tanto las piezas como la metadata en el historial.
   *
   * @param {Object} params - Parámetros inyectados por react-chatbotify.
   * @param {Object} wpConfig - Objeto de configuración de WordPress.
   * @returns {Promise<Object|string>} La respuesta que el bot debe mostrar.
   */
  const handleBotMessage = async (params, wpConfig) => {
    try {
      // 1. Comprobamos el tiempo antes de hacer NADA.
      gestionarSesionChat();

      // 2. Leemos la memoria limpia (después de que el limpiador haya pasado la escoba si hacía falta)
      historialPiezas.current = getInitialHistorial();
      contextoRef.current = localStorage.getItem(CONTEXT_KEY) || "";

      // 3. Enviamos la petición al servidor
      const data = await fetchBotResponse(params.userInput, contextoRef.current);

      if (data.nuevoContexto !== undefined) {
        contextoRef.current = data.nuevoContexto;
        try {
          data.nuevoContexto === ""
            ? localStorage.removeItem(CONTEXT_KEY)
            : localStorage.setItem(CONTEXT_KEY, data.nuevoContexto);
        } catch (e) {
          console.warn("[ChatBot] No se pudo guardar el contexto en localStorage.");
        }
      }

      // Si la IA devuelve una query limpia, la usamos como llave. Si no, el input del usuario.
      const llaveMemoria = data.metadata?.queryLimpia || params.userInput;

      historialPiezas.current[llaveMemoria] = {
        piezas: data.piezas || [],
        metadata: data.metadata || null,
      };

      try {
        localStorage.setItem(PIEZAS_KEY, JSON.stringify(historialPiezas.current));
      } catch (e) {
        console.warn("[ChatBot] No se pudo guardar el historial en localStorage.");
      }

      let textoFinal = data.respuesta;

      if (textoFinal === "ERR_NO_STOCK") {
        textoFinal = wpConfig.mensajeSinStock || "No hay stock actualmente.";
      } else if (textoFinal === "TRIGGER_WHATSAPP") {
        textoFinal = "Claro! Te pongo en contacto con el equipo de soporte: [[WHATSAPP]]";
      }

      // Si el backend nos pide explícitamente mostrar WhatsApp, añadimos el trigger
      if (data.pedirWhatsapp && !textoFinal.includes("[[WHATSAPP]]")) {
        textoFinal += " [[WHATSAPP]]";
      }

      // Devolvemos la respuesta y la llave para que el Widget sepa qué piezas pintar
      return {
        texto: textoFinal,
        llave: data.piezas?.length > 0 ? llaveMemoria : null,
        hasPiezas: data.piezas?.length > 0,
        sugerencias: data.sugerencias || [],
      };
    } catch (error) {
      console.error("[ChatBot] Error:", error.message);
      return "Error de conexión.";
    }
  };
  
/**
   * Recupera de la caché las piezas asociadas a una búsqueda específica.
   *
   * @param {string} userInput - La palabra clave a buscar en la caché.
   * @returns {Object} Array de piezas, o vacío si no hay coincidencias.
   */
  const getPiezas = (userInput) => {
    const currentHistorial = getInitialHistorial();
    return currentHistorial[userInput] || { piezas: [], metadata: null };
  };
// Exportamos las funciones necesarias para usarlas en los componentes.
return { handleBotMessage, getPiezas };
};