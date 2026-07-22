import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import Cuentas from './components/Cuentas'
import Movimientos from './components/Movimientos'
import Categorias from './components/Categorias'

export default function App() {
  const [sesion, setSesion] = useState(null)
  const [cargandoSesion, setCargandoSesion] = useState(true)

  const [cuentas, setCuentas] = useState([])
  const [cargandoCuentas, setCargandoCuentas] = useState(true)
  const [categorias, setCategorias] = useState([])
  const [cargandoCategorias, setCargandoCategorias] = useState(true)
  const [version, setVersion] = useState(0) // se incrementa para forzar recarga

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session)
      setCargandoSesion(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, sesion) => {
      setSesion(sesion)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Carga las cuentas y les calcula el saldo real usando los movimientos.
  const cargarCuentas = useCallback(async () => {
    setCargandoCuentas(true)

    const [resCuentas, resMovs] = await Promise.all([
      supabase.from('cuenta').select('*').eq('archivada', false).order('created_at'),
      supabase.from('movimiento').select('cuenta_id, tipo, monto').eq('estado', 'pagado'),
    ])

    const listaCuentas = resCuentas.data || []
    const movs = resMovs.data || []

    const conSaldo = listaCuentas.map((c) => {
      const delta = movs
        .filter((m) => m.cuenta_id === c.id)
        .reduce((suma, m) => {
          const entra = m.tipo === 'ingreso' || m.tipo === 'transferencia_entrada'
          return suma + (entra ? Number(m.monto) : -Number(m.monto))
        }, 0)

      return { ...c, saldo: Number(c.saldo_inicial) + delta }
    })

    setCuentas(conSaldo)
    setCargandoCuentas(false)
  }, [])

  const cargarCategorias = useCallback(async () => {
    setCargandoCategorias(true)
    const { data } = await supabase.from('categoria').select('*').order('nombre')
    setCategorias(data || [])
    setCargandoCategorias(false)
  }, [])

  useEffect(() => {
    if (sesion) {
      cargarCuentas()
      cargarCategorias()
    }
  }, [sesion, version, cargarCuentas, cargarCategorias])

  const refrescar = () => setVersion((v) => v + 1)

  if (cargandoSesion) {
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

      <Cuentas cuentas={cuentas} cargando={cargandoCuentas} onCambio={refrescar} />
      <Movimientos cuentas={cuentas} categorias={categorias} onCambio={refrescar} />
      <Categorias categorias={categorias} cargando={cargandoCategorias} onCambio={refrescar} />
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