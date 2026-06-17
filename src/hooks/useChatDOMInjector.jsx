import { useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import GridPiezas from "../components/Chat/GridPiezas";
import WhatsAppCard from "../components/Chat/WhatsAppCard";
import ContactButton from "../components/Chat/ContactButton";
import {
  limpiarEtiquetasHuerfanas,
  inyectarBotonEnviar,
  procesarBurbujas,
} from "../components/Chat/chatLabels";

const ALL_PLACEHOLDERS = [
  "WHATSAPP", "MAPS", "SOBRE_NOSOTROS", "BAJAS_TASACIONES",
  "TELEFONO", "EMAIL", "HORARIO",
];

// Si hay valor: sustituye el placeholder por el resultado de toHtml(valor) o texto plano.
// Si está vacío: elimina toda la frase que contiene el placeholder.
function replaceInlineOrRemove(text, placeholder, value, toHtml) {
  if (value) {
    const replacement = toHtml ? toHtml(value) : value;
    return text.replace(new RegExp("\\[\\[" + placeholder + "\\]\\]", "g"), replacement);
  }
  return text.replace(
    new RegExp("[^.!?\\n]*\\[\\[" + placeholder + "\\]\\][^.!?\\n]*[.!?]?[ \\t]*", "g"),
    ""
  );
}

function getContactUrl(btnType, wp) {
  if (btnType === "maps") return wp?.mapsUrl || "";
  if (btnType === "sobre_nosotros") return wp?.sobreNosotrosUrl || "";
  if (btnType === "bajas") return wp?.bajasUrl || "";
  return "";
}

export const useChatDOMInjector = (mounted, getPiezas, wp) => {
  const observerRef = useRef(null);
  const rootsRef = useRef(new Map());
  const wpRef = useRef(wp);

  useEffect(() => {
    wpRef.current = wp;
  }, [wp]);

  const inyectarHistorico = useCallback(() => {
    const bubbles = document.querySelectorAll(".rcb-bot-message:not([data-neto-pieces-injected])");

    bubbles.forEach((bubble) => {
      const fullText = bubble.textContent?.trim() || "";

      if (fullText === "[object Object]") {
        bubble.style.setProperty("display", "none", "important");
        return;
      }

      // Comprobamos si hay algún placeholder en el mensaje
      const hasPlaceholder = ALL_PLACEHOLDERS.some((p) => fullText.includes(`[[${p}]]`));

      if (hasPlaceholder) {
        const config = wpRef.current || {};

        // 1. Reemplazos inline: TELEFONO/EMAIL → enlace clicable; HORARIO → texto plano
        let processedText = fullText;
        processedText = replaceInlineOrRemove(processedText, "TELEFONO", config.telefono || "",
          (v) => `<a href="tel:${v.replace(/\s/g, "")}" style="color:#1a73e8;text-decoration:underline;pointer-events:auto;cursor:pointer;position:relative;z-index:1;">${v}</a>`
        );
        processedText = replaceInlineOrRemove(processedText, "EMAIL", config.email || "",
          (v) => `<a href="mailto:${v}" style="color:#1a73e8;text-decoration:underline;pointer-events:auto;cursor:pointer;position:relative;z-index:1;">${v}</a>`
        );
        processedText = replaceInlineOrRemove(processedText, "HORARIO", config.horario || "");

        // 2. Determinamos qué botones renderizar (usando el texto original, antes de procesar)
        const buttonsToRender = [];
        if (fullText.includes("[[WHATSAPP]]") && config.whatsappNumber) {
          buttonsToRender.push({ type: "whatsapp" });
        }
        if (fullText.includes("[[MAPS]]") && config.mapsUrl) {
          buttonsToRender.push({ type: "maps", url: config.mapsUrl });
        }
        if (fullText.includes("[[SOBRE_NOSOTROS]]") && config.sobreNosotrosUrl) {
          buttonsToRender.push({ type: "sobre_nosotros", url: config.sobreNosotrosUrl });
        }
        if (fullText.includes("[[BAJAS_TASACIONES]]") && config.bajasUrl) {
          buttonsToRender.push({ type: "bajas", url: config.bajasUrl });
        }
        if (fullText.includes("[[CAMPA]]") && config.campaUrl) {
          buttonsToRender.push({ type: "campa", url: config.campaUrl });
        }

        // 3. Eliminamos los placeholders de botón del texto (se convierten en elementos visuales)
        ["WHATSAPP", "MAPS", "SOBRE_NOSOTROS", "BAJAS_TASACIONES", "CAMPA"].forEach((p) => {
          processedText = processedText.replace(new RegExp("\\[\\[" + p + "\\]\\]", "g"), "");
        });

        // 4. Limpiamos espacios sobrantes
        processedText = processedText.replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim();

        bubble.innerHTML = processedText;
        if (!processedText) {
          bubble.style.setProperty("display", "none", "important");
        }
        bubble.dataset.netoPiecesInjected = "true";

        // El widget intercepta los clicks en las burbujas — forzamos los enlaces tel: y mailto:
        bubble.querySelectorAll('a[href^="mailto:"], a[href^="tel:"]').forEach((link) => {
          link.addEventListener("click", (e) => {
            e.stopPropagation();
            e.preventDefault();
            window.location.href = link.href;
          });
        });

        if (buttonsToRender.length === 0) return;

        // 5. Envolvemos la burbuja y los botones en un contenedor columna
        const wrapper = document.createElement("div");
        wrapper.className = "flex flex-col min-w-0";
        wrapper.style.gap = "8px";
        wrapper.style.alignItems = "flex-start";
        bubble.parentNode.insertBefore(wrapper, bubble);
        wrapper.appendChild(bubble);

        // 6. Renderizamos cada botón debajo de la burbuja
        buttonsToRender.forEach((btn) => {
          const caja = document.createElement("div");
          caja.className = "pb-2";
          wrapper.appendChild(caja);
          const root = createRoot(caja);

          if (btn.type === "whatsapp") {
            root.render(<WhatsAppCard phoneNumber={config.whatsappNumber || ""} wp={config} />);
            rootsRef.current.set(caja, { root, type: "whatsapp" });
          } else {
            root.render(<ContactButton btnType={btn.type} url={btn.url} />);
            rootsRef.current.set(caja, { root, type: "contact_button", btnType: btn.type });
          }
        });
        return;
      }

      // Procesado de piezas (sin cambios)
      const match = fullText.match(/\[\[PIEZAS:(.*?)\]\]/);
      if (!match) return;

      const keyword = match[1].trim();
      const botText = fullText.replace(/\[\[PIEZAS:.*?\]\]/g, "").trim();

      bubble.innerHTML = botText;
      if (!botText) {
        bubble.style.setProperty("display", "none", "important");
      }

      bubble.dataset.netoPiecesInjected = "true";

      const resultado = getPiezas(keyword);
      if (!resultado?.piezas?.length) return;

      const wrapper = document.createElement("div");
      wrapper.className = "flex flex-col w-full min-w-0";
      wrapper.style.gap = "8px";

      bubble.parentNode.insertBefore(wrapper, bubble);
      wrapper.appendChild(bubble);

      const cajaPiezas = document.createElement("div");
      cajaPiezas.className = "w-full pb-2";
      wrapper.appendChild(cajaPiezas);

      const root = createRoot(cajaPiezas);
      const { piezas, metadata } = resultado;
      root.render(<GridPiezas piezas={piezas} metadata={metadata} wp={wpRef.current} />);

      rootsRef.current.set(cajaPiezas, { root, type: "piezas", piezas, metadata });
    });
  }, [getPiezas]);

  const ejecutarInyeccion = useCallback(() => {
    if (!mounted) return;

    const config = wpRef.current;

    procesarBurbujas(".rcb-bot-message", true, config);
    procesarBurbujas(".rcb-user-message", false, config);

    inyectarHistorico();

    limpiarEtiquetasHuerfanas();
    inyectarBotonEnviar(config.sendBtnBg || "#ffc600", "#ffffff");
  }, [mounted, inyectarHistorico]);

  useEffect(() => {
    if (!mounted) return;

    let timer = null;
    const programar = () => {
      clearTimeout(timer);
      timer = setTimeout(ejecutarInyeccion, 50);
    };

    observerRef.current = new MutationObserver(programar);
    observerRef.current.observe(document.body, { childList: true, subtree: true });

    ejecutarInyeccion();

    return () => {
      clearTimeout(timer);
      observerRef.current?.disconnect();
    };
  }, [mounted, ejecutarInyeccion]);

  useEffect(() => {
    if (!mounted || !wp) return;

    rootsRef.current.forEach(({ root, type, piezas, metadata, btnType }) => {
      if (type === "piezas") {
        root.render(<GridPiezas piezas={piezas} metadata={metadata} wp={wp} />);
      } else if (type === "whatsapp") {
        root.render(<WhatsAppCard phoneNumber={wp.whatsappNumber || ""} wp={wp} />);
      } else if (type === "contact_button") {
        const url = getContactUrl(btnType, wp);
        if (url) root.render(<ContactButton btnType={btnType} url={url} />);
      }
    });
  }, [wp, mounted]);

  useEffect(() => {
    return () => {
      rootsRef.current.forEach((info) => info.root.unmount());
      rootsRef.current.clear();
    };
  }, []);
};
