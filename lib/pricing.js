// Canonical pricing logic from 03-data-model.md
// All display values use toFixed(2). NZD throughout.

export function calcSellPrice(costPrice, markupPct) {
  return costPrice * (1 + markupPct / 100)
}

export function calcItemTotal(parts, labourHours, hourlyRate) {
  const partsTotal = parts.reduce((sum, p) => sum + p.sell_price * p.qty, 0)
  const labourTotal = labourHours * hourlyRate
  return partsTotal + labourTotal
}

export function calcJobSubtotal(items, calloutFee) {
  const itemsTotal = items.reduce((sum, item) => {
    return sum + calcItemTotal(item.parts || [], item.labour_hours || 0, item.hourly_rate || 0)
  }, 0)
  return itemsTotal + (calloutFee || 0)
}

export function calcGst(subtotal, gstRate = 15) {
  return subtotal * (gstRate / 100)
}

export function calcJobTotal(subtotal, gstRate = 15) {
  const gst = calcGst(subtotal, gstRate)
  return subtotal + gst
}

export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '$0.00'
  return `$${parseFloat(amount).toFixed(2)}`
}

export function calcQuoteTotals(items, calloutFee, hourlyRate, gstRate = 15) {
  const partsSubtotal = items.reduce((sum, item) => {
    const partsCost = (item.parts || []).reduce((s, p) => s + p.sell_price * p.qty, 0)
    return sum + partsCost
  }, 0)

  const labourSubtotal = items.reduce((sum, item) => {
    return sum + (item.labour_hours || 0) * hourlyRate
  }, 0)

  const subtotal = partsSubtotal + labourSubtotal + (calloutFee || 0)
  const gst = calcGst(subtotal, gstRate)
  const total = subtotal + gst

  return {
    partsSubtotal,
    labourSubtotal,
    calloutFee: calloutFee || 0,
    subtotal,
    gst,
    total,
  }
}
