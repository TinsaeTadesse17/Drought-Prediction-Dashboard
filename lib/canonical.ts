// Central canonicalization for woreda names to ensure consistent matching.
// Any new alias should be added to ALIAS_MAP so the map layer, predictions, and UI remain aligned.

const ALIAS_MAP: Record<string, string> = {
  'gode': 'Godey',
  'godey woreda': 'Godey',
  'gode woreda': 'Godey',
  'godey': 'Godey',
}

export function canonicalWoredaName(raw?: string): string {
  if (!raw) return ''
  let base = raw.trim().replace(/\s+/g, ' ')
  base = base.replace(/\bWoreda\b$/i, '').trim()
  const key = base.toLowerCase()
  if (ALIAS_MAP[key]) return ALIAS_MAP[key]
  return base
}

export function sameWoreda(a?: string, b?: string): boolean {
  return canonicalWoredaName(a).toLowerCase() === canonicalWoredaName(b).toLowerCase()
}
