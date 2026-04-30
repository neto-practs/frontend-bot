import { IVA_PERCENT } from "../chatbot.config";

/**
 * Utilidad: calcularPrecios
 * Procesa un string o número de precio, calcula el IVA dinámico del .env
 * y devuelve objetos formateados para la UI.
 *
 * @param {string|number} precio - Valor bruto recibido del backend.
 * @returns {Object} Datos del precio (base, conIva, flags de consulta).
 */
export const calcularPrecios = (precio) => {
  const precioStr = String(precio || "").trim();

  // Cláusula de guarda para precios no numéricos o explícitos de "Consultar"
  if (!precioStr || precioStr.toLowerCase().includes("consultar")) {
    return {
      esConsultar: true,
      texto: precioStr || "Consultar",
    };
  }

  // Eliminamos cualquier cosa que no sea número, coma o punto
  const limpiarNumero = precioStr.replace(/[^0-9,.]/g, "");

  // Convertimos formato europeo (1.250,50) a estándar JS (1250.50)
  // Reemplazamos el punto de miles por nada y la coma decimal por punto
  const precioBase = parseFloat(
    limpiarNumero.includes(",") && limpiarNumero.includes(".")
      ? limpiarNumero.replace(/\./g, "").replace(",", ".")
      : limpiarNumero.replace(",", "."),
  );

  // Validación de seguridad tras el parseo
  if (isNaN(precioBase)) {
    return { esConsultar: true, texto: precioStr };
  }

  // Cálculos basados en el .env
  const factorIva = 1 + IVA_PERCENT;
  const precioConIva = precioBase * factorIva;

  // Formateador nativo de moneda (Estándar Profesional Intl)
  const formateador = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });

  return {
    esConsultar: false,
    base: formateador.format(precioBase),
    conIva: formateador.format(precioConIva),
  };
};
