import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatoGs, hoyISO, fechaCorta } from '../lib/formato'

export default function Movimientos({ cuentas, onCambio }) {
  const [movimientos, setMovimientos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  // Campos del formulario
  const [tipo, setTipo] = useState('gasto')
  const [cuentaId, setCuentaId] = useState('')
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(hoyISO())
  const [descripcion, setDescripcion] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    cargarMovimientos()
  }, [])

  // Si todavia no hay cuenta elegida, seleccionamos la primera disponible.
  useEffect(() => {
    if (!cuentaId && cuentas.length > 0) setCuentaId(cuentas[0].id)
  }, [cuentas, cuentaId])

  async function cargarMovimientos() {
    setCargando(true)
    setError(null)

    // Traemos los movimientos y, de cada uno, el nombre de su cuenta.
    const { data, error } = await supabase
      .from('movimiento')
      .select('*, cuenta(nombre)')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) setError(error.message)
    else setMovimientos(data)

    setCargando(false)
  }

  async function crearMovimiento(e) {
    e.preventDefault()
    setGuardando(true)
    setError(null)

    const { error } = await supabase.from('movimiento').insert({
      cuenta_id: cuentaId,
      tipo,
      monto: Number(monto),
      fecha,
      descripcion: descripcion || null,
      estado: 'pagado',
    })

    if (error) {
      setError(error.message)
    } else {
      setMonto('')
      setDescripcion('')
      setFecha(hoyISO())
      setMostrarForm(false)
      await cargarMovimientos()
      if (onCambio) onCambio() // avisa a App para refrescar los saldos
    }

    setGuardando(false)
  }

  async function borrarMovimiento(id) {
    const { error } = await supabase.from('movimiento').delete().eq('id', id)
    if (error) {
      setError(error.message)
    } else {
      await cargarMovimientos()
      if (onCambio) onCambio()
    }
  }

  const sinCuentas = cuentas.length === 0

  return (
    <section style={{ marginTop: 40 }}>
      <div style={estilos.cabecera}>
        <h2 style={estilos.titulo}>Movimientos</h2>
        <button
          style={estilos.botonPrimario}
          onClick={() => setMostrarForm(!mostrarForm)}
          disabled={sinCuentas}
        >
          {mostrarForm ? 'Cancelar' : '+ Nuevo'}
        </button>
      </div>

      {sinCuentas && (
        <p style={estilos.gris}>Primero crea una cuenta para poder registrar movimientos.</p>
      )}

      {mostrarForm && !sinCuentas && (
        <form onSubmit={crearMovimiento} style={estilos.form}>
          <div style={estilos.fila}>
            <button
              type="button"
              onClick={() => setTipo('gasto')}
              style={tipo === 'gasto' ? estilos.tabActivoGasto : estilos.tab}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => setTipo('ingreso')}
              style={tipo === 'ingreso' ? estilos.tabActivoIngreso : estilos.tab}
            >
              Ingreso
            </button>
          </div>

          <select
            style={estilos.input}
            value={cuentaId}
            onChange={(e) => setCuentaId(e.target.value)}
            required
          >
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>

          <input
            style={estilos.input}
            type="number"
            placeholder="Monto (Gs)"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            min="1"
            step="1"
            required
          />

          <input
            style={estilos.input}
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
          />

          <input
            style={estilos.input}
            type="text"
            placeholder="Descripcion (opcional)"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />

          <button style={estilos.botonPrimario} type="submit" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar movimiento'}
          </button>
        </form>
      )}

      {error && <p style={estilos.error}>{error}</p>}

      {cargando ? (
        <p style={estilos.gris}>Cargando movimientos...</p>
      ) : movimientos.length === 0 ? (
        <p style={estilos.gris}>Todavia no hay movimientos registrados.</p>
      ) : (
        <ul style={estilos.lista}>
          {movimientos.map((m) => {
            const esIngreso = m.tipo === 'ingreso' || m.tipo === 'transferencia_entrada'
            return (
              <li key={m.id} style={estilos.item}>
                <div style={{ minWidth: 0 }}>
                  <div style={estilos.itemNombre}>
                    {m.descripcion || (esIngreso ? 'Ingreso' : 'Gasto')}
                  </div>
                  <div style={estilos.itemDetalle}>
                    {fechaCorta(m.fecha)} · {m.cuenta?.nombre || 'Sin cuenta'}
                  </div>
                </div>
                <div style={estilos.derecha}>
                  <span style={{ ...estilos.itemMonto, color: esIngreso ? '#1e8449' : '#c0392b' }}>
                    {esIngreso ? '+' : '-'} {formatoGs(m.monto)}
                  </span>
                  <button
                    style={estilos.botonBorrar}
                    onClick={() => borrarMovimiento(m.id)}
                    title="Borrar"
                  >
                    x
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

const estilos = {
  cabecera: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  titulo: { margin: 0, fontSize: '1.25rem' },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: 16,
    border: '1px solid #8884',
    borderRadius: 12,
    marginBottom: 20,
  },
  fila: { display: 'flex', gap: 8 },
  tab: {
    flex: 1,
    padding: '10px',
    borderRadius: 8,
    border: '1px solid #8886',
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
  },
  tabActivoGasto: {
    flex: 1,
    padding: '10px',
    borderRadius: 8,
    border: '1px solid #c0392b',
    background: '#c0392b',
    color: 'white',
    cursor: 'pointer',
  },
  tabActivoIngreso: {
    flex: 1,
    padding: '10px',
    borderRadius: 8,
    border: '1px solid #1e8449',
    background: '#1e8449',
    color: 'white',
    cursor: 'pointer',
  },
  input: {
    padding: '10px 12px',
    fontSize: '1rem',
    border: '1px solid #8886',
    borderRadius: 8,
    background: 'transparent',
    color: 'inherit',
  },
  botonPrimario: {
    padding: '10px 14px',
    fontSize: '0.95rem',
    border: 'none',
    borderRadius: 8,
    background: '#2d6cdf',
    color: 'white',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  lista: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    border: '1px solid #8884',
    borderRadius: 12,
  },
  itemNombre: { fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  itemDetalle: { fontSize: '0.8rem', opacity: 0.6, marginTop: 2 },
  derecha: { display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' },
  itemMonto: { fontWeight: 600 },
  botonBorrar: {
    border: '1px solid #8886',
    background: 'transparent',
    color: 'inherit',
    borderRadius: 6,
    width: 26,
    height: 26,
    cursor: 'pointer',
    opacity: 0.6,
  },
  gris: { opacity: 0.6 },
  error: { color: '#c0392b', fontSize: '0.9rem' },
}