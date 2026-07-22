import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [modo, setModo] = useState('login') // 'login' o 'registro'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  async function manejarSubmit(e) {
    e.preventDefault()
    setCargando(true)
    setMensaje(null)

    if (modo === 'registro') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setMensaje({ tipo: 'error', texto: error.message })
      } else {
        setMensaje({
          tipo: 'ok',
          texto: 'Cuenta creada. Si la confirmacion por email esta activada, revisa tu correo.',
        })
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMensaje({ tipo: 'error', texto: error.message })
      // Si el login es exitoso, App detecta la sesion y muestra la app.
    }

    setCargando(false)
  }

  return (
    <div style={estilos.contenedor}>
      <div style={estilos.tarjeta}>
        <h1 style={estilos.titulo}>Control de Gastos</h1>
        <p style={estilos.subtitulo}>
          {modo === 'login' ? 'Inicia sesion' : 'Crea tu cuenta'}
        </p>

        <form onSubmit={manejarSubmit} style={estilos.form}>
          <input
            style={estilos.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            style={estilos.input}
            type="password"
            placeholder="Contrasena"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <button style={estilos.boton} type="submit" disabled={cargando}>
            {cargando ? 'Procesando...' : modo === 'login' ? 'Entrar' : 'Registrarme'}
          </button>
        </form>

        {mensaje && (
          <p style={{ ...estilos.mensaje, color: mensaje.tipo === 'error' ? '#c0392b' : '#1e8449' }}>
            {mensaje.texto}
          </p>
        )}

        <button
          style={estilos.enlace}
          onClick={() => {
            setModo(modo === 'login' ? 'registro' : 'login')
            setMensaje(null)
          }}
        >
          {modo === 'login'
            ? 'No tenes cuenta? Registrate'
            : 'Ya tenes cuenta? Inicia sesion'}
        </button>
      </div>
    </div>
  )
}

const estilos = {
  contenedor: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'system-ui, sans-serif',
    padding: '1rem',
  },
  tarjeta: {
    width: '100%',
    maxWidth: 360,
    border: '1px solid #ddd',
    borderRadius: 12,
    padding: '2rem',
  },
  titulo: { margin: 0, fontSize: '1.5rem' },
  subtitulo: { marginTop: 4, marginBottom: 24, color: '#666' },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: {
    padding: '10px 12px',
    fontSize: '1rem',
    border: '1px solid #ccc',
    borderRadius: 8,
  },
  boton: {
    padding: '10px 12px',
    fontSize: '1rem',
    border: 'none',
    borderRadius: 8,
    background: '#2d6cdf',
    color: 'white',
    cursor: 'pointer',
  },
  mensaje: { fontSize: '0.9rem', marginTop: 12 },
  enlace: {
    marginTop: 16,
    background: 'none',
    border: 'none',
    color: '#2d6cdf',
    cursor: 'pointer',
    fontSize: '0.9rem',
    padding: 0,
  },
}