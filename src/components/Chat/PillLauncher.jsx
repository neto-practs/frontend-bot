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

  // 📐 CÁLCULO DE TRAMOS
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

  const iconWrapStyle = {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    width:          avatarSize,
    height:         avatarSize,
    minWidth:       avatarSize, 
    borderRadius:   "50%",
    backgroundColor: "#ffffff", 
    flexShrink:     "0", 
    overflow:       "hidden",
    boxShadow:      "0 2px 4px rgba(0,0,0,0.1)"
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
      <span style={iconWrapStyle}>
        {icon ? (
          <img src={icon} alt="Avatar" style={imgStyle} />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#999" width={isMedium ? "16" : "28"} height={isMedium ? "16" : "28"}>
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
          </svg>
        )}
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