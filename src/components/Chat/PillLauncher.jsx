import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { MAX_Z_INDEX, MOBILE_BP } from "../../chatbot.config";

const PillLauncher = ({ toggleChat, config }) => {
  const bg         = config?.launcherBg         || "#F5A623"; 
  const title      = config?.launcherTitle      || "Hola, soy Neto";
  const text       = config?.launcherText       || "¿Te ayudo a encontrar tu pieza?";
  const icon       = config?.launcherIcon       || "";
  const arrowColor = bg; 

  // 🚀 ESTADO DEL ANCHO DE PANTALLA
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 🟢 ESTADO ONLINE/OFFLINE — ping al backend cada 15 segundos
  const [isOnline, setIsOnline] = useState(false);

  // 🟢🔴 LÓGICA DE PING AL BACKEND (FALSO MENSAJE)
  useEffect(() => {
    const checkBackend = async () => {
      try {
        // 1º Intenta coger la de WordPress, 2º coge la del .env de Vite
        const backendUrl = window.ChatBotConfig?.backendUrl || import.meta.env.VITE_API_URL;
        
        // Hacemos el ping simulando ser el chat
        const respuesta = await fetch(backendUrl, { 
          method: "POST", 
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            message: "ping_interno_ignorar", 
            reqId: "ping-test" 
          }) 
        });

        if (respuesta) {
          setIsOnline(true);
        }
      } catch (error) {
        setIsOnline(false);
      }
    };
    
    checkBackend();
    const interval = setInterval(checkBackend, 60000); // Comprueba cada 15 segundos
    return () => clearInterval(interval);
  }, []);

  // CÁLCULO DE TRAMOS
  const isMobile = windowWidth < MOBILE_BP;
  const isMedium = windowWidth <= 425;
  const isSmall  = windowWidth <= 375;
  const isTiny   = windowWidth <= 320;

  // 📏 REDUCCIÓN EXTREMA DE TAMAÑOS (Especialmente en isMedium/425px)
  const posMargin  = isTiny ? "4px"  : isSmall ? "6px"  : isMedium ? "8px"  : isMobile ? "12px" : "24px";
  const btnGap     = isTiny ? "4px"  : isSmall ? "5px"  : isMedium ? "6px"  : isMobile ? "8px"  : "12px";
  const btnPadding = isTiny ? "2px 6px 2px 2px" : isSmall ? "2px 8px 2px 2px" : isMedium ? "3px 8px 3px 3px" : isMobile ? "4px 10px 4px 4px" : "6px 12px 6px 6px";
  
  // Avatares minúsculos
  const avatarSize = isTiny ? "22px" : isSmall ? "26px" : isMedium ? "28px" : isMobile ? "32px" : "48px";
  
  // Fuentes al mínimo legal para que siga siendo legible
  const titleSize  = isTiny ? "10px" : isSmall ? "11px" : isMedium ? "12px" : isMobile ? "13px" : "15px";
  const subSize    = isTiny ? "8px"  : isSmall ? "9px"  : isMedium ? "10px" : isMobile ? "11px" : "13px";
  
  // Círculo de la flecha tipo "puntito"
  const circleSize = isTiny ? "16px" : isSmall ? "18px" : isMedium ? "20px" : isMobile ? "22px" : "28px";
  const arrowSize  = isTiny ? "8"    : isSmall ? "10"   : isMedium ? "10"   : isMobile ? "12"   : "16";

  const btnStyle = {
    position:      "fixed",
    bottom:        posMargin,
    right:         posMargin,
    zIndex:        MAX_Z_INDEX,
    display:       "flex",
    flexDirection: "row",
    alignItems:    "center",
    gap:           btnGap,
    padding:       btnPadding, 
    borderRadius:  "9999px",
    backgroundColor: bg,
    color:           "#ffffff", 
    fontFamily:    "'Inter', 'Segoe UI', system-ui, sans-serif",
    border:        "none",
    cursor:        "pointer",
    outline:       "none",
    boxShadow:     "0 4px 10px rgba(0,0,0,0.15)", // Sombra casi invisible en móvil
    transition:    "transform 0.3s ease, filter 0.3s ease",
    width:         "fit-content",
    maxWidth:      isMobile ? `calc(100vw - ${isTiny ? "8px" : isSmall ? "12px" : isMedium ? "16px" : "24px"})` : "360px",
  };

  // Contenedor relativo para el avatar + punto de estado
  const avatarWrapStyle = {
    position:  "relative",
    width:     avatarSize,
    minWidth:  avatarSize,
    height:    avatarSize,
    flexShrink: "0",
  };

  const iconWrapStyle = {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    width:          "100%",
    height:         "100%",
    borderRadius:   "50%",
    backgroundColor: "#ffffff", 
    overflow:       "hidden",
    boxShadow:      "0 2px 4px rgba(0,0,0,0.1)"
  };

  // Tamaño del circulito de estado (responsive, ~12px en desktop)
  const dotPx = isTiny ? "7px" : isSmall ? "8px" : isMedium ? "9px" : isMobile ? "10px" : "12px";

  const statusDotStyle = {
    position:        "absolute",
    bottom:          "0",
    right:           "0",
    width:           dotPx,
    height:          dotPx,
    borderRadius:    "50%",
    backgroundColor: isOnline ? "#22c55e" : "#ef4444",
    // Borde del mismo color que el fondo del botón para efecto "flotando"
    border:          `2px solid ${bg}`,
    boxSizing:       "border-box",
    transition:      "background-color 0.4s ease",
  };

  const imgStyle = {
    width:        "100%",
    height:       "100%",
    objectFit:    "cover",
  };

  const textWrapStyle = {
    display:       "flex",
    flexDirection: "column",
    alignItems:    "flex-start",
    justifyContent:"center",
    textAlign:     "left",
    flex:          "1 1 auto", 
    minWidth:      "0", 
    paddingRight:  "2px"
  };

  const titleStyle = {
    fontSize:   titleSize,
    fontWeight: "700",
    lineHeight: "1.1", 
    color:      "#ffffff",
    letterSpacing: "-0.2px",
    whiteSpace: "nowrap",
    overflow:   "hidden",
    textOverflow: "ellipsis",
    maxWidth:   "100%",
  };

  const subtitleStyle = {
    fontSize:   subSize,
    fontWeight: "400",
    lineHeight: "1.1",
    color:      "rgba(255, 255, 255, 0.95)",
    marginTop:  "1px", 
    display: "-webkit-box",
    // 🔴 RESTRICCIÓN CLAVE: En 425px o menos, forzamos a que el subtítulo sea de 1 sola línea siempre.
    WebkitLineClamp: isMedium ? 1 : 2, 
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    whiteSpace: "normal"
  };

  const arrowCircleStyle = {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    width:          circleSize,
    height:         circleSize,
    minWidth:       circleSize, 
    borderRadius:   "50%",
    backgroundColor: "#000000", 
    flexShrink:     0,
  };

  const button = (
    <button
      id="neto-pill-launcher"
      onClick={toggleChat}
      aria-label="Abrir chat"
      style={btnStyle}
      onMouseEnter={e => { 
        if(!isMobile) {
          e.currentTarget.style.filter = "brightness(1.08)"; 
          e.currentTarget.style.transform = "translateY(-3px)"; 
        }
      }}
      onMouseLeave={e => { 
        if(!isMobile) {
          e.currentTarget.style.filter = "none"; 
          e.currentTarget.style.transform = "none"; 
        }
      }}
    >
      {/* 🤖 AVATAR CON INDICADOR DE ESTADO ONLINE/OFFLINE */}
      <span style={avatarWrapStyle}>
        <span style={iconWrapStyle}>
          {icon ? (
            <img src={icon} alt="Avatar" style={imgStyle} />
          ) : (
            // SVG bot inline como fallback cuando no hay launcherIcon configurado
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width={isTiny || isMedium ? "16" : isMobile ? "24" : "42"} height={isTiny || isMedium ? "16" : isMobile ? "24" : "42"}>
              {/* Antena */}
              <rect x="47" y="4" width="6" height="14" rx="3" fill="#1a1a1a"/>
              <circle cx="50" cy="4" r="5" fill="#1a1a1a"/>
              {/* Cabeza */}
              <rect x="18" y="18" width="64" height="52" rx="14" fill="#1a1a1a"/>
              {/* Ojos */}
              <ellipse cx="37" cy="40" rx="9" ry="10" fill="white"/>
              <ellipse cx="63" cy="40" rx="9" ry="10" fill="white"/>
              {/* Sonrisa */}
              <path d="M38 58 Q50 68 62 58" stroke="white" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
              {/* Cuerpo / cuello */}
              <rect x="38" y="70" width="24" height="12" rx="4" fill="#1a1a1a"/>
            </svg>
          )}
        </span>
        {/* Punto de estado: verde = Online, rojo = Offline */}
        <span style={statusDotStyle} aria-label={isOnline ? "Online" : "Offline"} />
      </span>

      <span style={textWrapStyle}>
        <span style={titleStyle}>{title}</span>
        {text && <span style={subtitleStyle}>{text}</span>}
      </span>

      <span style={arrowCircleStyle}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={arrowColor} width={arrowSize} height={arrowSize}>
          <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
        </svg>
      </span>
    </button>
  );

  return createPortal(button, document.body);
};

export default PillLauncher;