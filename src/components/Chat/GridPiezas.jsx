import PriceDisplay from "./PriceDisplay";

// CONSTANTES
// Imagen por defecto si la pieza no tiene foto en la base de datos.
const FALLBACK_IMAGE = "https://via.placeholder.com/150x100?text=Sin+Imagen";

/**
 * Componente TarjetaPieza
 * Dibuja una única "caja" con la foto, el título, el precio y el botón de un producto.
 * @param {Object} props
 * @param {Object} props.pieza - Datos del recambio.
 * @param {string} props.pieza.imagen - URL de la foto.
 * @param {string} props.pieza.titulo - Nombre descriptivo.
 * @param {string|number} props.pieza.precio - Precio formateado o numérico.
 * @param {string} props.pieza.url - Enlace de compra.
 */

export const TarjetaPieza = ({ pieza }) => {
  const { imagen, titulo, precio, url } = pieza;

  const textoBoton = window.ChatBotConfig?.buyBtnText || "🛒 Comprar";
  const colorBoton = window.ChatBotConfig?.buyBtnBg || "#99c355";

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

        {/* mt-auto empuja el botón al fondo para igualar alturas de tarjeta */}
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
 * Si hay más resultados en la base de datos que los mostrados en el chat,
 * inyecta automáticamente un botón ("Ver más") dinámico para redirigir a la tienda.
 *
 * @param {Object} props - Propiedades inyectadas al componente.
 * @param {Array<Object>} props.piezas - Array con los datos de los recambios a mostrar.
 * @param {Object} props.metadata - Datos extra de la consulta al servidor.
 * @param {number} props.metadata.totalReal - Cantidad total de piezas encontradas en la BD.
 * @param {string} props.metadata.queryLimpia - Texto de búsqueda limpiado para construir la URL.
 * @returns {JSX.Element|null} El grid de piezas o `null` si el array está vacío.
 */
const GridPiezas = ({ piezas, metadata }) => {
  if (!piezas || piezas.length === 0) return null;

  // WORDPRESS PERSONALIZABLE
  const colorBotonVerMas = window.ChatBotConfig?.viewMoreBtnColor || "#99c355";

  const textoBase =
    window.ChatBotConfig?.viewMoreBtnText || "Ver las {total} opciones";
  
  const textoVerMasFinal = textoBase.replace("{total}", metadata.totalReal);

  // .ENV : Leemos la URL base de tu .env de Vite
  const baseUrl =
    import.meta.env.VITE_SITE_URL ||
    "https://dev4premium.desguacesyrecambios.com";

  // Verificamos si hay mas resultados de los mostrados.
  const hayMasResultados = metadata && metadata.totalReal > piezas.length;

  // Construimos la URL dinámica usando el .env
  const urlWeb = metadata
    ? `${baseUrl}/recambios/?locale=es&q=${encodeURIComponent(metadata.queryLimpia)}`
    : "#";

  return (
    <div className="flex flex-col w-full">
      <div className="grid grid-cols-2 gap-3 p-2 my-2 w-full box-border bg-transparent">
        {piezas.map((pieza, index) => (
          <TarjetaPieza key={pieza.id || index} pieza={pieza} />
        ))}
      </div>

      {hayMasResultados && (
        <div className="px-2 pb-2 w-full box-border">
          <a
            href={urlWeb}
            target="_blank"
            // Seguridad: evita que la nueva pestaña manipule la ventana del chat.
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
