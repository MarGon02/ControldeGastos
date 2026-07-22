import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatoGs, hoyISO, fechaCorta } from '../lib/formato'
import { calcularVencimientos, diasHasta } from '../lib/recurrencia'

export default function GastosFijos({ cuentas, categorias, version, onCambio }) {
  const [reglas, setReglas] = useState([])
  const [pagos, setPagos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [verReglas, setVerReglas] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [fechasPago, setFechasPago] = useState({})

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
  }, [version])

  useEffect(() => {
    if (!cuentaId && cuentas.length > 0) setCuentaId(cuentas[0].id)
  }, [cuentas, cuentaId])

  async function cargar() {
    setCargando(true)
    setError(null)

    const [resReglas, resPagos] = await Promise.all([
      supabase.from('gasto_fijo').select('*').eq('activo', true).order('created_at'),
      supabase
        .from('movimiento')
        .select('id, gasto_fijo_id, fecha, numero_cuota')
        .not('gasto_fijo_id', 'is', null),
    ])

    if (resReglas.error) setError(resReglas.error.message)
    else setReglas(resReglas.data || [])

    setPagos(resPagos.data || [])
    setCargando(false)
  }

  // Cuantos pagos tiene cada regla y cual es la cuota mas alta ya pagada.
  function infoPagos(reglaId) {
    const propios = pagos.filter((p) => p.gasto_fijo_id === reglaId)
    const maxCuota = propios.reduce((max, p) => Math.max(max, p.numero_cuota || 0), 0)
    return { cantidad: propios.length, maxCuota }
  }

  function abrirNuevo() {
    setEditandoId(null)
    setDescripcion('')
    setMonto('')
    setCategoriaId('')
    setFrecuencia('mensual')
    setDiaCobro('')
    setFechaInicio(hoyISO())
    setTienePlazo(false)
    setCantidadCuotas('')
    setMostrarForm(true)
  }

  function abrirEdicion(r) {
    setEditandoId(r.id)
    setDescripcion(r.descripcion)
    setMonto(String(r.monto))
    setCuentaId(r.cuenta_id)
    setCategoriaId(r.categoria_id || '')
    setFrecuencia(r.frecuencia)
    setDiaCobro(r.dia_cobro ? String(r.dia_cobro) : '')
    setFechaInicio(r.fecha_inicio)
    setTienePlazo(r.tiene_plazo)
    setCantidadCuotas(r.cantidad_cuotas ? String(r.cantidad_cuotas) : '')
    setMostrarForm(true)
    setVerReglas(true)
  }

  function cerrar() {
    setMostrarForm(false)
    setEditandoId(null)
  }

  async function guardar(e) {
    e.preventDefault()
    setError(null)

    const info = editandoId ? infoPagos(editandoId) : { cantidad: 0, maxCuota: 0 }

    // No se puede recortar el plazo por debajo de lo ya pagado.
    if (tienePlazo && info.maxCuota > 0 && Number(cantidadCuotas) < info.maxCuota) {
      setError(
        `No podes bajar a ${cantidadCuotas} cuotas: ya tenes pagada la cuota ${info.maxCuota}.`
      )
      return
    }

    setGuardando(true)

    const datos = {
      descripcion,
      monto: Number(monto),
      cuenta_id: cuentaId,
      categoria_id: categoriaId || null,
      tiene_plazo: tienePlazo,
      cantidad_cuotas: tienePlazo ? Number(cantidadCuotas) : null,
    }

    // Los campos que definen el calendario solo se mandan si la regla
    // todavia no tiene pagos confirmados (para no correr la numeracion).
    if (info.cantidad === 0) {
      datos.frecuencia = frecuencia
      datos.dia_cobro = frecuencia === 'mensual' && diaCobro ? Number(diaCobro) : null
      datos.fecha_inicio = fechaInicio
    }

    const { error } = editandoId
      ? await supabase.from('gasto_fijo').update(datos).eq('id', editandoId)
      : await supabase.from('gasto_fijo').insert(datos)

    if (error) {
      setError(error.message)
    } else {
      cerrar()
      if (onCambio) onCambio()
    }

    setGuardando(false)
  }

  async function confirmarPago(regla, vencimiento, totalCuotas, fechaPago) {
    setError(null)

    const { error } = await supabase.from('movimiento').insert({
      cuenta_id: regla.cuenta_id,
      categoria_id: regla.categoria_id,
      gasto_fijo_id: regla.id,
      tipo: 'gasto',
      monto: regla.monto,
      fecha: fechaPago || hoyISO(),
      descripcion: regla.descripcion,
      estado: 'pagado',
      numero_cuota: vencimiento.numero,
      total_cuotas: totalCuotas,
    })

    if (error) setError(error.message)
    else if (onCambio) onCambio()
  }

  async function desactivarRegla(id) {
    const { error } = await supabase.from('gasto_fijo').update({ activo: false }).eq('id', id)
    if (error) setError(error.message)
    else if (onCambio) onCambio()
  }

  // ---- Vencimientos pendientes ----
  const pendientes = []
  for (const regla of reglas) {
    const vencimientos = calcularVencimientos(regla)
    const totalCuotas = regla.tiene_plazo ? regla.cantidad_cuotas : null

    for (const v of vencimientos) {
      const yaPagado = pagos.some(
        (p) => p.gasto_fijo_id === regla.id && p.numero_cuota === v.numero
      )
      if (!yaPagado) {
        pendientes.push({ regla, vencimiento: v, totalCuotas, dias: diasHasta(v.fecha) })
      }
    }
  }
  pendientes.sort((a, b) => a.vencimiento.fecha.localeCompare(b.vencimiento.fecha))
  const visibles = pendientes.filter((p) => p.dias <= 30)

  const categoriasGasto = (categorias || []).filter((c) => c.tipo === 'gasto')
  const sinCuentas = cuentas.length === 0

  // Si estamos editando una regla con pagos, bloqueamos el calendario.
  const infoEdicion = editandoId ? infoPagos(editandoId) : { cantidad: 0, maxCuota: 0 }
  const calendarioBloqueado = editandoId && infoEdicion.cantidad > 0

  return (
    <section style={{ marginTop: 40 }}>
      <div style={estilos.cabecera}>
        <h2 style={estilos.titulo}>Gastos fijos y cuotas</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={estilos.botonSecundario} onClick={() => setVerReglas(!verReglas)}>
            {verReglas ? 'Ocultar' : `Ver reglas (${reglas.length})`}
          </button>
          <button style={estilos.botonPrimario} onClick={abrirNuevo} disabled={sinCuentas}>
            + Nuevo
          </button>
        </div>
      </div>

      {sinCuentas && <p style={estilos.gris}>Primero crea una cuenta.</p>}

      {mostrarForm && !sinCuentas && (
        <form onSubmit={guardar} style={estilos.form}>
          {editandoId && (
            <div style={estilos.avisoEdicion}>
              Editando regla
              {calendarioBloqueado && (
                <div style={estilos.avisoBloqueo}>
                  Esta regla ya tiene {infoEdicion.cantidad} pago(s) confirmado(s). La frecuencia,
                  el dia de cobro y la fecha de inicio quedan bloqueados para no descolocar los
                  pagos existentes. Si necesitas cambiarlos, desactiva esta regla y crea una nueva.
                </div>
              )}
            </div>
          )}

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

          <label style={{ ...estilos.label, opacity: calendarioBloqueado ? 0.4 : 0.75 }}>
            Frecuencia
            <select
              style={estilos.input}
              value={frecuencia}
              onChange={(e) => setFrecuencia(e.target.value)}
              disabled={calendarioBloqueado}
            >
              <option value="mensual">Mensual</option>
              <option value="quincenal">Quincenal</option>
              <option value="semanal">Semanal</option>
              <option value="anual">Anual</option>
            </select>
          </label>

          {frecuencia === 'mensual' && (
            <label style={{ ...estilos.label, opacity: calendarioBloqueado ? 0.4 : 0.75 }}>
              Dia de cobro (opcional, 1 a 31)
              <input
                style={estilos.input}
                type="number"
                placeholder="Ej: 5"
                value={diaCobro}
                onChange={(e) => setDiaCobro(e.target.value)}
                min="1"
                max="31"
                disabled={calendarioBloqueado}
              />
            </label>
          )}

          <label style={{ ...estilos.label, opacity: calendarioBloqueado ? 0.4 : 0.75 }}>
            Fecha de inicio
            <input
              style={estilos.input}
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              required
              disabled={calendarioBloqueado}
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
            <label style={estilos.label}>
              Cantidad de cuotas
              {infoEdicion.maxCuota > 0 && ` (minimo ${infoEdicion.maxCuota}, ya pagadas)`}
              <input
                style={estilos.input}
                type="number"
                placeholder="Ej: 12"
                value={cantidadCuotas}
                onChange={(e) => setCantidadCuotas(e.target.value)}
                min={infoEdicion.maxCuota || 1}
                required
              />
            </label>
          )}

          <div style={estilos.fila}>
            <button style={estilos.botonSecundarioAncho} type="button" onClick={cerrar}>
              Cancelar
            </button>
            <button style={estilos.botonPrimarioAncho} type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Guardar'}
            </button>
          </div>
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
              {reglas.map((r) => {
                const info = infoPagos(r.id)
                return (
                  <li
                    key={r.id}
                    style={{
                      ...estilos.item,
                      borderColor: editandoId === r.id ? '#2d6cdf' : '#8884',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={estilos.itemNombre}>{r.descripcion}</div>
                      <div style={estilos.itemDetalle}>
                        {r.frecuencia}
                        {r.dia_cobro ? ` · dia ${r.dia_cobro}` : ''}
                        {r.tiene_plazo ? ` · ${r.cantidad_cuotas} cuotas` : ' · sin plazo'}
                        {info.cantidad > 0 ? ` · ${info.cantidad} pagos` : ''}
                      </div>
                    </div>
                    <div style={estilos.derecha}>
                      <span style={estilos.itemMonto}>{formatoGs(r.monto)}</span>
                      <button
                        style={estilos.botonIcono}
                        onClick={() => abrirEdicion(r)}
                        title="Editar"
                      >
                        ✎
                      </button>
                      <button
                        style={estilos.botonIcono}
                        onClick={() => desactivarRegla(r.id)}
                        title="Desactivar"
                      >
                        ×
                      </button>
                    </div>
                  </li>
                )
              })}
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
            const clave = `${p.regla.id}-${p.vencimiento.numero}`
            const vencido = p.dias < 0
            const urgente = p.dias >= 0 && p.dias <= 3

            let aviso = `en ${p.dias} dias`
            if (p.dias === 0) aviso = 'vence hoy'
            else if (p.dias === 1) aviso = 'manana'
            else if (vencido) aviso = `vencido hace ${Math.abs(p.dias)} dias`

            return (
              <li
                key={clave}
                style={{
                  ...estilos.item,
                  borderColor: vencido ? '#c0392b' : urgente ? '#d68910' : '#8884',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
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
                  <input
                    style={estilos.inputFecha}
                    type="date"
                    title="Fecha en que se pago"
                    value={fechasPago[clave] || hoyISO()}
                    onChange={(e) => setFechasPago({ ...fechasPago, [clave]: e.target.value })}
                  />
                  <button
                    style={estilos.botonConfirmar}
                    onClick={() =>
                      confirmarPago(
                        p.regla,
                        p.vencimiento,
                        p.totalCuotas,
                        fechasPago[clave] || hoyISO()
                      )
                    }
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
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: 12, marginBottom: 16, flexWrap: 'wrap',
  },
  titulo: { margin: 0, fontSize: '1.25rem' },
  subtitulo: { margin: '24px 0 12px', fontSize: '0.85rem', opacity: 0.6, textTransform: 'uppercase' },
  form: {
    display: 'flex', flexDirection: 'column', gap: 10, padding: 16,
    border: '1px solid #8884', borderRadius: 12, marginBottom: 20,
  },
  avisoEdicion: {
    fontSize: '0.8rem', opacity: 0.8, paddingBottom: 8, borderBottom: '1px solid #8884',
  },
  avisoBloqueo: {
    marginTop: 8, padding: '8px 10px', borderRadius: 8,
    border: '1px solid #d68910', color: '#d68910', lineHeight: 1.4,
  },
  label: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem', opacity: 0.75 },
  checkbox: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem' },
  fila: { display: 'flex', gap: 8 },
  input: {
    padding: '10px 12px', fontSize: '1rem', border: '1px solid #8886', borderRadius: 8,
    background: 'transparent', color: 'inherit', width: '100%', boxSizing: 'border-box',
  },
  inputFecha: {
    padding: '5px 8px', fontSize: '0.8rem', border: '1px solid #8886', borderRadius: 6,
    background: 'transparent', color: 'inherit',
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
  botonConfirmar: {
    padding: '7px 12px', fontSize: '0.85rem', border: 'none', borderRadius: 8,
    background: '#1e8449', color: 'white', cursor: 'pointer', whiteSpace: 'nowrap',
  },
  bloqueReglas: { marginBottom: 8 },
  lista: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 },
  item: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
    padding: '12px 14px', border: '1px solid #8884', borderRadius: 12, flexWrap: 'wrap',
  },
  itemNombre: { fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  itemDetalle: { fontSize: '0.8rem', opacity: 0.6, marginTop: 2, textTransform: 'capitalize' },
  derecha: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  itemMonto: { fontWeight: 600 },
  botonIcono: {
    border: '1px solid #8886', background: 'transparent', color: 'inherit', borderRadius: 6,
    width: 28, height: 28, cursor: 'pointer', opacity: 0.6, fontSize: '0.9rem', lineHeight: 1,
  },
  gris: { opacity: 0.6 },
  error: { color: '#c0392b', fontSize: '0.9rem' },
}