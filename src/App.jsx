import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import Layout from './components/Layout'
import Inicio from './pages/Inicio'
import Cuentas from './components/Cuentas'
import Categorias from './components/Categorias'
import Movimientos from './components/Movimientos'
import GastosFijos from './components/GastosFijos'
import Resumen from './components/Resumen'
import { ui } from './lib/ui'

export default function App() {
  const [sesion, setSesion] = useState(null)
  const [cargandoSesion, setCargandoSesion] = useState(true)
  const [pagina, setPagina] = useState('inicio')

  const [cuentas, setCuentas] = useState([])
  const [cargandoCuentas, setCargandoCuentas] = useState(true)
  const [categorias, setCategorias] = useState([])
  const [cargandoCategorias, setCargandoCategorias] = useState(true)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session)
      setCargandoSesion(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, sesion) => setSesion(sesion))

    return () => subscription.unsubscribe()
  }, [])

  const cargarCuentas = useCallback(async () => {
    setCargandoCuentas(true)

    const [resCuentas, resMovs] = await Promise.all([
      supabase.from('cuenta').select('*').eq('archivada', false).order('created_at'),
      supabase.from('movimiento').select('cuenta_id, tipo, monto').eq('estado', 'pagado'),
    ])

    const lista = resCuentas.data || []
    const movs = resMovs.data || []

    const conSaldo = lista.map((c) => {
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
    return <p style={{ padding: '2rem', color: 'var(--text-muted)' }}>Cargando...</p>
  }

  if (!sesion) return <Auth />

  const props = { cuentas, categorias, version, onCambio: refrescar }

  return (
    <Layout
      pagina={pagina}
      setPagina={setPagina}
      email={sesion.user.email}
      onSalir={() => supabase.auth.signOut()}
    >
      {pagina === 'inicio' && <Inicio cuentas={cuentas} version={version} irA={setPagina} />}

      {pagina === 'movimientos' && (
        <>
          <h1 style={{ ...ui.tituloPagina, marginBottom: 20 }}>Movimientos</h1>
          <Movimientos {...props} />
        </>
      )}

      {pagina === 'cuentas' && (
        <>
          <h1 style={{ ...ui.tituloPagina, marginBottom: 20 }}>Cuentas</h1>
          <Cuentas cuentas={cuentas} cargando={cargandoCuentas} version={version} onCambio={refrescar} />
        </>
      )}

      {pagina === 'categorias' && (
        <>
          <h1 style={{ ...ui.tituloPagina, marginBottom: 20 }}>Categorias</h1>
          <Categorias categorias={categorias} cargando={cargandoCategorias} onCambio={refrescar} />
        </>
      )}

      {pagina === 'fijos' && (
        <>
          <h1 style={{ ...ui.tituloPagina, marginBottom: 20 }}>Gastos fijos</h1>
          <GastosFijos {...props} />
        </>
      )}

      {pagina === 'reportes' && (
        <>
          <h1 style={{ ...ui.tituloPagina, marginBottom: 20 }}>Reportes</h1>
          <Resumen version={version} />
        </>
      )}
    </Layout>
  )
}