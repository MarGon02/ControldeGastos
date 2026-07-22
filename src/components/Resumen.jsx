import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatoGs } from '../lib/formato'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// Primer y ultimo dia del mes, en formato YYYY-MM-DD
function rangoDelMes(anio, mes) {
  const dosDigitos = (n) => String(n).padStart(2, '0')
  const ultimoDia = new Date(anio, mes + 1, 0).getDate()
  return {
    desde: `${anio}-${dosDigitos(mes + 1)}-01`,
    hasta: `${anio}-${dosDigitos(mes + 1)}-${dosDigitos(ultimoDia)}`,
  }
}

export default function Resumen({ version }) {
  const hoy = new Date()
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth())
  const [movs, setMovs] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    cargar()
  }, [anio, mes, version])

  async function cargar() {
    setCargando(true)
    setError(null)

    const { desde, hasta } = rangoDelMes(anio, mes)

    // Solo gastos e ingresos pagados. Las transferencias se excluyen a
    // proposito: mover plata entre cuentas propias no es ganar ni gastar.
    const { data, error } = await supabase
      .from('movimiento')
      .select('tipo, monto, categoria(nombre)')
      .eq('estado', 'pagado')
      .in('tipo', ['gasto', 'ingreso'])
      .gte('fecha', desde)
      .lte('fecha', hasta)

    if (error) setError(error.message)
    else setMovs(data || [])

    setCargando(false)
  }

  function cambiarMes(delta) {
    let nuevoMes = mes + delta
    let nuevoAnio = anio

    if (nuevoMes < 0) {
      nuevoMes = 11
      nuevoAnio -= 1
    } else if (nuevoMes > 11) {
      nuevoMes = 0
      nuevoAnio += 1
    }

    setMes(nuevoMes)
    setAnio(nuevoAnio)
  }

  const totalIngresos = movs
    .filter((m) => m.tipo === 'ingreso')
    .reduce((s, m) => s + Number(m.monto), 0)

  const totalGastos = movs
    .filter((m) => m.tipo === 'gasto')
    .reduce((s, m) => s + Number(m.monto), 0)

  const balance = totalIngresos - totalGastos

  // Agrupamos los gastos por categoria
  const porCategoria = {}
  for (const m of movs) {
    if (m.tipo !== 'gasto') continue
    const nombre = m.categoria?.nombre || 'Sin categoria'
    porCategoria[nombre] = (porCategoria[nombre] || 0) + Number(m.monto)
  }

  const categoriasOrdenadas = Object.entries(porCategoria).sort((a, b) => b[1] - a[1])

  const esMesActual = anio === hoy.getFullYear() && mes === hoy.getMonth()

  return (
    <section style={estilos.seccion}>
      <div style={estilos.cabecera}>
        <button style={estilos.flecha} onClick={() => cambiarMes(-1)} title="Mes anterior">
          {'<'}
        </button>
        <h2 style={estilos.titulo}>
          {MESES[mes]} {anio}
          {esMesActual && <span style={estilos.badge}>actual</span>}
        </h2>
        <button style={estilos.flecha} onClick={() => cambiarMes(1)} title="Mes siguiente">
          {'>'}
        </button>
      </div>

      {error && <p style={estilos.error}>{error}</p>}

      {cargando ? (
        <p style={estilos.gris}>Cargando resumen...</p>
      ) : (
        <>
          <div style={estilos.tarjetas}>
            <div style={estilos.tarjeta}>
              <div style={estilos.etiqueta}>Ingresos</div>
              <div style={{ ...estilos.numero, color: '#1e8449' }}>{formatoGs(totalIngresos)}</div>
            </div>
            <div style={estilos.tarjeta}>
              <div style={estilos.etiqueta}>Gastos</div>
              <div style={{ ...estilos.numero, color: '#c0392b' }}>{formatoGs(totalGastos)}</div>
            </div>
            <div style={estilos.tarjeta}>
              <div style={estilos.etiqueta}>Balance</div>
              <div
                style={{
                  ...estilos.numero,
                  color: balance >= 0 ? '#1e8449' : '#c0392b',
                }}
              >
                {balance >= 0 ? '+' : '-'} {formatoGs(Math.abs(balance))}
              </div>
            </div>
          </div>

          <h3 style={estilos.subtitulo}>Gastos por categoria</h3>

          {categoriasOrdenadas.length === 0 ? (
            <p style={estilos.gris}>No hay gastos registrados en este mes.</p>
          ) : (
            <ul style={estilos.lista}>
              {categoriasOrdenadas.map(([nombre, monto]) => {
                const porcentaje = totalGastos > 0 ? (monto / totalGastos) * 100 : 0
                return (
                  <li key={nombre} style={estilos.itemCategoria}>
                    <div style={estilos.filaCategoria}>
                      <span style={estilos.nombreCategoria}>{nombre}</span>
                      <span style={estilos.montoCategoria}>
                        {formatoGs(monto)}{' '}
                        <span style={estilos.porcentaje}>{porcentaje.toFixed(0)}%</span>
                      </span>
                    </div>
                    <div style={estilos.barraFondo}>
                      <div style={{ ...estilos.barra, width: `${porcentaje}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

const estilos = {
  seccion: { marginBottom: 40 },
  cabecera: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  titulo: { margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 },
  badge: {
    fontSize: '0.65rem',
    textTransform: 'uppercase',
    opacity: 0.5,
    border: '1px solid #8886',
    borderRadius: 999,
    padding: '2px 8px',
    fontWeight: 400,
  },
  flecha: {
    width: 34,
    height: 34,
    borderRadius: 8,
    border: '1px solid #8886',
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  tarjetas: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  tarjeta: {
    flex: '1 1 130px',
    padding: '14px 16px',
    border: '1px solid #8884',
    borderRadius: 12,
  },
  etiqueta: { fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', marginBottom: 6 },
  numero: { fontSize: '1.05rem', fontWeight: 700 },
  subtitulo: { margin: '28px 0 12px', fontSize: '0.85rem', opacity: 0.6, textTransform: 'uppercase' },
  lista: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 },
  itemCategoria: {},
  filaCategoria: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
    fontSize: '0.9rem',
  },
  nombreCategoria: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  montoCategoria: { whiteSpace: 'nowrap', fontWeight: 600 },
  porcentaje: { opacity: 0.5, fontWeight: 400, fontSize: '0.8rem' },
  barraFondo: {
    height: 6,
    borderRadius: 999,
    background: '#8883',
    overflow: 'hidden',
  },
  barra: {
    height: '100%',
    borderRadius: 999,
    background: '#2d6cdf',
  },
  gris: { opacity: 0.6 },
  error: { color: '#c0392b', fontSize: '0.9rem' },
}