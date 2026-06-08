import { useEffect } from "react";

const MOBILE_BP = 768;
const WIN_SEL = ".rcb-chat-window";
const BODY_SEL = ".rcb-chat-body-container, .rcb-chat-body";

/**
 * useMobileKeyboardFix
 *
 * Dos problemas que resuelve:
 *
 * 1. En Android (Chrome), el teclado por defecto usa interactive-widget=resizes-visual:
 *    no encoge el layout viewport, sino que "panea" el viewport visual. Los elementos
 *    position:fixed con inset:0/100dvh mantienen su tamaño y el browser los desplaza,
 *    con lo que la cabecera y mensajes se van por arriba y el input queda flotando.
 *    Forzar resizes-content hace que el teclado encoja el layout viewport, y CSS solo
 *    (inset:0 + 100dvh) ya encaja el chat sobre el teclado sin intervención JS.
 *
 * 2. En iOS Safari, resizes-content se ignora. Safari panea la página y puede que
 *    el chat quede parcialmente tapado por el teclado. Se usa visualViewport para
 *    fijar la altura y el desplazamiento exactos.
 *
 * Importante: se añade `transition:none` al chat-window para que los cambios de
 * height/top sean inmediatos. Sin esto, el CSS `transition: all .3s ease` de
 * react-chatbotify anima el resize y produce el efecto de "se sube y se recoloca".
 */
export function useMobileKeyboardFix(isChatOpen) {
  useEffect(() => {
    if (window.innerWidth >= MOBILE_BP || !isChatOpen) return;

    // ── Capa 1: Android Chrome ────────────────────────────────────────────────
    const meta = document.querySelector('meta[name="viewport"]');
    let restoreMeta = null;
    if (meta && !/interactive-widget/.test(meta.getAttribute("content") || "")) {
      const orig = meta.getAttribute("content") || "";
      meta.setAttribute("content", `${orig}, interactive-widget=resizes-content`);
      restoreMeta = () => meta.setAttribute("content", orig);
    }

    // ── Capa 2: iOS + red de seguridad (visualViewport) ──────────────────────
    const vv = window.visualViewport;
    if (!vv) return () => { restoreMeta?.(); };

    let raf = 0;
    let cachedWin = null;

    const getWin = () => {
      if (cachedWin?.isConnected) return cachedWin;
      return (cachedWin = document.querySelector(WIN_SEL));
    };

    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = getWin();
        if (!el) return;

        const h = Math.round(vv.height);
        const offsetTop = Math.round(vv.offsetTop);

        // Desactivar transition para que el resize sea instantáneo (sin animación
        // del CSS `transition: all .3s ease` de react-chatbotify que causa el glitch)
        el.style.setProperty("transition", "none", "important");
        // Altura exacta del viewport visible (sin el teclado)
        el.style.setProperty("height", `${h}px`, "important");
        el.style.setProperty("max-height", `${h}px`, "important");
        // En iOS, offsetTop > 0 cuando Safari desplaza la página; lo compensamos
        el.style.setProperty("top", `${offsetTop}px`, "important");

        // Scroll al último mensaje
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
      setTimeout(update, 150);
      setTimeout(update, 400);
    };
    document.addEventListener("focusin", onFocusIn);

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      document.removeEventListener("focusin", onFocusIn);
      cancelAnimationFrame(raf);
      restoreMeta?.();

      const el = getWin();
      if (el) {
        ["transition", "height", "max-height", "top"].forEach((p) =>
          el.style.removeProperty(p)
        );
      }
    };
  }, [isChatOpen]);
}
