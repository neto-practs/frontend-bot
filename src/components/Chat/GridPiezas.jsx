import PriceDisplay from "./PriceDisplay";

// CONSTANTES
// Imagen por defecto si la pieza no tiene foto en la base de datos.
const FALLBACK_IMAGE = "https://via.placeholder.com/150x100?text=Sin+Imagen";

/**
 * Componente TarjetaPieza
 * Dibuja una única "caja" con la foto, el título, el precio y el botón de un producto.
 */
export const TarjetaPieza = ({ pieza, wp }) => {
  const { imagen, titulo, precio, url } = pieza;

  // Prioridad: prop wp > global window > default
  const config = wp || window.ChatBotConfig || {};
  const textoBoton = config.buyBtnText || "🛒 Comprar";
  const colorBoton = config.buyBtnBg || "#99c355";

  return (
    <div className="flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden box-border h-full">
      <img
        src={imagen || FALLBACK_IMAGE}
        alt={titulo}
        className="w-full h-24 object-cover bg-gray-50 border-b border-gray-100"
      />

      <div className="p-3 flex flex-col flex-1 gap-2 items-center text-center">
        <div
          className="text-sm font-bold text-gray-800 leading-tight line-clamp-3 break-words m-0 p-0 w-full uppercase"
          title={titulo}
        >
          {titulo}
        </div>

        <PriceDisplay precio={precio} />

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto w-full block text-white text-[11px] px-2 py-2 rounded text-center font-medium hover:opacity-90 transition-opacity box-border"
          style={{ backgroundColor: colorBoton }}
        >
          {textoBoton}
        </a>
      </div>
    </div>
  );
};

/**
 * Dibuja una cuadrícula de 2 columnas con las tarjetas de los recambios.
 */
const GridPiezas = ({ piezas, metadata, wp }) => {
  if (!piezas || piezas.length === 0) return null;

  // Prioridad: prop wp > global window > default
  const config = wp || window.ChatBotConfig || {};
  const colorBotonVerMas = config.viewMoreBtnColor || "#99c355";
  const textoBase = config.viewMoreBtnText || "Ver las {total} opciones";
  
  const textoVerMasFinal = textoBase.replace("{total}", metadata?.totalReal || piezas.length);

  const baseUrl = import.meta.env.VITE_SITE_URL || "https://dev4premium.desguacesyrecambios.com";
  const hayMasResultados = metadata && metadata.totalReal > piezas.length;
  const urlWeb = metadata ? `${baseUrl}/recambios/?locale=es&q=${encodeURIComponent(metadata.queryLimpia)}` : "#";

  return (
    <div className="flex flex-col w-full">
      <div className="grid grid-cols-2 gap-3 p-2 my-2 w-full box-border bg-transparent">
        {piezas.map((pieza, index) => (
          <TarjetaPieza key={pieza.id || index} pieza={pieza} wp={wp} />
        ))}
      </div>

      {hayMasResultados && (
        <div className="px-2 pb-2 w-full box-border">
          <a
            href={urlWeb}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-[12px] font-semibold bg-white border rounded py-2 transition-colors duration-200 w-full"
            style={{
              color: colorBotonVerMas,
              borderColor: colorBotonVerMas,
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = colorBotonVerMas;
              e.currentTarget.style.color = "white";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "white";
              e.currentTarget.style.color = colorBotonVerMas;
            }}
          >
            {textoVerMasFinal}
          </a>
        </div>
      )}
    </div>
  );
};

export default GridPiezas;
