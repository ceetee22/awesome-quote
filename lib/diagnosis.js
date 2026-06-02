// Diagnosis suggestion query from SKILL.md
// Filters catalogue parts by active, fits, and fixes tags

export function getSuggestedParts(parts, joineryType, fault) {
  if (!parts || !joineryType || !fault) return []

  // "other" fault returns nothing -- operator should browse catalogue
  if (fault === 'other') return []

  return parts.filter(
    (part) =>
      part.active &&
      Array.isArray(part.fits) &&
      Array.isArray(part.fixes) &&
      part.fits.includes(joineryType) &&
      part.fixes.includes(fault)
  )
}

export function searchParts(parts, query) {
  if (!query || !query.trim()) return parts
  const q = query.toLowerCase().trim()
  return parts.filter(
    (part) =>
      part.active &&
      (part.name.toLowerCase().includes(q) ||
        (part.sku && part.sku.toLowerCase().includes(q)) ||
        (part.category && part.category.toLowerCase().includes(q)))
  )
}

export function filterPartsByCategory(parts, category) {
  if (!category) return parts.filter((p) => p.active)
  return parts.filter((p) => p.active && p.category === category)
}
