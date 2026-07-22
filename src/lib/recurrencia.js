// Calcula las fechas en que un gasto fijo deberia cobrarse.

// Suma meses cuidando los meses cortos: 31/01 + 1 mes -> 28/02 (no 03/03).
function sumarMeses(fecha, cantidad) {
  const d = new Date(fecha.getTime())
  const diaOriginal = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + cantidad)
  const ultimoDiaDelMes = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(diaOriginal, ultimoDiaDelMes))
  return d
}

function sumarDias(fecha, cantidad) {
  const d = new Date(fecha.getTime())
  d.setDate(d.getDate() + cantidad)
  return d
}

function aISO(d) {
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

function desdeISO(iso) {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d)
}

/**
 * Devuelve la lista de vencimientos de un gasto fijo.
 * Genera hasta "mesesAdelante" meses en el futuro (por defecto 2).
 * Si el gasto tiene plazo, corta en la cantidad de cuotas.
 */
export function calcularVencimientos(gastoFijo, mesesAdelante = 2) {
  const inicio = desdeISO(gastoFijo.fecha_inicio)
  const limite = sumarMeses(new Date(), mesesAdelante)

  // Fecha del primer vencimiento (la usamos SIEMPRE como ancla, para que
  // un gasto del dia 31 no se corra al 28 despues de pasar por febrero).
  let base = new Date(inicio.getTime())
  if (gastoFijo.frecuencia === 'mensual' && gastoFijo.dia_cobro) {
    const ultimoDia = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()
    base.setDate(Math.min(gastoFijo.dia_cobro, ultimoDia))
    if (base < inicio) base = sumarMeses(base, 1)
    // Si el dia de cobro es mayor al ultimo dia del mes inicial, reponemos
    // el dia deseado para que los meses siguientes lo respeten.
    base.setDate(Math.min(gastoFijo.dia_cobro, new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()))
  }

  const diaAncla = gastoFijo.dia_cobro || base.getDate()
  const maximo = gastoFijo.tiene_plazo ? gastoFijo.cantidad_cuotas : 240 // tope de seguridad
  const fechas = []

  for (let i = 0; i < maximo; i++) {
    let fecha

    if (gastoFijo.frecuencia === 'mensual' || gastoFijo.frecuencia === 'anual') {
      const saltoMeses = gastoFijo.frecuencia === 'mensual' ? i : i * 12
      fecha = sumarMeses(base, saltoMeses)
      // Reponemos el dia deseado (clampeado al mes que toque).
      const ultimoDia = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate()
      fecha.setDate(Math.min(diaAncla, ultimoDia))
    } else if (gastoFijo.frecuencia === 'quincenal') {
      fecha = sumarDias(base, i * 15)
    } else if (gastoFijo.frecuencia === 'semanal') {
      fecha = sumarDias(base, i * 7)
    } else {
      break
    }

    if (!gastoFijo.tiene_plazo && fecha > limite) break

    fechas.push({ fecha: aISO(fecha), numero: i + 1 })
  }

  return fechas
}

// Dias que faltan (negativo = ya vencio)
export function diasHasta(iso) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const objetivo = desdeISO(iso)
  return Math.round((objetivo - hoy) / 86400000)
}