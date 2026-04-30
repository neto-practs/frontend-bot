import { calcularPrecios } from "../../utils/formatMoney";

/**
 * Componente PriceDisplay
 * Se encarga de renderizar la visualización de precios en las tarjetas.
 * Si el producto no tiene precio o es a convenir, muestra un texto indicativo.
 * Si tiene precio, desglosa visualmente el importe con y sin IVA.
 *
 * @param {Object} props
 * @param {string|number} props.precio - El precio en bruto recibido de la API.
 * @returns {JSX.Element} El bloque visual del precio.
 */
const PriceDisplay = ({ precio }) => {
  //Calculo matemático a una función externa.
  const datosPrecio = calcularPrecios(precio);

  //Si el precio es "Consultar" (default del backend), evitamos renderizar
  if (datosPrecio.esConsultar) {
    return (
      <span className="text-sm font-bold text-gray-800 my-1">
        {datosPrecio.texto}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-center my-1 gap-0.5">
      <span className="text-[14px] font-bold text-gray-800 leading-none">
        {datosPrecio.conIva}
      </span>
      <span className="text-[10px] text-gray-500 leading-none">
        ({datosPrecio.base} sin IVA)
      </span>
    </div>
  );
};

export default PriceDisplay;
