import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const TIPOS = ['efectivo', 'banco', 'tarjeta', 'ahorro', 'billetera']

// Formatea numeros como guaranies: 1500000 -> "G 1.500.000"
function formatoGs(valor) {
  return 'G ' + Number(valor || 0).toLocaleString('es-PY')
}

export default function Cuentas() {
  const [cuentas, setCuentas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  // Campos del formulario
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('efectivo')
  const [saldoInicial, setSaldoInicial] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    cargarCuentas()
  }, [])

  async function cargarCuentas() {
    setCargando(true)
    setError(null)

    const { data, error } = await supabase
      .from('cuenta')
      .select('*')
      .eq('archivada', false)
      .order('created_at', { ascending: true })

    if (error) setError(error.message)
    else setCuentas(data)

    setCargando(false)
  }

  async function crearCuenta(e) {
    e.preventDefault()
    setGuardando(true)
    setError(null)

    const { error } = await supabase.from('cuenta').insert({
      nombre,
      tipo,
      saldo_inicial: Number(saldoInicial) || 0,
    })

    if (error) {
      setError(error.message)
    } else {
      // Limpiamos el formulario y recargamos la lista
      setNombre('')
      setTipo('efectivo')
      setSaldoInicial('')
      setMostrarForm(false)
      await cargarCuentas()
    }

    setGuardando(false)
  }

  const total = cuentas.reduce((suma, c) => suma + Number(c.saldo_inicial), 0)

  return (
    <section>
      <div style={estilos.cabecera}>
        <div>
          <h2 style={estilos.titulo}>Mis cuentas</h2>
          {cuentas.length > 0 && (
            <p style={estilos.total}>Total: <strong>{formatoGs(total)}</strong></p>
          )}
        </div>
        <button style={estilos.botonPrimario} onClick={() => setMostrarForm(!mostrarForm)}>
          {mostrarForm ? 'Cancelar' : '+ Nueva'}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={crearCuenta} style={estilos.form}>
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
          <input
            style={estilos.input}
            type="number"
            placeholder="Saldo inicial (Gs)"
            value={saldoInicial}
            onChange={(e) => setSaldoInicial(e.target.value)}
            min="0"
            step="1"
          />
          <button style={estilos.botonPrimario} type="submit" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar cuenta'}
          </button>
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
              <div>
                <div style={estilos.itemNombre}>{c.nombre}</div>
                <div style={estilos.itemTipo}>{c.tipo}</div>
              </div>
              <div style={estilos.itemMonto}>{formatoGs(c.saldo_inicial)}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const estilos = {
  cabecera: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  titulo: { margin: 0, fontSize: '1.25rem' },
  total: { margin: '4px 0 0', opacity: 0.7, fontSize: '0.9rem' },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: 16,
    border: '1px solid #8884',
    borderRadius: 12,
    marginBottom: 20,
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
    padding: '14px 16px',
    border: '1px solid #8884',
    borderRadius: 12,
  },
  itemNombre: { fontWeight: 600 },
  itemTipo: { fontSize: '0.8rem', opacity: 0.6, textTransform: 'capitalize' },
  itemMonto: { fontWeight: 600, whiteSpace: 'nowrap' },
  gris: { opacity: 0.6 },
  error: { color: '#c0392b', fontSize: '0.9rem' },
}