import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatoGs, hoyISO, fechaCorta } from '../lib/formato'

export default function Movimientos({ cuentas, categorias, onCambio }) {
  const [movimientos, setMovimientos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  // Campos del formulario
  const [tipo, setTipo] = useState('gasto') // 'gasto' | 'ingreso' | 'transferencia'
  const [cuentaId, setCuentaId] = useState('')
  const [cuentaDestinoId, setCuentaDestinoId] = useState('')
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(hoyISO())
  const [descripcion, setDescripcion] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    cargarMovimientos()
  }, [])

  useEffect(() => {
    if (!cuentaId && cuentas.length > 0) setCuentaId(cuentas[0].id)
  }, [cuentas, cuentaId])

  async function cargarMovimientos() {
    setCargando(true)
    setError(null)

    const { data, error } = await supabase
      .from('movimiento')
      .select('*, cuenta(nombre), categoria(nombre)')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) setError(error.message)
    else setMovimientos(data)

    setCargando(false)
  }

  async function crearMovimiento(e) {
    e.preventDefault()
    setError(null)

    if (tipo === 'transferencia') {
      if (cuentaId === cuentaDestinoId) {
        setError('La cuenta de origen y destino no pueden ser la misma.')
        return
      }
      setGuardando(true)

      // Las dos filas comparten este id para saber que son la misma transferencia.
      const grupo = crypto.randomUUID()

      // Se insertan juntas en una sola operacion: o entran las dos, o ninguna.
      const { error } = await supabase.from('movimiento').insert([
        {
          cuenta_id: cuentaId,
          tipo: 'transferencia_salida',
          monto: Number(monto),
          fecha,
          descripcion: descripcion || null,
          estado: 'pagado',
          grupo_transf: grupo,
        },
        {
          cuenta_id: cuentaDestinoId,
          tipo: 'transferencia_entrada',
          monto: Number(monto),
          fecha,
          descripcion: descripcion || null,
          estado: 'pagado',
          grupo_transf: grupo,
        },
      ])

      if (error) setError(error.message)
      else await limpiarYRefrescar()

      setGuardando(false)
      return
    }

    // Gasto o ingreso normal
    setGuardando(true)
    const { error } = await supabase.from('movimiento').insert({
      cuenta_id: cuentaId,
      tipo,
      monto: Number(monto),
      fecha,
      descripcion: descripcion || null,
      categoria_id: categoriaId || null,
      estado: 'pagado',
    })

    if (error) setError(error.message)
    else await limpiarYRefrescar()

    setGuardando(false)
  }

  async function limpiarYRefrescar() {
    setMonto('')
    setDescripcion('')
    setCategoriaId('')
    setFecha(hoyISO())
    setMostrarForm(false)
    await cargarMovimientos()
    if (onCambio) onCambio()
  }

  async function borrarMovimiento(m) {
    // Si es parte de una transferencia, borramos las dos filas juntas.
    const consulta = m.grupo_transf
      ? supabase.from('movimiento').delete().eq('grupo_transf', m.grupo_transf)
      : supabase.from('movimiento').delete().eq('id', m.id)

    const { error } = await consulta

    if (error) {
      setError(error.message)
    } else {
      await cargarMovimientos()
      if (onCambio) onCambio()
    }
  }

  const categoriasFiltradas = (categorias || []).filter((c) => c.tipo === tipo)
  const sinCuentas = cuentas.length === 0
  const pocasCuentas = cuentas.length < 2
  const esTransf = tipo === 'transferencia'

  // Para no mostrar la transferencia dos veces, ocultamos la fila de entrada
  // y en la de salida mostramos "origen -> destino".
  const visibles = movimientos.filter((m) => m.tipo !== 'transferencia_entrada')

  function nombreDestino(m) {
    const par = movimientos.find(
      (x) => x.grupo_transf === m.grupo_transf && x.tipo === 'transferencia_entrada'
    )
    return par?.cuenta?.nombre || '?'
  }

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
            <button
              type="button"
              onClick={() => setTipo('transferencia')}
              style={esTransf ? estilos.tabActivoTransf : estilos.tab}
              disabled={pocasCuentas}
              title={pocasCuentas ? 'Necesitas al menos 2 cuentas' : ''}
            >
              Transferencia
            </button>
          </div>

          <label style={estilos.label}>
            {esTransf ? 'Desde' : 'Cuenta'}
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
          </label>

          {esTransf && (
            <label style={estilos.label}>
              Hacia
              <select
                style={estilos.input}
                value={cuentaDestinoId}
                onChange={(e) => setCuentaDestinoId(e.target.value)}
                required
              >
                <option value="">Elegi la cuenta destino</option>
                {cuentas
                  .filter((c) => c.id !== cuentaId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
              </select>
            </label>
          )}

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

          {!esTransf && (
            <select
              style={estilos.input}
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
            >
              <option value="">Sin categoria</option>
              {categoriasFiltradas.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          )}

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
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </form>
      )}

      {error && <p style={estilos.error}>{error}</p>}

      {cargando ? (
        <p style={estilos.gris}>Cargando movimientos...</p>
      ) : visibles.length === 0 ? (
        <p style={estilos.gris}>Todavia no hay movimientos registrados.</p>
      ) : (
        <ul style={estilos.lista}>
          {visibles.map((m) => {
            const esSalidaTransf = m.tipo === 'transferencia_salida'
            const esIngreso = m.tipo === 'ingreso'

            let color = '#c0392b'
            let signo = '-'
            if (esIngreso) {
              color = '#1e8449'
              signo = '+'
            } else if (esSalidaTransf) {
              color = 'inherit'
              signo = ''
            }

            return (
              <li key={m.id} style={estilos.item}>
                <div style={{ minWidth: 0 }}>
                  <div style={estilos.itemNombre}>
                    {esSalidaTransf
                      ? `Transferencia${m.descripcion ? ': ' + m.descripcion : ''}`
                      : m.descripcion || (esIngreso ? 'Ingreso' : 'Gasto')}
                  </div>
                  <div style={estilos.itemDetalle}>
                    {fechaCorta(m.fecha)} ·{' '}
                    {esSalidaTransf
                      ? `${m.cuenta?.nombre || '?'} -> ${nombreDestino(m)}`
                      : m.cuenta?.nombre || 'Sin cuenta'}
                    {m.categoria?.nombre ? ` · ${m.categoria.nombre}` : ''}
                  </div>
                </div>
                <div style={estilos.derecha}>
                  <span style={{ ...estilos.itemMonto, color, opacity: esSalidaTransf ? 0.7 : 1 }}>
                    {signo} {formatoGs(m.monto)}
                  </span>
                  <button
                    style={estilos.botonBorrar}
                    onClick={() => borrarMovimiento(m)}
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
  label: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem', opacity: 0.75 },
  tab: {
    flex: 1,
    padding: '10px 6px',
    borderRadius: 8,
    border: '1px solid #8886',
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  tabActivoGasto: {
    flex: 1,
    padding: '10px 6px',
    borderRadius: 8,
    border: '1px solid #c0392b',
    background: '#c0392b',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  tabActivoIngreso: {
    flex: 1,
    padding: '10px 6px',
    borderRadius: 8,
    border: '1px solid #1e8449',
    background: '#1e8449',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  tabActivoTransf: {
    flex: 1,
    padding: '10px 6px',
    borderRadius: 8,
    border: '1px solid #2d6cdf',
    background: '#2d6cdf',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  input: {
    padding: '10px 12px',
    fontSize: '1rem',
    border: '1px solid #8886',
    borderRadius: 8,
    background: 'transparent',
    color: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
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