import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatoGs, hoyISO, fechaCorta } from '../lib/formato'
import { calcularVencimientos, diasHasta } from '../lib/recurrencia'

export default function GastosFijos({ cuentas, categorias, onCambio }) {
  const [reglas, setReglas] = useState([])
  const [pagos, setPagos] = useState([]) // movimientos ya confirmados de gastos fijos
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [verReglas, setVerReglas] = useState(false)

  // Formulario
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState('')
  const [cuentaId, setCuentaId] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [frecuencia, setFrecuencia] = useState('mensual')
  const [diaCobro, setDiaCobro] = useState('')
  const [fechaInicio, setFechaInicio] = useState(hoyISO())
  const [tienePlazo, setTienePlazo] = useState(false)
  const [cantidadCuotas, setCantidadCuotas] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    cargar()
  }, [])

  useEffect(() => {
    if (!cuentaId && cuentas.length > 0) setCuentaId(cuentas[0].id)
  }, [cuentas, cuentaId])

  async function cargar() {
    setCargando(true)
    setError(null)

    const [resReglas, resPagos] = await Promise.all([
      supabase.from('gasto_fijo').select('*').eq('activo', true).order('created_at'),
      supabase.from('movimiento').select('id, gasto_fijo_id, fecha').not('gasto_fijo_id', 'is', null),
    ])

    if (resReglas.error) setError(resReglas.error.message)
    else setReglas(resReglas.data || [])

    setPagos(resPagos.data || [])
    setCargando(false)
  }

  async function crearRegla(e) {
    e.preventDefault()
    setGuardando(true)
    setError(null)

    const { error } = await supabase.from('gasto_fijo').insert({
      descripcion,
      monto: Number(monto),
      cuenta_id: cuentaId,
      categoria_id: categoriaId || null,
      frecuencia,
      dia_cobro: frecuencia === 'mensual' && diaCobro ? Number(diaCobro) : null,
      fecha_inicio: fechaInicio,
      tiene_plazo: tienePlazo,
      cantidad_cuotas: tienePlazo ? Number(cantidadCuotas) : null,
    })

    if (error) {
      setError(error.message)
    } else {
      setDescripcion('')
      setMonto('')
      setDiaCobro('')
      setCantidadCuotas('')
      setTienePlazo(false)
      setFechaInicio(hoyISO())
      setMostrarForm(false)
      await cargar()
    }

    setGuardando(false)
  }

  async function confirmarPago(regla, vencimiento, totalCuotas) {
    setError(null)

    // Se crea el movimiento con la FECHA PROGRAMADA, no la de hoy.
    const { error } = await supabase.from('movimiento').insert({
      cuenta_id: regla.cuenta_id,
      categoria_id: regla.categoria_id,
      gasto_fijo_id: regla.id,
      tipo: 'gasto',
      monto: regla.monto,
      fecha: vencimiento.fecha,
      descripcion: regla.descripcion,
      estado: 'pagado',
      numero_cuota: regla.tiene_plazo ? vencimiento.numero : null,
      total_cuotas: regla.tiene_plazo ? totalCuotas : null,
    })

    if (error) {
      setError(error.message)
    } else {
      await cargar()
      if (onCambio) onCambio()
    }
  }

  async function desactivarRegla(id) {
    const { error } = await supabase.from('gasto_fijo').update({ activo: false }).eq('id', id)
    if (error) setError(error.message)
    else await cargar()
  }

  // ---- Calculo de los vencimientos pendientes ----
  const pendientes = []

  for (const regla of reglas) {
    const vencimientos = calcularVencimientos(regla)
    const totalCuotas = regla.tiene_plazo ? regla.cantidad_cuotas : null

    for (const v of vencimientos) {
      const yaPagado = pagos.some((p) => p.gasto_fijo_id === regla.id && p.fecha === v.fecha)
      if (!yaPagado) {
        pendientes.push({ regla, vencimiento: v, totalCuotas, dias: diasHasta(v.fecha) })
      }
    }
  }

  // Ordenamos por fecha y mostramos solo lo que vence pronto o ya vencio.
  pendientes.sort((a, b) => a.vencimiento.fecha.localeCompare(b.vencimiento.fecha))
  const visibles = pendientes.filter((p) => p.dias <= 30)

  const categoriasGasto = (categorias || []).filter((c) => c.tipo === 'gasto')
  const sinCuentas = cuentas.length === 0

  return (
    <section style={{ marginTop: 40 }}>
      <div style={estilos.cabecera}>
        <h2 style={estilos.titulo}>Gastos fijos y cuotas</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={estilos.botonSecundario} onClick={() => setVerReglas(!verReglas)}>
            {verReglas ? 'Ocultar' : `Ver reglas (${reglas.length})`}
          </button>
          <button
            style={estilos.botonPrimario}
            onClick={() => setMostrarForm(!mostrarForm)}
            disabled={sinCuentas}
          >
            {mostrarForm ? 'Cancelar' : '+ Nuevo'}
          </button>
        </div>
      </div>

      {sinCuentas && <p style={estilos.gris}>Primero crea una cuenta.</p>}

      {mostrarForm && !sinCuentas && (
        <form onSubmit={crearRegla} style={estilos.form}>
          <input
            style={estilos.input}
            type="text"
            placeholder="Descripcion (ej: Netflix, Cuota heladera)"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            required
          />

          <input
            style={estilos.input}
            type="number"
            placeholder="Monto (Gs)"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            min="1"
            required
          />

          <label style={estilos.label}>
            Cuenta
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

          <label style={estilos.label}>
            Categoria
            <select
              style={estilos.input}
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
            >
              <option value="">Sin categoria</option>
              {categoriasGasto.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </label>

          <label style={estilos.label}>
            Frecuencia
            <select
              style={estilos.input}
              value={frecuencia}
              onChange={(e) => setFrecuencia(e.target.value)}
            >
              <option value="mensual">Mensual</option>
              <option value="quincenal">Quincenal</option>
              <option value="semanal">Semanal</option>
              <option value="anual">Anual</option>
            </select>
          </label>

          {frecuencia === 'mensual' && (
            <label style={estilos.label}>
              Dia de cobro (opcional, 1 a 31)
              <input
                style={estilos.input}
                type="number"
                placeholder="Ej: 5"
                value={diaCobro}
                onChange={(e) => setDiaCobro(e.target.value)}
                min="1"
                max="31"
              />
            </label>
          )}

          <label style={estilos.label}>
            Fecha de inicio
            <input
              style={estilos.input}
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              required
            />
          </label>

          <label style={estilos.checkbox}>
            <input
              type="checkbox"
              checked={tienePlazo}
              onChange={(e) => setTienePlazo(e.target.checked)}
            />
            Tiene plazo definido (cuotas)
          </label>

          {tienePlazo && (
            <input
              style={estilos.input}
              type="number"
              placeholder="Cantidad de cuotas (ej: 12)"
              value={cantidadCuotas}
              onChange={(e) => setCantidadCuotas(e.target.value)}
              min="1"
              required
            />
          )}

          <button style={estilos.botonPrimario} type="submit" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </form>
      )}

      {error && <p style={estilos.error}>{error}</p>}

      {/* --- Reglas activas --- */}
      {verReglas && (
        <div style={estilos.bloqueReglas}>
          {reglas.length === 0 ? (
            <p style={estilos.gris}>No tenes gastos fijos definidos.</p>
          ) : (
            <ul style={estilos.lista}>
              {reglas.map((r) => (
                <li key={r.id} style={estilos.item}>
                  <div style={{ minWidth: 0 }}>
                    <div style={estilos.itemNombre}>{r.descripcion}</div>
                    <div style={estilos.itemDetalle}>
                      {r.frecuencia}
                      {r.dia_cobro ? ` · dia ${r.dia_cobro}` : ''}
                      {r.tiene_plazo ? ` · ${r.cantidad_cuotas} cuotas` : ' · sin plazo'}
                    </div>
                  </div>
                  <div style={estilos.derecha}>
                    <span style={estilos.itemMonto}>{formatoGs(r.monto)}</span>
                    <button
                      style={estilos.botonBorrar}
                      onClick={() => desactivarRegla(r.id)}
                      title="Desactivar"
                    >
                      x
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* --- Proximos vencimientos --- */}
      <h3 style={estilos.subtitulo}>Proximos vencimientos</h3>

      {cargando ? (
        <p style={estilos.gris}>Cargando...</p>
      ) : visibles.length === 0 ? (
        <p style={estilos.gris}>No hay vencimientos pendientes en los proximos 30 dias.</p>
      ) : (
        <ul style={estilos.lista}>
          {visibles.map((p) => {
            const vencido = p.dias < 0
            const urgente = p.dias >= 0 && p.dias <= 3

            let aviso = `en ${p.dias} dias`
            if (p.dias === 0) aviso = 'vence hoy'
            else if (p.dias === 1) aviso = 'manana'
            else if (vencido) aviso = `vencido hace ${Math.abs(p.dias)} dias`

            return (
              <li
                key={`${p.regla.id}-${p.vencimiento.fecha}`}
                style={{
                  ...estilos.item,
                  borderColor: vencido ? '#c0392b' : urgente ? '#d68910' : '#8884',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={estilos.itemNombre}>
                    {p.regla.descripcion}
                    {p.totalCuotas ? ` (${p.vencimiento.numero}/${p.totalCuotas})` : ''}
                  </div>
                  <div
                    style={{
                      ...estilos.itemDetalle,
                      color: vencido ? '#c0392b' : urgente ? '#d68910' : 'inherit',
                      opacity: vencido || urgente ? 1 : 0.6,
                    }}
                  >
                    {fechaCorta(p.vencimiento.fecha)} · {aviso}
                  </div>
                </div>
                <div style={estilos.derecha}>
                  <span style={estilos.itemMonto}>{formatoGs(p.regla.monto)}</span>
                  <button
                    style={estilos.botonConfirmar}
                    onClick={() => confirmarPago(p.regla, p.vencimiento, p.totalCuotas)}
                  >
                    Pagar
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
    flexWrap: 'wrap',
  },
  titulo: { margin: 0, fontSize: '1.25rem' },
  subtitulo: { margin: '24px 0 12px', fontSize: '0.85rem', opacity: 0.6, textTransform: 'uppercase' },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: 16,
    border: '1px solid #8884',
    borderRadius: 12,
    marginBottom: 20,
  },
  label: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem', opacity: 0.75 },
  checkbox: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem' },
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
  botonSecundario: {
    padding: '9px 12px',
    fontSize: '0.85rem',
    border: '1px solid #8886',
    borderRadius: 8,
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  botonConfirmar: {
    padding: '7px 12px',
    fontSize: '0.85rem',
    border: 'none',
    borderRadius: 8,
    background: '#1e8449',
    color: 'white',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  bloqueReglas: { marginBottom: 8 },
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
  itemDetalle: { fontSize: '0.8rem', opacity: 0.6, marginTop: 2, textTransform: 'capitalize' },
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