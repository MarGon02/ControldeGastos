import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatoGs } from '../lib/formato'

const TIPOS = ['efectivo', 'banco', 'tarjeta', 'ahorro', 'billetera']

export default function Cuentas({ cuentas, cargando, version, onCambio }) {
  const [error, setError] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [verArchivadas, setVerArchivadas] = useState(false)
  const [archivadas, setArchivadas] = useState([])

  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('efectivo')
  const [saldoInicial, setSaldoInicial] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (verArchivadas) cargarArchivadas()
  }, [verArchivadas, version])

  async function cargarArchivadas() {
    const { data } = await supabase
      .from('cuenta')
      .select('*')
      .eq('archivada', true)
      .order('nombre')
    setArchivadas(data || [])
  }

  function abrirNueva() {
    setEditandoId(null)
    setNombre('')
    setTipo('efectivo')
    setSaldoInicial('')
    setMostrarForm(true)
  }

  function abrirEdicion(c) {
    setEditandoId(c.id)
    setNombre(c.nombre)
    setTipo(c.tipo)
    setSaldoInicial(String(c.saldo_inicial))
    setMostrarForm(true)
  }

  function cerrar() {
    setMostrarForm(false)
    setEditandoId(null)
  }

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    setError(null)

    const datos = {
      nombre,
      tipo,
      saldo_inicial: Number(saldoInicial) || 0,
    }

    const { error } = editandoId
      ? await supabase.from('cuenta').update(datos).eq('id', editandoId)
      : await supabase.from('cuenta').insert(datos)

    if (error) {
      setError(error.message)
    } else {
      cerrar()
      if (onCambio) onCambio()
    }

    setGuardando(false)
  }

  async function cambiarArchivado(id, archivar) {
    const { error } = await supabase.from('cuenta').update({ archivada: archivar }).eq('id', id)
    if (error) setError(error.message)
    else {
      if (onCambio) onCambio()
      if (verArchivadas) cargarArchivadas()
    }
  }

  const total = cuentas.reduce((suma, c) => suma + c.saldo, 0)

  return (
    <section>
      <div style={estilos.cabecera}>
        <div>
          <h2 style={estilos.titulo}>Mis cuentas</h2>
          {cuentas.length > 0 && (
            <p style={estilos.total}>Total: <strong>{formatoGs(total)}</strong></p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={estilos.botonSecundario} onClick={() => setVerArchivadas(!verArchivadas)}>
            {verArchivadas ? 'Ocultar archivadas' : 'Archivadas'}
          </button>
          <button style={estilos.botonPrimario} onClick={abrirNueva}>
            + Nueva
          </button>
        </div>
      </div>

      {mostrarForm && (
        <form onSubmit={guardar} style={estilos.form}>
          {editandoId && <div style={estilos.avisoEdicion}>Editando cuenta</div>}

          <input
            style={estilos.input}
            type="text"
            placeholder="Nombre (ej: Banco Itau, Efectivo)"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
          <select style={estilos.input} value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <label style={estilos.label}>
            Saldo inicial (Gs)
            <input
              style={estilos.input}
              type="number"
              placeholder="0"
              value={saldoInicial}
              onChange={(e) => setSaldoInicial(e.target.value)}
              min="0"
              step="1"
            />
          </label>

          <div style={estilos.fila}>
            <button style={estilos.botonSecundarioAncho} type="button" onClick={cerrar}>
              Cancelar
            </button>
            <button style={estilos.botonPrimarioAncho} type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Guardar cuenta'}
            </button>
          </div>
        </form>
      )}

      {error && <p style={estilos.error}>{error}</p>}

      {cargando ? (
        <p style={estilos.gris}>Cargando cuentas...</p>
      ) : cuentas.length === 0 ? (
        <p style={estilos.gris}>Todavia no tenes cuentas. Crea la primera con el boton "+ Nueva".</p>
      ) : (
        <ul style={estilos.lista}>
          {cuentas.map((c) => (
            <li key={c.id} style={estilos.item}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={estilos.itemNombre}>{c.nombre}</div>
                <div style={estilos.itemTipo}>{c.tipo}</div>
              </div>
              <div style={estilos.derecha}>
                <span className="monto" style={estilos.itemMonto}>{formatoGs(c.saldo)}</span>
                <button style={estilos.botonIcono} onClick={() => abrirEdicion(c)} title="Editar">
                  ✎
                </button>
                <button
                  style={estilos.botonIcono}
                  onClick={() => cambiarArchivado(c.id, true)}
                  title="Archivar"
                >
                  ⌄
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {verArchivadas && (
        <div style={{ marginTop: 20 }}>
          <h3 style={estilos.subtitulo}>Cuentas archivadas</h3>
          {archivadas.length === 0 ? (
            <p style={estilos.gris}>No hay cuentas archivadas.</p>
          ) : (
            <ul style={estilos.lista}>
              {archivadas.map((c) => (
                <li key={c.id} style={{ ...estilos.item, opacity: 0.65 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={estilos.itemNombre}>{c.nombre}</div>
                    <div style={estilos.itemTipo}>{c.tipo}</div>
                  </div>
                  <button
                    style={estilos.botonSecundario}
                    onClick={() => cambiarArchivado(c.id, false)}
                  >
                    Restaurar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

const estilos = {
  cabecera: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: 12, marginBottom: 16, flexWrap: 'wrap',
  },
  titulo: { margin: 0, fontSize: '1.25rem' },
  subtitulo: { margin: '0 0 10px', fontSize: '0.8rem', opacity: 0.6, textTransform: 'uppercase' },
  total: { margin: '4px 0 0', opacity: 0.7, fontSize: '0.9rem' },
  form: {
    display: 'flex', flexDirection: 'column', gap: 10, padding: 16,
    border: '1px solid var(--border)', borderRadius: 10, marginBottom: 20,
  },
  avisoEdicion: {
    fontSize: '0.8rem', opacity: 0.7, paddingBottom: 6, borderBottom: '1px solid var(--border)',
  },
  fila: { display: 'flex', gap: 8 },
  label: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem', opacity: 0.75 },
  input: {
    padding: '10px 12px', fontSize: '1rem', border: '1px solid var(--border-strong)', borderRadius: 8,
    background: 'var(--surface)', color: 'var(--text)', width: '100%', boxSizing: 'border-box',
  },
  botonPrimario: {
    padding: '10px 14px', fontSize: '0.95rem', border: 'none', borderRadius: 8,
    background: 'var(--primary)', color: 'var(--on-primary)', cursor: 'pointer', whiteSpace: 'nowrap',
  },
  botonPrimarioAncho: {
    flex: 2, padding: '10px 14px', fontSize: '0.95rem', border: 'none', borderRadius: 8,
    background: 'var(--primary)', color: 'var(--on-primary)', cursor: 'pointer',
  },
  botonSecundario: {
    padding: '9px 12px', fontSize: '0.85rem', border: '1px solid var(--border-strong)', borderRadius: 8,
    background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', whiteSpace: 'nowrap',
  },
  botonSecundarioAncho: {
    flex: 1, padding: '10px 14px', fontSize: '0.95rem', border: '1px solid var(--border-strong)',
    borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer',
  },
  lista: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 },
  item: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
    padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 10, flexWrap: 'wrap',
  },
  itemNombre: { fontWeight: 600 },
  itemTipo: { fontSize: '0.8rem', opacity: 0.6, textTransform: 'capitalize' },
  derecha: { display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' },
  itemMonto: { fontWeight: 600 },
  botonIcono: {
    border: '1px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text)', borderRadius: 6,
    width: 28, height: 28, cursor: 'pointer', opacity: 0.6, fontSize: '0.9rem', lineHeight: 1,
  },
  gris: { opacity: 0.6 },
  error: { color: 'var(--gasto)', fontSize: '0.9rem' },
}