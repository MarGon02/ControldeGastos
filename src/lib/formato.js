// Formatea numeros como guaranies: 1500000 -> "Gs. 1.500.000"
export function formatoGs(valor) {
  return 'Gs. ' + Number(valor || 0).toLocaleString('es-PY')
}

// Fecha de hoy en formato YYYY-MM-DD (para inputs type="date")
export function hoyISO() {
  const d = new Date()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

// Muestra una fecha YYYY-MM-DD como DD/MM/YYYY
export function fechaCorta(iso) {
  if (!iso) return ''
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}