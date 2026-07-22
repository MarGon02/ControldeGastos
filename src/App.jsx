import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import Cuentas from './components/Cuentas'

export default function App() {
  const [sesion, setSesion] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session)
      setCargando(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, sesion) => {
      setSesion(sesion)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (cargando) {
    return <p style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>Cargando...</p>
  }

  if (!sesion) {
    return <Auth />
  }

  return (
    <main style={estilos.main}>
      <header style={estilos.header}>
        <h1 style={estilos.titulo}>Control de Gastos</h1>
        <button style={estilos.botonSalir} onClick={() => supabase.auth.signOut()}>
          Salir
        </button>
      </header>

      <p style={estilos.email}>{sesion.user.email}</p>

      <Cuentas />
    </main>
  )
}

const estilos = {
  main: {
    fontFamily: 'system-ui, sans-serif',
    maxWidth: 640,
    margin: '0 auto',
    padding: '2rem 1rem 4rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  titulo: { margin: 0, fontSize: '1.4rem' },
  botonSalir: {
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid #8886',
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
  },
  email: { opacity: 0.6, fontSize: '0.85rem', marginTop: 4, marginBottom: 28 },
}