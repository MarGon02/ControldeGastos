import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatoGs, fechaCorta } from '../lib/formato'
import { calcularVencimientos, diasHasta } from '../lib/recurrencia'
import { ui } from '../lib/ui'

function rangoMesActual() {
  const hoy = new Date()
  const dd = (n) => String(n).padStart(2, '0')
  const ultimo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate()
  return {
    desde: `${hoy.getFullYear()}-${dd(hoy.getMonth() + 1)}-01`,
    hasta: `${hoy.getFullYear()}-${dd(hoy.getMonth() + 1)}-${dd(ultimo)}`,
  }
}

export default function Inicio({ cuentas, version, irA }) {
  const [ultimos, setUltimos] = useState([])
  const [delMes, setDelMes] = useState([])
  const [vencimientos, setVencimientos] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargar()
  }, [version])

  async function cargar() {
    setCargando(true)
    const { desde, hasta } = rangoMesActual()

    const [resUltimos, resMes, resReglas, resPagos] = await Promise.all([
      supabase
        .from('movimiento')
        .select('*, cuenta(nombre), categoria(nombre)')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('movimiento')
        .select('tipo, monto')
        .eq('estado', 'pagado')
        .in('tipo', ['gasto', 'ingreso'])
        .gte('fecha', desde)
        .lte('fecha', hasta),
      supabase.from('gasto_fijo').select('*').eq('activo', true),
      supabase
        .from('movimiento')
        .select('gasto_fijo_id, numero_cuota')
        .not('gasto_fijo_id', 'is', null),
    ])

    setUltimos((resUltimos.data || []).filter((m) => m.tipo !== 'transferencia_entrada').slice(0, 5))
    setDelMes(resMes.data || [])

    // Proximos vencimientos impagos
    const reglas = resReglas.data || []
    const pagos = resPagos.data || []
    const pend = []

    for (const r of reglas) {
      for (const v of calcularVencimientos(r)) {
        const pagado = pagos.some(
          (p) => p.gasto_fijo_id === r.id && p.numero_cuota === v.numero
        )
        if (!pagado) pend.push({ regla: r, v, dias: diasHasta(v.fecha) })
      }
    }
    pend.sort((a, b) => a.v.fecha.localeCompare(b.v.fecha))
    setVencimientos(pend.filter((p) => p.dias <= 15).slice(0, 4))

    setCargando(false)
  }

  const saldoTotal = cuentas.reduce((s, c) => s + c.saldo, 0)
  const ingresos = delMes.filter((m) => m.tipo === 'ingreso').reduce((s, m) => s + Number(m.monto), 0)
  const gastos = delMes.filter((m) => m.tipo === 'gasto').reduce((s, m) => s + Number(m.monto), 0)
  const balance = ingresos - gastos

  const mesNombre = new Date().toLocaleDateString('es-PY', { month: 'long' })

  return (
    <div>
      {/* ---------- SALDO TOTAL ---------- */}
      <section style={{ marginBottom: 28 }}>
        <div style={est.hero}>
          <div style={est.heroEtiqueta}>Saldo total</div>
          <div className="monto" style={est.heroNumero}>{formatoGs(saldoTotal)}</div>
          <div style={est.heroPie}>
            En {cuentas.length} {cuentas.length === 1 ? 'cuenta' : 'cuentas'}
          </div>
        </div>

        {cuentas.length > 0 && (
          <div style={est.cuentasFila}>
            {cuentas.map((c) => (
              <button key={c.id} style={est.cuentaChip} onClick={() => irA('cuentas')}>
                <span style={est.cuentaNombre}>{c.nombre}</span>
                <span className="monto" style={est.cuentaMonto}>{formatoGs(c.saldo)}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ---------- MES ---------- */}
      <section style={ui.seccion}>
        <p style={ui.eyebrow}>{mesNombre}</p>
        <div style={est.grid3}>
          <div style={ui.tarjeta}>
            <div style={est.miniEtiqueta}>Ingresos</div>
            <div className="monto" style={{ ...est.miniNumero, color: 'var(--ingreso)' }}>
              {formatoGs(ingresos)}
            </div>
          </div>
          <div style={ui.tarjeta}>
            <div style={est.miniEtiqueta}>Gastos</div>
            <div className="monto" style={{ ...est.miniNumero, color: 'var(--gasto)' }}>
              {formatoGs(gastos)}
            </div>
          </div>
          <div style={ui.tarjeta}>
            <div style={est.miniEtiqueta}>Balance</div>
            <div
              className="monto"
              style={{
                ...est.miniNumero,
                color: balance >= 0 ? 'var(--ingreso)' : 'var(--gasto)',
              }}
            >
              {balance < 0 ? '-' : ''}{formatoGs(Math.abs(balance))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- VENCIMIENTOS ---------- */}
      {vencimientos.length > 0 && (
        <section style={ui.seccion}>
          <div style={ui.cabecera}>
            <p style={{ ...ui.eyebrow, margin: 0 }}>Por pagar</p>
            <button style={est.enlace} onClick={() => irA('fijos')}>Ver todos</button>
          </div>
          <ul style={ui.lista}>
            {vencimientos.map((p) => {
              const vencido = p.dias < 0
              let aviso = `en ${p.dias} dias`
              if (p.dias === 0) aviso = 'vence hoy'
              else if (p.dias === 1) aviso = 'vence manana'
              else if (vencido) aviso = `vencido hace ${Math.abs(p.dias)} dias`

              return (
                <li key={`${p.regla.id}-${p.v.numero}`} style={ui.item}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={ui.itemTitulo}>{p.regla.descripcion}</div>
                    <div
                      style={{
                        ...ui.itemDetalle,
                        color: vencido ? 'var(--gasto)' : 'var(--alerta)',
                      }}
                    >
                      {fechaCorta(p.v.fecha)} · {aviso}
                    </div>
                  </div>
                  <span className="monto" style={ui.monto}>{formatoGs(p.regla.monto)}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* ---------- ULTIMOS MOVIMIENTOS ---------- */}
      <section style={ui.seccion}>
        <div style={ui.cabecera}>
          <p style={{ ...ui.eyebrow, margin: 0 }}>Ultimos movimientos</p>
          <button style={est.enlace} onClick={() => irA('movimientos')}>Ver todos</button>
        </div>

        {cargando ? (
          <p style={ui.vacio}>Cargando...</p>
        ) : ultimos.length === 0 ? (
          <p style={ui.vacio}>
            Todavia no registraste movimientos. Empeza cargando un gasto o un ingreso.
          </p>
        ) : (
          <ul style={ui.lista}>
            {ultimos.map((m) => {
              const esIngreso = m.tipo === 'ingreso'
              const esTransf = m.tipo === 'transferencia_salida'
              const color = esIngreso ? 'var(--ingreso)' : esTransf ? 'var(--text-muted)' : 'var(--gasto)'
              const signo = esIngreso ? '+' : esTransf ? '' : '-'

              return (
                <li key={m.id} style={ui.item}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={ui.itemTitulo}>
                      {esTransf ? 'Transferencia' : m.descripcion || (esIngreso ? 'Ingreso' : 'Gasto')}
                    </div>
                    <div style={ui.itemDetalle}>
                      {fechaCorta(m.fecha)} · {m.cuenta?.nombre || 'Sin cuenta'}
                      {m.categoria?.nombre ? ` · ${m.categoria.nombre}` : ''}
                    </div>
                  </div>
                  <span className="monto" style={{ ...ui.monto, color }}>
                    {signo} {formatoGs(m.monto)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

const est = {
  hero: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radio)',
    padding: '26px 22px',
  },
  heroEtiqueta: {
    fontSize: '0.72rem',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-faint)',
    marginBottom: 10,
  },
  heroNumero: {
    fontSize: 'clamp(1.9rem, 7vw, 2.6rem)',
    fontWeight: 600,
    lineHeight: 1.1,
    color: 'var(--text)',
  },
  heroPie: {
    marginTop: 8,
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
  },
  cuentasFila: {
    display: 'flex',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  cuentaChip: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
    flex: '1 1 130px',
    padding: '10px 13px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radio-sm)',
    cursor: 'pointer',
    textAlign: 'left',
  },
  cuentaNombre: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
  },
  cuentaMonto: { fontSize: '0.92rem', fontWeight: 500, color: 'var(--text)' },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 10,
  },
  miniEtiqueta: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginBottom: 6,
  },
  miniNumero: { fontSize: '1.08rem', fontWeight: 600 },
  enlace: {
    border: 'none',
    background: 'none',
    color: 'var(--primary)',
    fontSize: '0.82rem',
    fontWeight: 500,
    cursor: 'pointer',
    padding: 0,
  },
}