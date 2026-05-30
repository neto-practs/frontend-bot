// Añadimos el ID 'neto-avion' para saber si ya lo hemos inyectado
const ICONO_ENVIAR_SVG = `<svg id="neto-avion" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
let idGlobal = 0;

const generarIdUnico = (elemento) => {
  let id = elemento.getAttribute("data-neto-id");
  if (!id) {
    idGlobal++;
    id = `neto-${idGlobal}`;
    elemento.setAttribute("data-neto-id", id);
  }
  return id;
};

const crearEtiquetaNombre = (texto, colorTexto, esBot) => {
  const span = document.createElement("span");
  span.setAttribute("data-neto-label", "true");
  const clasesAlineacion = esBot ? "text-left ml-1" : "text-right mr-1";
  span.className = `block leading-tight text-[11px] font-semibold mb-[2px] ${clasesAlineacion}`;
  span.style.color = colorTexto;
  span.textContent = texto;
  return span;
};

export const procesarBurbujas = (selectorCSS, esBot, wpConfig) => {
  const nombre = esBot
    ? wpConfig.headerTitleText || "Asistente IA"
    : wpConfig.userDisplayName || "Tú";
  const colorTexto = wpConfig.labelColor || "#65676b";

  const burbujasNuevas = document.querySelectorAll(
    `${selectorCSS}:not([data-neto-processed])`,
  );

  burbujasNuevas.forEach((burbuja) => {
    const texto = burbuja.textContent.trim() || "";

    if (!texto || texto.includes("[object Object]") || texto.startsWith("---")) {
      burbuja.setAttribute("data-neto-processed", "ignorado");
      return;
    }

    const contenedor = burbuja.parentNode;
    if (!contenedor) return;

    burbuja.setAttribute("data-neto-processed", "hecho");

    const etiquetaNombre = crearEtiquetaNombre(nombre, colorTexto, esBot);
    etiquetaNombre.setAttribute("data-neto-for", generarIdUnico(contenedor));

    const elementoAnterior = contenedor.previousElementSibling;
    if (elementoAnterior && elementoAnterior.classList.contains("neto-pieza-inyectada-container")) {
        contenedor.parentNode.insertBefore(etiquetaNombre, elementoAnterior);
    } else {
        contenedor.parentNode.insertBefore(etiquetaNombre, contenedor);
    }
  });
};

export const limpiarEtiquetasHuerfanas = () => {
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

// Aplica el diseño personalizado directamente sobre el botón original de la librería.
export const inyectarBotonEnviar = (colorFondo) => {
  const botonOriginal = document.querySelector(".rcb-send-button");
  if (!botonOriginal) return;

  // Verificamos si el botón ya fue modificado previamente.
  if (botonOriginal.querySelector("#neto-avion")) return;

  // Reemplazamos el icono por defecto por nuestro SVG personalizado.
  botonOriginal.innerHTML = ICONO_ENVIAR_SVG;

  // Aplicamos las clases de Tailwind para darle estilo y animaciones.
  if (!botonOriginal.classList.contains("neto-send-btn")) {
    botonOriginal.classList.add(
      "neto-send-btn", "flex", "items-center", "justify-center", 
      "transition-transform", "hover:scale-105", "active:scale-95", "ml-1"
    );
  }

  // Forzamos los estilos visuales del botón, asegurando que mantenga su posición correcta y no muestre bordes nativos.
  botonOriginal.style.cssText = `
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;
    border-radius: 50% !important;
    background-color: #111111 !important;
    color: ${colorFondo || "#ffc600"} !important;
    border: none !important;
    cursor: pointer !important;
    position: static !important;
    outline: none !important;
    -webkit-tap-highlight-color: transparent !important;
    opacity: 1 !important;
    visibility: visible !important;
  `;
};