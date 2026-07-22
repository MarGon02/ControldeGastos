import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatoGs, hoyISO, fechaCorta } from '../lib/formato'

const PAGINA = 50

export default function Movimientos({ cuentas, categorias, version, onCambio }) {
  const [movimientos, setMovimientos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [limite, setLimite] = useState(PAGINA)
  const [hayMas, setHayMas] = useState(false)

  // Filtros
  const [verFiltros, setVerFiltros] = useState(false)
  const [fTipo, setFTipo] = useState('')
  const [fCuenta, setFCuenta] = useState('')
  const [fCategoria, setFCategoria] = useState('')
  const [fDesde, setFDesde] = useState('')
  const [fHasta, setFHasta] = useState('')
  const [fTexto, setFTexto] = useState('')

  // Formulario
  const [tipo, setTipo] = useState('gasto')
  const [cuentaId, setCuentaId] = useState('')
  const [cuentaDestinoId, setCuentaDestinoId] = useState('')
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(hoyISO())
  const [descripcion, setDescripcion] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    cargarMovimientos()
  }, [version, limite, fTipo, fCuenta, fCategoria, fDesde, fHasta, fTexto])

  useEffect(() => {
    if (!cuentaId && cuentas.length > 0) setCuentaId(cuentas[0].id)
  }, [cuentas, cuentaId])

  async function cargarMovimientos() {
    setCargando(true)
    setError(null)

    let consulta = supabase
      .from('movimiento')
      .select('*, cuenta(nombre), categoria(nombre)')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limite + 1) // uno de mas para saber si hay siguiente pagina

    if (fTipo === 'transferencia') {
      consulta = consulta.in('tipo', ['transferencia_salida', 'transferencia_entrada'])
    } else if (fTipo) {
      consulta = consulta.eq('tipo', fTipo)
    }
    if (fCuenta) consulta = consulta.eq('cuenta_id', fCuenta)
    if (fCategoria) consulta = consulta.eq('categoria_id', fCategoria)
    if (fDesde) consulta = consulta.gte('fecha', fDesde)
    if (fHasta) consulta = consulta.lte('fecha', fHasta)
    if (fTexto) consulta = consulta.ilike('descripcion', `%${fTexto}%`)

    const { data, error } = await consulta

    if (error) {
      setError(error.message)
    } else {
      setHayMas(data.length > limite)
      setMovimientos(data.slice(0, limite))
    }

    setCargando(false)
  }

  function limpiarFiltros() {
    setFTipo('')
    setFCuenta('')
    setFCategoria('')
    setFDesde('')
    setFHasta('')
    setFTexto('')
    setLimite(PAGINA)
  }

  const hayFiltros = fTipo || fCuenta || fCategoria || fDesde || fHasta || fTexto

  // ---- Formulario ----
  function abrirNuevo() {
    setEditandoId(null)
    setTipo('gasto')
    setMonto('')
    setDescripcion('')
    setCategoriaId('')
    setFecha(hoyISO())
    setCuentaDestinoId('')
    setMostrarForm(true)
  }

  function abrirEdicion(m) {
    setEditandoId(m.id)
    setTipo(m.tipo === 'transferencia_salida' ? 'transferencia' : m.tipo)
    setCuentaId(m.cuenta_id)
    setMonto(String(m.monto))
    setFecha(m.fecha)
    setDescripcion(m.descripcion || '')
    setCategoriaId(m.categoria_id || '')
    setMostrarForm(true)
  }

  function cerrarForm() {
    setMostrarForm(false)
    setEditandoId(null)
  }

  async function guardar(e) {
    e.preventDefault()
    setError(null)

    // ---- EDICION ----
    if (editandoId) {
      const original = movimientos.find((m) => m.id === editandoId)
      setGuardando(true)

      if (original?.grupo_transf) {
        // Transferencia: actualizamos las dos filas de una sola vez.
        const { error } = await supabase
          .from('movimiento')
          .update({
            monto: Number(monto),
            fecha,
            descripcion: descripcion || null,
          })
          .eq('grupo_transf', original.grupo_transf)

        if (error) setError(error.message)
        else finalizar()
      } else {
        const { error } = await supabase
          .from('movimiento')
          .update({
            cuenta_id: cuentaId,
            tipo,
            monto: Number(monto),
            fecha,
            descripcion: descripcion || null,
            categoria_id: categoriaId || null,
          })
          .eq('id', editandoId)

        if (error) setError(error.message)
        else finalizar()
      }

      setGuardando(false)
      return
    }

    // ---- ALTA ----
    if (tipo === 'transferencia') {
      if (cuentaId === cuentaDestinoId) {
        setError('La cuenta de origen y destino no pueden ser la misma.')
        return
      }
      setGuardando(true)
      const grupo = crypto.randomUUID()

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
      else finalizar()

      setGuardando(false)
      return
    }

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
    else finalizar()

    setGuardando(false)
  }

  function finalizar() {
    setMonto('')
    setDescripcion('')
    setCategoriaId('')
    setFecha(hoyISO())
    setMostrarForm(false)
    setEditandoId(null)
    if (onCambio) onCambio()
  }

  async function borrarMovimiento(m) {
    const consulta = m.grupo_transf
      ? supabase.from('movimiento').delete().eq('grupo_transf', m.grupo_transf)
      : supabase.from('movimiento').delete().eq('id', m.id)

    const { error } = await consulta

    if (error) setError(error.message)
    else if (onCambio) onCambio()
  }

  const categoriasFiltradas = (categorias || []).filter((c) => c.tipo === tipo)
  const sinCuentas = cuentas.length === 0
  const pocasCuentas = cuentas.length < 2
  const esTransf = tipo === 'transferencia'
  const editandoTransf = editandoId && esTransf

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
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={hayFiltros ? estilos.botonFiltroActivo : estilos.botonSecundario}
            onClick={() => setVerFiltros(!verFiltros)}
          >
            Filtros{hayFiltros ? ' •' : ''}
          </button>
          <button style={estilos.botonPrimario} onClick={abrirNuevo} disabled={sinCuentas}>
            + Nuevo
          </button>
        </div>
      </div>

      {sinCuentas && (
        <p style={estilos.gris}>Primero crea una cuenta para poder registrar movimientos.</p>
      )}

      {/* ---- FILTROS ---- */}
      {verFiltros && (
        <div style={estilos.panelFiltros}>
          <div style={estilos.gridFiltros}>
            <label style={estilos.label}>
              Tipo
              <select style={estilos.input} value={fTipo} onChange={(e) => setFTipo(e.target.value)}>
                <option value="">Todos</option>
                <option value="gasto">Gastos</option>
                <option value="ingreso">Ingresos</option>
                <option value="transferencia">Transferencias</option>
              </select>
            </label>

            <label style={estilos.label}>
              Cuenta
              <select style={estilos.input} value={fCuenta} onChange={(e) => setFCuenta(e.target.value)}>
                <option value="">Todas</option>
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </label>

            <label style={estilos.label}>
              Categoria
              <select
                style={estilos.input}
                value={fCategoria}
                onChange={(e) => setFCategoria(e.target.value)}
              >
                <option value="">Todas</option>
                {(categorias || []).map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </label>

            <label style={estilos.label}>
              Desde
              <input
                style={estilos.input}
                type="date"
                value={fDesde}
                onChange={(e) => setFDesde(e.target.value)}
              />
            </label>

            <label style={estilos.label}>
              Hasta
              <input
                style={estilos.input}
                type="date"
                value={fHasta}
                onChange={(e) => setFHasta(e.target.value)}
              />
            </label>

            <label style={estilos.label}>
              Buscar
              <input
                style={estilos.input}
                type="text"
                placeholder="En la descripcion"
                value={fTexto}
                onChange={(e) => setFTexto(e.target.value)}
              />
            </label>
          </div>

          {hayFiltros && (
            <button style={estilos.botonSecundario} onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* ---- FORMULARIO ---- */}
      {mostrarForm && !sinCuentas && (
        <form onSubmit={guardar} style={estilos.form}>
          {editandoId && (
            <div style={estilos.avisoEdicion}>
              Editando movimiento
              {editandoTransf ? ' (transferencia: no se pueden cambiar las cuentas)' : ''}
            </div>
          )}

          {!editandoId && (
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
          )}

          {!editandoTransf && (
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
          )}

          {esTransf && !editandoId && (
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

          <div style={estilos.fila}>
            <button style={estilos.botonSecundarioAncho} type="button" onClick={cerrarForm}>
              Cancelar
            </button>
            <button style={estilos.botonPrimarioAncho} type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      {error && <p style={estilos.error}>{error}</p>}

      {/* ---- LISTA ---- */}
      {cargando ? (
        <p style={estilos.gris}>Cargando movimientos...</p>
      ) : visibles.length === 0 ? (
        <p style={estilos.gris}>
          {hayFiltros
            ? 'No hay movimientos que coincidan con los filtros.'
            : 'Todavia no hay movimientos registrados.'}
        </p>
      ) : (
        <>
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
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={estilos.itemNombre}>
                      {esSalidaTransf
                        ? `Transferencia${m.descripcion ? ': ' + m.descripcion : ''}`
                        : (m.descripcion || (esIngreso ? 'Ingreso' : 'Gasto')) +
                          (m.total_cuotas ? ` (${m.numero_cuota}/${m.total_cuotas})` : '')}
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
                      style={estilos.botonIcono}
                      onClick={() => abrirEdicion(m)}
                      title="Editar"
                    >
                      ✎
                    </button>
                    <button
                      style={estilos.botonIcono}
                      onClick={() => borrarMovimiento(m)}
                      title="Borrar"
                    >
                      ×
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>

          {hayMas && (
            <button
              style={{ ...estilos.botonSecundario, marginTop: 12, width: '100%' }}
              onClick={() => setLimite(limite + PAGINA)}
            >
              Ver mas
            </button>
          )}
        </>
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
    flexWrap: 'wrap',
  },
  titulo: { margin: 0, fontSize: '1.25rem' },
  panelFiltros: {
    padding: 16,
    border: '1px solid #8884',
    borderRadius: 12,
    marginBottom: 16,
  },
  gridFiltros: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 10,
    marginBottom: 10,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: 16,
    border: '1px solid #8884',
    borderRadius: 12,
    marginBottom: 20,
  },
  avisoEdicion: {
    fontSize: '0.8rem',
    opacity: 0.7,
    paddingBottom: 6,
    borderBottom: '1px solid #8884',
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
    flex: 1, padding: '10px 6px', borderRadius: 8, border: '1px solid #c0392b',
    background: '#c0392b', color: 'white', cursor: 'pointer', fontSize: '0.85rem',
  },
  tabActivoIngreso: {
    flex: 1, padding: '10px 6px', borderRadius: 8, border: '1px solid #1e8449',
    background: '#1e8449', color: 'white', cursor: 'pointer', fontSize: '0.85rem',
  },
  tabActivoTransf: {
    flex: 1, padding: '10px 6px', borderRadius: 8, border: '1px solid #2d6cdf',
    background: '#2d6cdf', color: 'white', cursor: 'pointer', fontSize: '0.85rem',
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
    padding: '10px 14px', fontSize: '0.95rem', border: 'none', borderRadius: 8,
    background: '#2d6cdf', color: 'white', cursor: 'pointer', whiteSpace: 'nowrap',
  },
  botonPrimarioAncho: {
    flex: 2, padding: '10px 14px', fontSize: '0.95rem', border: 'none', borderRadius: 8,
    background: '#2d6cdf', color: 'white', cursor: 'pointer',
  },
  botonSecundario: {
    padding: '9px 12px', fontSize: '0.85rem', border: '1px solid #8886', borderRadius: 8,
    background: 'transparent', color: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap',
  },
  botonSecundarioAncho: {
    flex: 1, padding: '10px 14px', fontSize: '0.95rem', border: '1px solid #8886',
    borderRadius: 8, background: 'transparent', color: 'inherit', cursor: 'pointer',
  },
  botonFiltroActivo: {
    padding: '9px 12px', fontSize: '0.85rem', border: '1px solid #2d6cdf', borderRadius: 8,
    background: 'transparent', color: '#2d6cdf', cursor: 'pointer', whiteSpace: 'nowrap',
  },
  lista: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 },
  item: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
    padding: '12px 14px', border: '1px solid #8884', borderRadius: 12, flexWrap: 'wrap',
  },
  itemNombre: { fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  itemDetalle: { fontSize: '0.8rem', opacity: 0.6, marginTop: 2 },
  derecha: { display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' },
  itemMonto: { fontWeight: 600 },
  botonIcono: {
    border: '1px solid #8886', background: 'transparent', color: 'inherit', borderRadius: 6,
    width: 28, height: 28, cursor: 'pointer', opacity: 0.6, fontSize: '0.9rem', lineHeight: 1,
  },
  gris: { opacity: 0.6 },
  error: { color: '#c0392b', fontSize: '0.9rem' },
}