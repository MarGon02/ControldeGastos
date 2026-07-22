import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [modo, setModo] = useState('login') // 'login' o 'registro'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  async function manejarSubmit(e) {
    e.preventDefault()
    setCargando(true)
    setMensaje(null)

    if (modo === 'registro') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Estos datos viajan con el registro y el trigger de la base
          // los usa para crear la fila en la tabla "perfil".
          data: {
            nombre,
            apellido,
            fecha_nacimiento: fechaNacimiento || null,
          },
        },
      })
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
    }

    setCargando(false)
  }

  const esRegistro = modo === 'registro'

  return (
    <div style={estilos.contenedor}>
      <div style={estilos.tarjeta}>
        <h1 style={estilos.titulo}>Control de Gastos</h1>
        <p style={estilos.subtitulo}>{esRegistro ? 'Crea tu cuenta' : 'Inicia sesion'}</p>

        <form onSubmit={manejarSubmit} style={estilos.form}>
          {esRegistro && (
            <>
              <input
                style={estilos.input}
                type="text"
                placeholder="Nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
              <input
                style={estilos.input}
                type="text"
                placeholder="Apellido"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                required
              />
              <label style={estilos.label}>
                Fecha de nacimiento
                <input
                  style={estilos.input}
                  type="date"
                  value={fechaNacimiento}
                  onChange={(e) => setFechaNacimiento(e.target.value)}
                  required
                />
              </label>
            </>
          )}

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
            {cargando ? 'Procesando...' : esRegistro ? 'Registrarme' : 'Entrar'}
          </button>
        </form>

        {mensaje && (
          <p style={{ ...estilos.mensaje, color: mensaje.tipo === 'error' ? 'var(--gasto)' : 'var(--ingreso)' }}>
            {mensaje.texto}
          </p>
        )}

        <button
          style={estilos.enlace}
          onClick={() => {
            setModo(esRegistro ? 'login' : 'registro')
            setMensaje(null)
          }}
        >
          {esRegistro ? 'Ya tenes cuenta? Inicia sesion' : 'No tenes cuenta? Registrate'}
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
    padding: '1rem',
    background: 'var(--bg)',
  },
  tarjeta: {
    width: '100%',
    maxWidth: 380,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radio)',
    padding: '32px 28px',
  },
  titulo: { margin: 0, fontSize: '1.3rem', fontWeight: 600 },
  subtitulo: { marginTop: 6, marginBottom: 26, color: 'var(--text-muted)', fontSize: '0.9rem' },
  form: { display: 'flex', flexDirection: 'column', gap: 11 },
  label: {
    display: 'flex', flexDirection: 'column', gap: 5,
    fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-muted)',
  },
  input: {
    padding: '11px 12px',
    fontSize: '0.95rem',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radio-sm)',
    background: 'var(--surface)',
    color: 'var(--text)',
    width: '100%',
  },
  boton: {
    marginTop: 4,
    padding: '11px 14px',
    fontSize: '0.92rem',
    fontWeight: 500,
    border: 'none',
    borderRadius: 'var(--radio-sm)',
    background: 'var(--primary)',
    color: 'var(--on-primary)',
    cursor: 'pointer',
  },
  mensaje: { fontSize: '0.85rem', marginTop: 14, marginBottom: 0 },
  enlace: {
    marginTop: 18,
    background: 'none',
    border: 'none',
    color: 'var(--primary)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 500,
    padding: 0,
  },
}