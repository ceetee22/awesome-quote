export function buildNavUrl(address, navApp) {
  const enc = encodeURIComponent(address || '')
  switch (navApp) {
    case 'apple_maps': return `https://maps.apple.com/?daddr=${enc}`
    case 'waze': return `https://waze.com/ul?q=${enc}&navigate=yes`
    case 'system_default': return `geo:0,0?q=${enc}`
    default: return `https://www.google.com/maps/dir/?api=1&destination=${enc}`
  }
}
