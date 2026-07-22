import { useState, useEffect } from 'react'

const MENU = [
  { grupo: 'Principal', items: [
    { id: 'inicio', etiqueta: 'Inicio' },
    { id: 'movimientos', etiqueta: 'Movimientos' },
  ]},
  { grupo: 'Administracion', items: [
    { id: 'cuentas', etiqueta: 'Cuentas' },
    { id: 'categorias', etiqueta: 'Categorias' },
    { id: 'fijos', etiqueta: 'Gastos fijos' },
  ]},
  { grupo: 'Analisis', items: [
    { id: 'reportes', etiqueta: 'Reportes' },
  ]},
]

export default function Layout({ pagina, setPagina, email, onSalir, children }) {
  const [abierto, setAbierto] = useState(false)
  const [esAncho, setEsAncho] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 900 : true
  )

  useEffect(() => {
    function alRedimensionar() {
      const ancho = window.innerWidth >= 900
      setEsAncho(ancho)
      if (ancho) setAbierto(false)
    }
    window.addEventListener('resize', alRedimensionar)
    return () => window.removeEventListener('resize', alRedimensionar)
  }, [])

  const sidebarVisible = esAncho || abierto

  function irA(id) {
    setPagina(id)
    if (!esAncho) setAbierto(false)
  }

  return (
    <div style={{ minHeight: '100%' }}>
      {/* ---------- BARRA SUPERIOR ---------- */}
      <header style={estilos.header}>
        <div style={estilos.headerIzq}>
          <button
            style={estilos.hamburguesa}
            onClick={() => setAbierto(!abierto)}
            aria-label="Abrir menu"
          >
            <span style={estilos.linea} />
            <span style={estilos.linea} />
            <span style={estilos.linea} />
          </button>
        </div>

        <div style={estilos.headerCentro}>
          <span style={estilos.marca}>Control de Gastos</span>
        </div>

        <div style={estilos.headerDer}>
          <span style={estilos.email} title={email}>{email}</span>
          <button style={estilos.salir} onClick={onSalir}>Salir</button>
        </div>
      </header>

      {/* ---------- FONDO OSCURO EN MOVIL ---------- */}
      {abierto && !esAncho && (
        <div style={estilos.overlay} onClick={() => setAbierto(false)} />
      )}

      {/* ---------- BARRA LATERAL ---------- */}
      <nav
        style={{
          ...estilos.sidebar,
          transform: sidebarVisible ? 'translateX(0)' : 'translateX(-100%)',
          boxShadow: abierto && !esAncho ? '0 0 40px rgba(0,0,0,0.18)' : 'none',
        }}
      >
        {MENU.map((seccion) => (
          <div key={seccion.grupo} style={estilos.grupo}>
            <div style={estilos.grupoTitulo}>{seccion.grupo}</div>
            {seccion.items.map((item) => {
              const activo = pagina === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => irA(item.id)}
                  style={{
                    ...estilos.navItem,
                    background: activo ? 'var(--primary-soft)' : 'transparent',
                    color: activo ? 'var(--primary)' : 'var(--text)',
                    fontWeight: activo ? 600 : 400,
                  }}
                >
                  {item.etiqueta}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* ---------- CONTENIDO ---------- */}
      <main
        style={{
          ...estilos.main,
          marginLeft: esAncho ? 'var(--sidebar-ancho)' : 0,
        }}
      >
        <div style={estilos.contenedor}>{children}</div>
      </main>
    </div>
  )
}

const estilos = {
  header: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: 'var(--header-alto)',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '0 16px',
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    zIndex: 30,
  },
  headerIzq: { flex: '0 0 auto', display: 'flex', alignItems: 'center' },
  headerCentro: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    minWidth: 0,
  },
  headerDer: {
    flex: '0 0 auto',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  marca: {
    fontWeight: 600,
    fontSize: '0.98rem',
    letterSpacing: '-0.01em',
    whiteSpace: 'nowrap',
  },
  hamburguesa: {
    width: 36,
    height: 36,
    border: '1px solid var(--border)',
    borderRadius: 'var(--radio-sm)',
    background: 'var(--surface)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    padding: 0,
  },
  linea: {
    display: 'block',
    width: 15,
    height: 1.5,
    background: 'var(--text)',
    borderRadius: 2,
  },
  email: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    maxWidth: 170,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  salir: {
    padding: '6px 12px',
    fontSize: '0.82rem',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radio-sm)',
    background: 'var(--surface)',
    color: 'var(--text)',
    cursor: 'pointer',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(26,26,23,0.35)',
    zIndex: 25,
  },
  sidebar: {
    position: 'fixed',
    top: 'var(--header-alto)',
    bottom: 0,
    left: 0,
    width: 'var(--sidebar-ancho)',
    background: 'var(--surface)',
    borderRight: '1px solid var(--border)',
    padding: '18px 12px',
    overflowY: 'auto',
    zIndex: 28,
    transition: 'transform 0.2s ease',
  },
  grupo: { marginBottom: 22 },
  grupoTitulo: {
    fontSize: '0.68rem',
    fontWeight: 600,
    letterSpacing: '0.09em',
    textTransform: 'uppercase',
    color: 'var(--text-faint)',
    padding: '0 10px',
    marginBottom: 6,
  },
  navItem: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '9px 10px',
    marginBottom: 2,
    border: 'none',
    borderRadius: 'var(--radio-sm)',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  main: {
    paddingTop: 'var(--header-alto)',
    transition: 'margin-left 0.2s ease',
  },
  contenedor: {
    maxWidth: 860,
    margin: '0 auto',
    padding: '28px 16px 64px',
  },
}