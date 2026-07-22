import { useState } from 'react'
import { supabase } from '../lib/supabase'

// Sugerencias para arrancar rapido. Se pueden borrar o agregar otras.
const SUGERIDAS = [
  { nombre: 'Comida', tipo: 'gasto' },
  { nombre: 'Transporte', tipo: 'gasto' },
  { nombre: 'Servicios', tipo: 'gasto' },
  { nombre: 'Alquiler', tipo: 'gasto' },
  { nombre: 'Salud', tipo: 'gasto' },
  { nombre: 'Entretenimiento', tipo: 'gasto' },
  { nombre: 'Otros gastos', tipo: 'gasto' },
  { nombre: 'Sueldo', tipo: 'ingreso' },
  { nombre: 'Ventas', tipo: 'ingreso' },
  { nombre: 'Otros ingresos', tipo: 'ingreso' },
]

export default function Categorias({ categorias, cargando, onCambio }) {
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState(null)
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('gasto')
  const [guardando, setGuardando] = useState(false)

  async function crearCategoria(e) {
    e.preventDefault()
    setGuardando(true)
    setError(null)

    const { error } = await supabase.from('categoria').insert({ nombre, tipo })

    if (error) setError(error.message)
    else {
      setNombre('')
      if (onCambio) onCambio()
    }

    setGuardando(false)
  }

  async function crearSugeridas() {
    setGuardando(true)
    setError(null)

    const { error } = await supabase.from('categoria').insert(SUGERIDAS)

    if (error) setError(error.message)
    else if (onCambio) onCambio()

    setGuardando(false)
  }

  async function borrarCategoria(id) {
    const { error } = await supabase.from('categoria').delete().eq('id', id)
    if (error) setError(error.message)
    else if (onCambio) onCambio()
  }

  const gastos = categorias.filter((c) => c.tipo === 'gasto')
  const ingresos = categorias.filter((c) => c.tipo === 'ingreso')

  return (
    <section style={{ marginTop: 40 }}>
      <div style={estilos.cabecera}>
        <h2 style={estilos.titulo}>Categorias</h2>
        <button style={estilos.botonSecundario} onClick={() => setAbierto(!abierto)}>
          {abierto ? 'Ocultar' : `Administrar (${categorias.length})`}
        </button>
      </div>

      {abierto && (
        <div>
          {!cargando && categorias.length === 0 && (
            <div style={estilos.aviso}>
              <p style={{ margin: '0 0 10px' }}>No tenes categorias todavia.</p>
              <button style={estilos.botonPrimario} onClick={crearSugeridas} disabled={guardando}>
                {guardando ? 'Creando...' : 'Crear categorias sugeridas'}
              </button>
            </div>
          )}

          <form onSubmit={crearCategoria} style={estilos.form}>
            <input
              style={estilos.input}
              type="text"
              placeholder="Nombre de la categoria"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
            <select style={estilos.input} value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="gasto">Gasto</option>
              <option value="ingreso">Ingreso</option>
            </select>
            <button style={estilos.botonPrimario} type="submit" disabled={guardando}>
              Agregar
            </button>
          </form>

          {error && <p style={estilos.error}>{error}</p>}

          <div style={estilos.columnas}>
            <div style={estilos.columna}>
              <h3 style={estilos.subtitulo}>Gastos</h3>
              {gastos.length === 0 ? (
                <p style={estilos.gris}>Ninguna</p>
              ) : (
                <ul style={estilos.lista}>
                  {gastos.map((c) => (
                    <li key={c.id} style={estilos.chip}>
                      <span>{c.nombre}</span>
                      <button style={estilos.botonBorrar} onClick={() => borrarCategoria(c.id)}>
                        x
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={estilos.columna}>
              <h3 style={estilos.subtitulo}>Ingresos</h3>
              {ingresos.length === 0 ? (
                <p style={estilos.gris}>Ninguna</p>
              ) : (
                <ul style={estilos.lista}>
                  {ingresos.map((c) => (
                    <li key={c.id} style={estilos.chip}>
                      <span>{c.nombre}</span>
                      <button style={estilos.botonBorrar} onClick={() => borrarCategoria(c.id)}>
                        x
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
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
    marginBottom: 12,
  },
  titulo: { margin: 0, fontSize: '1.25rem' },
  subtitulo: { margin: '0 0 8px', fontSize: '0.85rem', opacity: 0.6, textTransform: 'uppercase' },
  aviso: {
    padding: 16,
    border: '1px dashed #8886',
    borderRadius: 12,
    marginBottom: 16,
  },
  form: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  input: {
    padding: '9px 12px',
    fontSize: '0.95rem',
    border: '1px solid #8886',
    borderRadius: 8,
    background: 'transparent',
    color: 'inherit',
    flex: '1 1 140px',
  },
  botonPrimario: {
    padding: '9px 14px',
    fontSize: '0.9rem',
    border: 'none',
    borderRadius: 8,
    background: '#2d6cdf',
    color: 'white',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  botonSecundario: {
    padding: '8px 12px',
    fontSize: '0.85rem',
    border: '1px solid #8886',
    borderRadius: 8,
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  columnas: { display: 'flex', gap: 24, flexWrap: 'wrap' },
  columna: { flex: '1 1 160px' },
  lista: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: 6 },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 8px 5px 12px',
    border: '1px solid #8884',
    borderRadius: 999,
    fontSize: '0.85rem',
  },
  botonBorrar: {
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    opacity: 0.5,
    padding: 0,
    fontSize: '0.9rem',
    lineHeight: 1,
  },
  gris: { opacity: 0.6, fontSize: '0.9rem', margin: 0 },
  error: { color: '#c0392b', fontSize: '0.9rem' },
}