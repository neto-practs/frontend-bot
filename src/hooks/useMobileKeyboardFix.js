import { useEffect, useRef, useCallback } from "react";

const MOBILE_BP = 768;

/**
 * useMobileKeyboardFix
 *
 * Soluciona los problemas de teclado virtual en móvil:
 * 1. El botón de enviar no responde mientras el input está enfocado.
 * 2. La conversación se desplaza fuera de vista al abrir el teclado.
 *
 * Estrategia:
 * - Usamos visualViewport.height Y visualViewport.offsetTop para repositionar
 *   el chat-window dentro del área visible cuando el teclado está abierto.
 *   En iOS, offsetTop > 0 cuando el teclado empuja el viewport hacia arriba;
 *   sin ajustar `top`, el chat-window queda parcialmente bajo el teclado.
 * - Double-RAF en scrollToBottom garantiza que el layout haya terminado antes
 *   de actualizar scrollTop.
 * - El fix del botón enviar vive en FloatingWidget (touchstart preventDefault).
 */
export function useMobileKeyboardFix() {
  const isKeyboardOpenRef = useRef(false);
  const scrollBodyRef = useRef(null);
  const chatWindowRef = useRef(null);
  const rafRef = useRef(null);
  const initialHeightRef = useRef(
    window.visualViewport?.height || window.innerHeight
  );

  const getChatBody = useCallback(() => {
    if (scrollBodyRef.current && scrollBodyRef.current.isConnected) {
      return scrollBodyRef.current;
    }
    const body = document.querySelector(
      ".rcb-chat-body-container, .rcb-chat-body"
    );
    if (body) scrollBodyRef.current = body;
    return body;
  }, []);

  const getChatWindow = useCallback(() => {
    if (chatWindowRef.current && chatWindowRef.current.isConnected) {
      return chatWindowRef.current;
    }
    const win = document.querySelector(".rcb-chat-window");
    if (win) chatWindowRef.current = win;
    return win;
  }, []);

  // Double RAF: espera dos frames para que el layout refleje la nueva altura
  const scrollToBottom = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const body = getChatBody();
        if (body) body.scrollTop = body.scrollHeight;
      });
    });
  }, [getChatBody]);

  // Repositiona el chat-window dentro del área visible del visualViewport.
  // offsetTop > 0 en iOS cuando el teclado está abierto y ha desplazado el viewport.
  const applyViewportHeight = useCallback((height, offsetTop = 0) => {
    const chatWindow = getChatWindow();
    if (!chatWindow) return;

    chatWindow.style.setProperty("height", `${height}px`, "important");
    chatWindow.style.setProperty("max-height", `${height}px`, "important");
    chatWindow.style.setProperty("top", `${offsetTop}px`, "important");
    chatWindow.style.setProperty("bottom", "auto", "important");
  }, [getChatWindow]);

  const updateViewportHeight = useCallback(() => {
    const vv = window.visualViewport;
    const currentHeight = vv ? vv.height : window.innerHeight;
    const offsetTop = vv ? Math.round(vv.offsetTop) : 0;

    const vhReal = currentHeight * 0.01;
    document.documentElement.style.setProperty("--vh-real", `${vhReal}px`);

    const refHeight = initialHeightRef.current;
    const keyboardOpen = (refHeight - currentHeight) > refHeight * 0.25;

    if (keyboardOpen && !isKeyboardOpenRef.current) {
      // ── Teclado ABIERTO ──
      isKeyboardOpenRef.current = true;
      document.body.classList.add("neto-keyboard-open");

      window.scrollTo(0, 0);
      applyViewportHeight(currentHeight, offsetTop);

      scrollToBottom();
      setTimeout(scrollToBottom, 150);
      setTimeout(scrollToBottom, 400);

    } else if (!keyboardOpen && isKeyboardOpenRef.current) {
      // ── Teclado CERRADO ──
      isKeyboardOpenRef.current = false;
      document.body.classList.remove("neto-keyboard-open");

      const chatWindow = getChatWindow();
      if (chatWindow) {
        chatWindow.style.removeProperty("height");
        chatWindow.style.removeProperty("max-height");
        chatWindow.style.removeProperty("top");
        chatWindow.style.removeProperty("bottom");
      }

      window.scrollTo(0, 0);
      scrollToBottom();
      setTimeout(scrollToBottom, 100);

    } else if (keyboardOpen) {
      // ── Teclado sigue abierto (rotación u otro cambio de viewport) ──
      window.scrollTo(0, 0);
      applyViewportHeight(currentHeight, offsetTop);
      scrollToBottom();
    }
  }, [scrollToBottom, applyViewportHeight, getChatWindow]);

  useEffect(() => {
    if (window.innerWidth >= MOBILE_BP) return;

    const vv = window.visualViewport;

    const initH = (vv ? vv.height : window.innerHeight) * 0.01;
    document.documentElement.style.setProperty("--vh-real", `${initH}px`);

    if (vv) {
      vv.addEventListener("resize", updateViewportHeight);
      vv.addEventListener("scroll", updateViewportHeight);
    }

    // Fallback para navegadores sin visualViewport
    const handleWindowResize = () => {
      if (vv) return;
      document.documentElement.style.setProperty(
        "--vh-real",
        `${window.innerHeight * 0.01}px`
      );
      const refHeight = initialHeightRef.current;
      const keyboardOpen = (refHeight - window.innerHeight) > refHeight * 0.25;
      if (keyboardOpen) {
        document.body.classList.add("neto-keyboard-open");
        scrollToBottom();
        setTimeout(scrollToBottom, 200);
      } else {
        document.body.classList.remove("neto-keyboard-open");
      }
    };
    window.addEventListener("resize", handleWindowResize);

    // Focus: scroll cuando el usuario toca un input/textarea
    const handleFocusIn = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") {
        setTimeout(() => {
          updateViewportHeight();
          scrollToBottom();
        }, 200);
        setTimeout(scrollToBottom, 500);
        setTimeout(scrollToBottom, 800);
      }
    };

    // Bloquear scroll del BODY fuera del chat-window
    const handleTouchMove = (e) => {
      if (!isKeyboardOpenRef.current) return;
      const chatWindow = getChatWindow();
      if (chatWindow && chatWindow.contains(e.target)) return;
      e.preventDefault();
    };

    const handleTouchStart = (e) => {
      if (!isKeyboardOpenRef.current) return;
      const chatWindow = getChatWindow();
      if (chatWindow && chatWindow.contains(e.target)) return;
      if (e.touches.length === 1) e.preventDefault();
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchstart", handleTouchStart, { passive: false });

    const handleOrientation = () => {
      setTimeout(() => {
        initialHeightRef.current = vv ? vv.height : window.innerHeight;
        updateViewportHeight();
      }, 300);
    };
    window.addEventListener("orientationchange", handleOrientation);

    return () => {
      if (vv) {
        vv.removeEventListener("resize", updateViewportHeight);
        vv.removeEventListener("scroll", updateViewportHeight);
      }
      window.removeEventListener("resize", handleWindowResize);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("orientationchange", handleOrientation);
      document.documentElement.style.removeProperty("--vh-real");
      document.body.classList.remove("neto-keyboard-open");

      const chatWindow = getChatWindow();
      if (chatWindow) {
        chatWindow.style.removeProperty("height");
        chatWindow.style.removeProperty("max-height");
        chatWindow.style.removeProperty("top");
        chatWindow.style.removeProperty("bottom");
      }

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [updateViewportHeight, scrollToBottom, getChatBody, getChatWindow]);
}
