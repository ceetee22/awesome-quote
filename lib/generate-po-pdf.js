// Generates a branded A4 purchase order PDF using jsPDF.
// Call with: { job, settings, orderLines }
// orderLines: [{ name, sku, supplier_code, qty, cost_price }] — enabled lines only
// Returns a Blob. Import is dynamic so jsPDF only loads in the browser.

import { formatCurrency } from './pricing'

async function loadLogoForPdf(url) {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.9), aspect: img.naturalWidth / img.naturalHeight })
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

const MARGIN     = 20
const PAGE_W     = 210
const CONTENT_W  = PAGE_W - MARGIN * 2   // 170mm

const C_GREEN      = [34, 166, 122]
const C_GREEN_TINT = [230, 247, 240]
const C_INK        = [31, 45, 55]
const C_MUTED      = [74, 91, 104]
const C_SUBTLE     = [140, 163, 160]
const C_BORDER     = [228, 234, 232]
const C_WHITE      = [255, 255, 255]

// Column right-edges (right-aligned text anchors)
const COL_TOTAL_R = PAGE_W - MARGIN - 2   // 188
const COL_UNIT_R  = COL_TOTAL_R - 28      // 160
const COL_QTY_R   = COL_UNIT_R - 22       // 138
const COL_SKU_R   = COL_QTY_R - 30        // 108
const ROW_H       = 7
const CELL_PAD    = 2.5

function ink(doc)   { doc.setTextColor(...C_INK) }
function muted(doc) { doc.setTextColor(...C_MUTED) }

