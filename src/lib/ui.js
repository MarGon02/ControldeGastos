// Estilos compartidos. Todos los colores salen de las variables CSS
// definidas en index.css, asi el modo oscuro se resuelve en un solo lugar.

export const ui = {
  // --- Contenedores ---
  seccion: { marginBottom: 32 },

  tarjeta: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radio)',
    padding: 18,
  },

  // --- Titulos ---
  tituloPagina: {
    margin: 0,
    fontSize: '1.35rem',
    fontWeight: 600,
  },

  tituloSeccion: {
    margin: 0,
    fontSize: '1.05rem',
    fontWeight: 600,
  },

  eyebrow: {
    margin: '0 0 12px',
    fontSize: '0.72rem',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-faint)',
  },

  cabecera: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  },

  // --- Texto ---
  muted: { color: 'var(--text-muted)', fontSize: '0.88rem' },
  faint: { color: 'var(--text-faint)', fontSize: '0.8rem' },

  vacio: {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    background: 'var(--surface)',
    border: '1px dashed var(--border-strong)',
    borderRadius: 'var(--radio)',
    padding: '20px 18px',
    margin: 0,
  },

  error: {
    color: 'var(--gasto)',
    fontSize: '0.88rem',
    background: 'var(--surface)',
    border: '1px solid var(--gasto)',
    borderRadius: 'var(--radio-sm)',
    padding: '10px 12px',
    margin: '0 0 14px',
  },

  // --- Formularios ---
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radio)',
    padding: 18,
    marginBottom: 20,
  },

  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    fontSize: '0.78rem',
    fontWeight: 500,
    color: 'var(--text-muted)',
  },

  input: {
    padding: '10px 12px',
    fontSize: '0.95rem',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radio-sm)',
    background: 'var(--surface)',
    color: 'var(--text)',
    width: '100%',
  },

  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: '0.9rem',
    color: 'var(--text)',
  },

  fila: { display: 'flex', gap: 8 },

  // --- Botones ---
  btn: {
    padding: '9px 14px',
    fontSize: '0.88rem',
    fontWeight: 500,
    border: 'none',
    borderRadius: 'var(--radio-sm)',
    background: 'var(--primary)',
    color: 'var(--on-primary)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  btnGhost: {
    padding: '9px 14px',
    fontSize: '0.88rem',
    fontWeight: 500,
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radio-sm)',
    background: 'var(--surface)',
    color: 'var(--text)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  btnIcono: {
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text-muted)',
    borderRadius: 'var(--radio-sm)',
    width: 30,
    height: 30,
    cursor: 'pointer',
    fontSize: '0.85rem',
    lineHeight: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // --- Listas ---
  lista: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    background: 'var(--border)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radio)',
    overflow: 'hidden',
  },

  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: '13px 16px',
    background: 'var(--surface)',
    flexWrap: 'wrap',
  },

  itemTitulo: {
    fontWeight: 500,
    fontSize: '0.94rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  itemDetalle: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    marginTop: 2,
  },

  derecha: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },

  monto: { fontWeight: 500, fontSize: '0.94rem' },
}

// Clase para los montos (monoespaciada + tabular)
export const claseMonto = 'monto'