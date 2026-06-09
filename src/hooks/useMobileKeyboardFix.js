import { useEffect } from "react";
import { isMobileViewport } from "../chatbot.config";

const WIN_SEL = ".rcb-chat-window";
const BODY_SEL = ".rcb-chat-body-container, .rcb-chat-body";

/**
 * Reescribe el contenido de <meta name="viewport"> conservando lo que ya
 * hubiera y forzando los flags que necesitamos mientras el chat está abierto:
 *
 *  - maximum-scale=1 / minimum-scale=1 / user-scalable=no
 *    → impiden el auto-zoom de iOS Safari al enfocar el input (que descuadra
 *      la vista y corta la cabecera/botones). Al fijar maximum-scale, iOS
 *      además resetea cualquier zoom activo a 1, recolocando todo.
 *  - interactive-widget=resizes-content
 *    → en Android hace que el teclado encoja el layout viewport.
 *
 * Se parsea a un mapa para no duplicar claves si ya existían.
 */
function buildLockedViewport(orig) {
  const map = {};
  (orig || "").split(",").forEach((part) => {
    const [k, v] = part.split("=").map((s) => (s || "").trim());
    if (k) map[k.toLowerCase()] = v;
  });
  map["width"] = "device-width";
  map["initial-scale"] = "1";
  map["maximum-scale"] = "1";
  map["minimum-scale"] = "1";
  map["user-scalable"] = "no";
  map["interactive-widget"] = "resizes-content";
  return Object.entries(map)
    .map(([k, v]) => (v == null || v === "" ? k : `${k}=${v}`))
    .join(", ");
}

/**
 * useMobileKeyboardFix
 *
 * Maneja el teclado virtual en dispositivos táctiles (móvil y tablet). El modo se
 * decide con isMobileViewport() (mismo criterio que buildStyles y el CSS):
 *
 * MODO PANTALLA COMPLETA — móvil y tablets táctiles (iPad). El chat ocupa toda la
 * pantalla. Es el caso normal en táctil:
 *  1. En Android (Chrome) se fuerza interactive-widget=resizes-content para que
 *     el teclado encoja el layout viewport.
 *  2. En iOS Safari/iPadOS (que ignora resizes-content) se usa visualViewport para
 *     fijar height/top/bottom exactos y anclar la ventana al área visible. Tratar
 *     el iPad como pantalla completa evita el descuadre del panel flotante con el
 *     teclado, que era frágil e impredecible.
 *
 * MODO FLOTANTE — solo dispositivos con táctil secundario (p.ej. portátil con
 * pantalla táctil, pointer: fine). El chat es un panel anclado abajo a la derecha;
 * si aparece un teclado virtual se eleva con translateY por encima de él
 * (técnica de Intercom/Crisp) y se limita su altura. Caso poco común, queda como
 * red de seguridad.
 *
 * Solo se activa en dispositivos táctiles — en escritorio con ratón no hay teclado
 * virtual y no se toca nada.
 *
 * Importante: se añade `transition:none` al chat-window para que los reposicionados
 * sean inmediatos. Sin esto, el CSS `transition: all .3s ease` de react-chatbotify
 * anima el cambio y produce el efecto de "se sube y se recoloca".
 */
export function useMobileKeyboardFix(isChatOpen) {
  useEffect(() => {
    if (!isChatOpen) return;

    // Solo dispositivos táctiles: en escritorio no existe teclado virtual.
    const isTouch =
      window.matchMedia?.("(pointer: coarse)").matches ||
      navigator.maxTouchPoints > 0;
    if (!isTouch) return;

    // ── Capa 1: meta viewport (Android resizes-content + bloqueo de zoom iOS) ──
    const meta = document.querySelector('meta[name="viewport"]');
    let restoreMeta = null;
    if (meta) {
      const orig = meta.getAttribute("content") || "";
      meta.setAttribute("content", buildLockedViewport(orig));
      restoreMeta = () => meta.setAttribute("content", orig);
    }

    // ── Capa 2: iOS + red de seguridad (visualViewport) ──────────────────────
    const vv = window.visualViewport;
    if (!vv) return () => { restoreMeta?.(); };

    let raf = 0;
    let cachedWin = null;
    // Propiedades inline que tocamos, para limpiarlas exactamente al desmontar.
    const touched = new Set();

    const getWin = () => {
      if (cachedWin?.isConnected) return cachedWin;
      return (cachedWin = document.querySelector(WIN_SEL));
    };

    const setP = (el, prop, value) => {
      el.style.setProperty(prop, value, "important");
      touched.add(prop);
    };

    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = getWin();
        if (!el) return;

        const vvH = Math.round(vv.height);
        const vvTop = Math.round(vv.offsetTop);

        if (isMobileViewport()) {
          // ── Móvil/tablet: ventana a pantalla completa anclada al viewport visible ──
          setP(el, "transition", "none");
          setP(el, "height", `${vvH}px`);
          setP(el, "max-height", `${vvH}px`);
          setP(el, "top", `${vvTop}px`);
          // Anular el bottom:0 del CSS para que no conflicte con height+top
          setP(el, "bottom", "auto");
        } else {
          // ── Tablet/flotante: elevar el panel por encima del teclado ──
          // translateY = cuánto se ha encogido el área visible por abajo (<= 0).
          // Teclado cerrado → 0 (sin transform); abierto → negativo (sube).
          const ty = vvTop + vvH - window.innerHeight;
          if (ty < -1) {
            setP(el, "transition", "none");
            setP(el, "transform", `translateY(${Math.round(ty)}px)`);
            // Limitar altura para que el panel quepa en el área visible.
            setP(el, "max-height", `${Math.max(260, vvH - 48)}px`);
          } else {
            // Teclado cerrado: retirar overrides y dejar el estado en reposo
            // (incluida la animación de apertura de la librería).
            ["transform", "max-height", "transition"].forEach((p) =>
              el.style.removeProperty(p)
            );
          }
        }

        const body = document.querySelector(BODY_SEL);
        if (body) body.scrollTop = body.scrollHeight;
      });
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);

    const onFocusIn = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag !== "input" && tag !== "textarea") return;
      update();
      setTimeout(update, 100);
      setTimeout(update, 300);
      setTimeout(update, 600); // iOS tarda más en estabilizar el teclado
    };
    document.addEventListener("focusin", onFocusIn);

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      document.removeEventListener("focusin", onFocusIn);
      cancelAnimationFrame(raf);
      restoreMeta?.();

      const el = getWin();
      if (el) touched.forEach((p) => el.style.removeProperty(p));
    };
  }, [isChatOpen]);
}
