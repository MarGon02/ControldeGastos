import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'

export default function App() {
  const [sesion, setSesion] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    // 1. Al cargar, buscamos si ya hay una sesion activa.
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session)
      setCargando(false)
    })

    // 2. Escuchamos cambios: login, logout, refresco de token.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, sesion) => {
      setSesion(sesion)
    })

    // 3. Limpiamos el listener cuando el componente se desmonta.
    return () => subscription.unsubscribe()
  }, [])

  if (cargando) {
    return <p style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>Cargando...</p>
  }

  if (!sesion) {
    return <Auth />
  }

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 640, margin: '4rem auto', padding: '0 1rem' }}>
      <h1>Control de Gastos</h1>
      <p>Sesion iniciada como <strong>{sesion.user.email}</strong></p>
      <button
        onClick={() => supabase.auth.signOut()}
        style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #ccc', cursor: 'pointer' }}
      >
        Cerrar sesion
      </button>
    </main>
  )
}