export async function generatePoPdf({ job, settings, orderLines, collectionMethod = 'pickup', deliveryAddress = '', logoUrl = null }) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const bizName      = settings?.business_name  || 'Awesome Building Services'
  const displayName  = settings?.trading_name   || bizName
  const bizPhone     = settings?.business_phone || ''
  const bizEmail     = settings?.business_email || ''
  const supplierName = settings?.supplier_name  || 'Joinery Hardware NZ'
  const gstRate      = settings?.gst_rate       || 15
  const poNumber     = `PO-${(job.id || '').substring(0, 8).toUpperCase()}`
  const poDate       = new Date().toLocaleDateString('en-NZ', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const logo = logoUrl ? await loadLogoForPdf(logoUrl) : null

  let y = MARGIN

  // ── HEADER ──────────────────────────────────────────────────────────────────

  let nameX
  if (logo) {
    const MAX_W = 32, MAX_H = 14
    const logoH = Math.min(MAX_H, MAX_W / logo.aspect)
    const logoW = logoH * logo.aspect
    doc.addImage(logo.dataUrl, 'JPEG', MARGIN, y, logoW, logoH)
    nameX = MARGIN + logoW + 4
  } else {
    // AQ monogram
    doc.setFillColor(...C_GREEN)
    doc.roundedRect(MARGIN, y, 16, 16, 3, 3, 'F')
    doc.setTextColor(...C_WHITE)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('AQ', MARGIN + 8, y + 10.5, { align: 'center' })
    nameX = MARGIN + 20
  }

  // From: business name + contact
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  ink(doc)
  doc.text(displayName, nameX, y + 7)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  muted(doc)
  const contact = [bizPhone, bizEmail].filter(Boolean).join('   ')
  if (contact) doc.text(contact, nameX, y + 13)

  // "Purchase order" title + PO number + date (right side)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  ink(doc)
  doc.text('Purchase order', PAGE_W - MARGIN, y + 9, { align: 'right' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  muted(doc)
  doc.text(poNumber, PAGE_W - MARGIN, y + 15, { align: 'right' })
  doc.text(poDate,   PAGE_W - MARGIN, y + 20, { align: 'right' })

  y += 28

  // Divider
  doc.setDrawColor(...C_BORDER)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y, PAGE_W - MARGIN, y)
  y += 8

  // ── TO / JOB REFERENCE ──────────────────────────────────────────────────────

  const col2 = PAGE_W / 2

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  muted(doc)
  doc.text('To:', MARGIN, y)
  doc.text('Job reference:', col2, y)

  y += 5
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  ink(doc)
  doc.text(supplierName,           MARGIN, y)
  doc.setFontSize(10)
  doc.text(job.customer_name || '', col2,   y)

  y += 5
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  muted(doc)
  if (job.customer_address) { doc.text(job.customer_address, col2, y); y += 5 }

  y += 6

  // ── COLLECTION METHOD ────────────────────────────────────────────────────────

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  muted(doc)
  doc.text('Collection:', MARGIN, y)
  if (collectionMethod === 'delivery' && deliveryAddress) {
    ink(doc)
    doc.setFont('helvetica', 'bold')
    doc.text('Delivery', MARGIN + 24, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    muted(doc)
    doc.text('Deliver to:', MARGIN, y)
    ink(doc)
    doc.text(deliveryAddress, MARGIN + 24, y)
  } else {
    ink(doc)
    doc.setFont('helvetica', 'bold')
    doc.text('Pickup', MARGIN + 24, y)
    doc.setFont('helvetica', 'normal')
  }
  y += 8

  // ── PARTS TABLE ─────────────────────────────────────────────────────────────

  doc.setFillColor(...C_GREEN_TINT)
  doc.setDrawColor(...C_BORDER)
  doc.setLineWidth(0.3)
  doc.rect(MARGIN, y, CONTENT_W, ROW_H, 'FD')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  ink(doc)
  doc.text('Description', MARGIN + CELL_PAD, y + 4.8)
  doc.text('SKU',         COL_SKU_R,          y + 4.8, { align: 'right' })
  doc.text('Qty',         COL_QTY_R,          y + 4.8, { align: 'right' })
  doc.text('Unit cost',   COL_UNIT_R,         y + 4.8, { align: 'right' })
  doc.text('Total',       COL_TOTAL_R,        y + 4.8, { align: 'right' })
  y += ROW_H

  orderLines.forEach((line) => {
    doc.setDrawColor(...C_BORDER)
    doc.setLineWidth(0.2)
    doc.line(MARGIN, y + ROW_H, PAGE_W - MARGIN, y + ROW_H)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    ink(doc)
    const maxDescW = COL_SKU_R - MARGIN - CELL_PAD - 3
    doc.text(line.name || '', MARGIN + CELL_PAD, y + 4.8, { maxWidth: maxDescW })

    muted(doc)
    // Prefer supplier_code (what the supplier wants); fall back to sku
    doc.text(line.supplier_code || line.sku || '', COL_SKU_R,   y + 4.8, { align: 'right' })

    ink(doc)
    doc.text(String(line.qty),                          COL_QTY_R,   y + 4.8, { align: 'right' })
    doc.text(formatCurrency(line.cost_price),           COL_UNIT_R,  y + 4.8, { align: 'right' })
    doc.text(formatCurrency(line.qty * line.cost_price), COL_TOTAL_R, y + 4.8, { align: 'right' })
    y += ROW_H
  })

  y += 4

  // ── TOTALS ──────────────────────────────────────────────────────────────────

  const subtotal = orderLines.reduce((s, l) => s + l.qty * l.cost_price, 0)
  const gst      = subtotal * (gstRate / 100)
  const total    = subtotal + gst

  function totalRow(label, amount, highlight) {
    const h = highlight ? ROW_H + 1 : ROW_H
    if (highlight) {
      doc.setFillColor(...C_GREEN_TINT)
      doc.rect(MARGIN, y, CONTENT_W, h, 'F')
    }
    doc.setFontSize(highlight ? 11 : 10)
    doc.setFont('helvetica', highlight ? 'bold' : 'normal')
    highlight ? ink(doc) : muted(doc)
    const midY = y + (h / 2) + 2
    doc.text(label,                    COL_UNIT_R,  midY, { align: 'right' })
    doc.text(formatCurrency(amount),   COL_TOTAL_R, midY, { align: 'right' })
    y += h
  }

  totalRow('Subtotal',           subtotal, false)
  totalRow(`GST (${gstRate}%)`,  gst,      false)
  totalRow('Total (incl. GST)',  total,    true)

  y += 10

  // ── FOOTER ──────────────────────────────────────────────────────────────────

  const footerY = 277
  doc.setDrawColor(...C_BORDER)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, footerY - 6, PAGE_W - MARGIN, footerY - 6)

  doc.setTextColor(...C_SUBTLE)
  doc.setFontSize(8)
  doc.text(bizName,  PAGE_W / 2, footerY,     { align: 'center' })
  doc.text(poNumber, PAGE_W / 2, footerY + 5, { align: 'center' })

  return doc.output('blob')
}
