const ICONO_ENVIAR_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
let idGlobal = 0;

/**
 * Genera un ID único para un elemento del DOM (si previamente no lo tiene)
 * @param {HTMLElement} elemento - El nodo a etiquetar
 * @returns {string} El ID único generado o existente.
 */
const generarIdUnico = (elemento) => {
  let id = elemento.getAttribute("data-neto-id");
  if (!id) {
    idGlobal++;
    id = `neto-${idGlobal}`;
    elemento.setAttribute("data-neto-id", id);
  }
  return id;
};

/**
 * Crea la etiqueta del nombre
 * TailWind para la estructura fija, CSS para los colores dinámicos
 * @param {string} texto - El nombre a mostrar ("Tú" o "Soporte")
 * @param {string} colorTexto - Código elegido desde WP o del caso default.
 * @param {boolean} esBot - Indica si el mensaje es del bot o del user (para alinearlo respectivamente)
 * @return {HTMLSpanElement}
 */
const crearEtiquetaNombre = (texto, colorTexto, esBot) => {
  const span = document.createElement("span");
  span.setAttribute("data-neto-label", "true");

  // Clases estáticas
  const clasesAlineacion = esBot ? "text-left ml-1" : "text-right mr-1";
  span.className = `block leading-tight text-[11px] font-semibold mb-[2px] ${clasesAlineacion}`;

  //Estilos dinámicos
  span.style.color = colorTexto;
  span.textContent = texto;

  return span;
};

/**
 * Procesa los nuevos mensajes enviados y registra el nombre del emisor.
 * @param {string} selectorCSS - El selector establecido de la burbuja (ej: ".rcb-bot-message").
 * @param {boolean} esBot - Flag que determina el nombre y la alineacion que debemos aplicar.
 * @param {Object} wpConfig - Objeto de configuracion global inyectado a través de WordPress
 */
export const procesarBurbujas = (selectorCSS, esBot, wpConfig) => {
  const nombre = esBot
    ? wpConfig.headerTitleText || "Soporte"
    : wpConfig.userDisplayName || "Tú";
  const colorTexto = wpConfig.labelColor || "#65676b";

  const burbujasNuevas = document.querySelectorAll(
    `${selectorCSS}:not([data-neto-processed])`,
  );

  burbujasNuevas.forEach((burbuja) => {
    const texto = burbuja.textContent.trim() || "";

    if (
      !texto ||
      texto.includes("[object Object]") ||
      texto.startsWith("---")
      // ¡NO IGNORAMOS [[PIEZAS:]] AQUÍ!
    ) {
      burbuja.setAttribute("data-neto-processed", "ignorado");
      return;
    }

    const contenedor = burbuja.parentNode;
    if (!contenedor) return;

    burbuja.setAttribute("data-neto-processed", "hecho");

    const etiquetaNombre = crearEtiquetaNombre(nombre, colorTexto, esBot);
    etiquetaNombre.setAttribute("data-neto-for", generarIdUnico(contenedor));

    // 🚨 LA CLAVE: Si este contenedor tiene un grid de piezas inyectado justo antes,
    // insertamos el nombre ANTES del grid de piezas, para que quede arriba de todo.
    const elementoAnterior = contenedor.previousElementSibling;
    if (elementoAnterior && elementoAnterior.classList.contains("neto-pieza-inyectada")) {
        contenedor.parentNode.insertBefore(etiquetaNombre, elementoAnterior);
    } else {
        contenedor.parentNode.insertBefore(etiquetaNombre, contenedor);
    }
  });
};

/**
 * Limpiador: Elimina etiquetas en nombres cuyos mensajes
 * asociados ya no existen en el DOM (tras limpiar el historial).
 * O si la burbuja ha sido ocultada explícitamente (display none).
 */
export const limpiarEtiquetasHuerfanas = () => {
  // Solo consideramos "vivos" los contenedores que siguen en el DOM
  // y que NO tienen display: none.
  const nodosVivos = Array.from(document.querySelectorAll("[data-neto-id]")).filter(
    (el) => window.getComputedStyle(el).display !== "none"
  );
  
  const idsVivos = new Set(nodosVivos.map((el) => el.getAttribute("data-neto-id")));

  document.querySelectorAll("[data-neto-label]").forEach((etiqueta) => {
    if (!idsVivos.has(etiqueta.getAttribute("data-neto-for"))) {
      etiqueta.remove();
    }
  });
};

/**
 * Reemplaza el botón de enviar nativo de la librería por uno personalizado desde TailWind
 * @param {string} colorFondo - color dinámico para el fondo del botón
 */
export const inyectarBotonEnviar = (colorFondo) => {
  if (document.getElementById("neto-send-btn")) return;

  const botonOriginal = document.querySelector(".rcb-send-button");
  if (!botonOriginal) return;

  // Ocultamos el original sin eliminarlo del DOM (para que permanezca la funcionalidad correcta).
  botonOriginal.style.cssText = "display: none !important";

  const btnNuevo = document.createElement("button");
  btnNuevo.id = "neto-send-btn";
  btnNuevo.className =
    "flex items-center justify-center min-w-[40px] h-[40px] rounded-full transition-transform hover:scale-105 active:scale-95 ml-1";
  btnNuevo.style.backgroundColor = "#111111";
  btnNuevo.style.color = "#ffc600";
  
  btnNuevo.innerHTML = ICONO_ENVIAR_SVG;

  // Replicamos el click
  btnNuevo.onclick = (e) => {
    e.preventDefault();
    botonOriginal.click();
  };

  botonOriginal.parentNode.appendChild(btnNuevo);
};
