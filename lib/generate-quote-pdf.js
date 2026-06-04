// Generates a branded A4 quote PDF using jsPDF.
// Call with: { job, settings, labourHours, calloutFee, hourlyRate, subtotal, gst, total, acceptanceUrl }
// Returns a Blob. Import is dynamic so jsPDF only loads in the browser.

import { JOINERY_TYPE_LABELS } from './constants'
import { formatCurrency } from './pricing'

const MARGIN = 20
const PAGE_W = 210
const CONTENT_W = PAGE_W - MARGIN * 2 // 170mm

// Brand colours as RGB arrays
const C_GREEN       = [34, 166, 122]
const C_GREEN_TINT  = [230, 247, 240]
const C_INK         = [31, 45, 55]
const C_MUTED       = [74, 91, 104]
const C_SUBTLE      = [140, 163, 160]
const C_BORDER      = [228, 234, 232]
const C_WHITE       = [255, 255, 255]

// Column right-edges for the parts table (right-aligned text anchor)
const COL_TOTAL_R = PAGE_W - MARGIN - 2   // 188
const COL_UNIT_R  = COL_TOTAL_R - 28       // 160
const COL_QTY_R   = COL_UNIT_R - 25        // 135
const ROW_H = 7
const CELL_PAD = 2.5

function ink(doc)    { doc.setTextColor(...C_INK) }
function muted(doc)  { doc.setTextColor(...C_MUTED) }
function green(doc)  { doc.setTextColor(...C_GREEN) }

async function loadLogoForPdf(url) {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.9), aspect: img.naturalWidth / img.naturalHeight })
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

export async function generateQuotePdf({
  job,
  settings,
  labourHours,
  calloutFee,
  hourlyRate,
  subtotal,
  gst,
  total,
  acceptanceUrl,
  photosUrl,
  quoteVersion = 1,
  isRevision = false,
  logoUrl,
  parkingNoteShown = false,
}) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const bizName    = settings?.business_name || 'Awesome Building Services'
  const displayName = settings?.trading_name || bizName
  const gstRate    = settings?.gst_rate || 15

  // Load logo if provided
  let logo = null
  if (logoUrl) {
    try { logo = await loadLogoForPdf(logoUrl) } catch {}
  }

  let y = MARGIN

  // ── HEADER ─────────────────────────────────────────────────────────────────

  // Logo or AQ monogram — top-left, large enough to read clearly
  const MAX_LOGO_W = 45  // mm — clearly visible on A4
  const MAX_LOGO_H = 20  // mm — cap height so wide logos don't dominate

  let logoW, logoH

  if (logo) {
    logoH = Math.min(MAX_LOGO_H, MAX_LOGO_W / logo.aspect)
    logoW = logoH * logo.aspect
    doc.addImage(logo.dataUrl, 'JPEG', MARGIN, y, logoW, logoH)
  } else {
    logoW = 20
    logoH = 20
    doc.setFillColor(...C_GREEN)
    doc.roundedRect(MARGIN, y, logoW, logoH, 4, 4, 'F')
    doc.setTextColor(...C_WHITE)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('AQ', MARGIN + logoW / 2, y + logoH * 0.62, { align: 'center' })
  }

  // Title — top-right, baseline vertically centred within the logo band
  const titleY = y + Math.max(logoH * 0.7, 12)
  if (isRevision) {
    doc.setFontSize(15)
    doc.setFont('helvetica', 'bold')
    ink(doc)
    doc.text(`Revised quote (version ${quoteVersion})`, PAGE_W - MARGIN, titleY, { align: 'right' })
  } else {
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    ink(doc)
    doc.text('Quote', PAGE_W - MARGIN, titleY, { align: 'right' })
  }

  // Business text block — below logo, left-aligned
  let textY = y + logoH + 4

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  ink(doc)
  doc.text(displayName, MARGIN, textY)
  textY += 5

  if (settings?.business_tagline) {
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    muted(doc)
    doc.text(settings.business_tagline, MARGIN, textY)
    textY += 5
  }

  const contactParts = [
    settings?.contact_person_name,
    settings?.business_phone,
    settings?.business_email,
  ].filter(Boolean)
  const contact = contactParts.join('   ')
  if (contact) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    muted(doc)
    doc.text(contact, MARGIN, textY)
    textY += 5
  }

  const gstNumber = settings?.gst_number
  if (gstNumber) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    muted(doc)
    doc.text(`GST number: ${gstNumber}`, MARGIN, textY)
    textY += 5
  }

  y = textY + 4

  // Divider
  doc.setDrawColor(...C_BORDER)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y, PAGE_W - MARGIN, y)
  y += 8

  // ── CUSTOMER DETAILS ────────────────────────────────────────────────────────

  const quoteDate = new Date().toLocaleDateString('en-NZ', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  muted(doc)
  doc.text('Prepared for:', MARGIN, y)

  y += 6
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  ink(doc)
  doc.text(job.customer_name || '', MARGIN, y)

  y += 5.5
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  muted(doc)
  doc.text(`Date: ${quoteDate}`, MARGIN, y)

  y += 5
  doc.setFontSize(10)
  if (job.customer_address) { doc.text(job.customer_address, MARGIN, y); y += 5 }
  if (job.customer_phone)   { doc.text(job.customer_phone, MARGIN, y);   y += 5 }

  y += 6

  // ── PARTS TABLE ─────────────────────────────────────────────────────────────

  // Table header row
  doc.setFillColor(...C_GREEN_TINT)
  doc.setDrawColor(...C_BORDER)
  doc.setLineWidth(0.3)
  doc.rect(MARGIN, y, CONTENT_W, ROW_H, 'FD')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  ink(doc)
  doc.text('Description',  MARGIN + CELL_PAD, y + 4.8)
  doc.text('Qty',          COL_QTY_R,         y + 4.8, { align: 'right' })
  doc.text('Unit price',   COL_UNIT_R,        y + 4.8, { align: 'right' })
  doc.text('Total',        COL_TOTAL_R,       y + 4.8, { align: 'right' })
  y += ROW_H

  // Helper: draw a data row
  function dataRow(desc, qty, unitPrice, lineTotal, indent = false) {
    doc.setDrawColor(...C_BORDER)
    doc.setLineWidth(0.2)
    doc.line(MARGIN, y + ROW_H, PAGE_W - MARGIN, y + ROW_H)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    ink(doc)
    const descX = MARGIN + CELL_PAD + (indent ? 4 : 0)
    const maxW  = COL_QTY_R - descX - 3
    doc.text(desc || '', descX, y + 4.8, { maxWidth: maxW })
    if (qty !== '')        doc.text(String(qty),             COL_QTY_R,   y + 4.8, { align: 'right' })
    if (unitPrice !== '')  doc.text(formatCurrency(unitPrice), COL_UNIT_R, y + 4.8, { align: 'right' })
    if (lineTotal !== '')  doc.text(formatCurrency(lineTotal), COL_TOTAL_R,y + 4.8, { align: 'right' })
    y += ROW_H
  }

  // Helper: draw an item subheading row (grey, bold)
  function subheadRow(label) {
    doc.setDrawColor(...C_BORDER)
    doc.setLineWidth(0.2)
    doc.line(MARGIN, y + ROW_H, PAGE_W - MARGIN, y + ROW_H)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    muted(doc)
    doc.text(label, MARGIN + CELL_PAD, y + 4.8)
    y += ROW_H
  }

  // Helper: draw a per-item subtotal row (only shown when multiple items)
  function itemSubtotalRow(amount) {
    doc.setDrawColor(...C_BORDER)
    doc.setLineWidth(0.2)
    doc.line(MARGIN, y + ROW_H, PAGE_W - MARGIN, y + ROW_H)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    muted(doc)
    doc.text('Item subtotal', COL_UNIT_R, y + 4.8, { align: 'right' })
    doc.text(formatCurrency(amount), COL_TOTAL_R, y + 4.8, { align: 'right' })
    y += ROW_H
  }

  // Item groups
  const activeItems = (job.items || []).filter(
    (item) => (item.parts || []).length > 0 || item.type === 'custom'
  )
  const showItemSubtotals = activeItems.length > 1

  activeItems.forEach((item) => {
    const parts = item.parts || []

    let groupLabel
    if (item.type === 'diagnosed') {
      groupLabel = [
        JOINERY_TYPE_LABELS[item.joinery_type] || item.joinery_type,
        item.fault_label || item.fault,
      ].filter(Boolean).join(' - ')
    } else {
      groupLabel = item.description || 'Custom item'
    }
    subheadRow(groupLabel)

    parts.forEach((p) => {
      dataRow(p.name, p.qty, p.sell_price, p.sell_price * p.qty, true)
    })

    if (showItemSubtotals) {
      const itemTotal = parts.reduce((s, p) => s + p.sell_price * p.qty, 0)
      itemSubtotalRow(itemTotal)
    }
  })

  // Labour row
  if (labourHours > 0) {
    dataRow('Labour', `${labourHours} hr`, hourlyRate, labourHours * hourlyRate)
  }

  // Callout fee row
  if (calloutFee > 0) {
    dataRow('Callout fee', '', '', calloutFee)
  }

  y += 4

  // ── TOTALS ──────────────────────────────────────────────────────────────────

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
    doc.text(label,               COL_UNIT_R,  midY, { align: 'right' })
    doc.text(formatCurrency(amount), COL_TOTAL_R, midY, { align: 'right' })
    y += h
  }

  totalRow('Subtotal',              subtotal, false)
  totalRow(`GST (${gstRate}%)`,     gst,      false)
  totalRow('Total (incl. GST)',     total,    true)

  if (parkingNoteShown) {
    y += 4
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    muted(doc)
    doc.text('Parking fees may apply and will be added at cost.', MARGIN, y)
    y += 6
  } else {
    y += 10
  }

  // ── ACCEPTANCE CTA BUTTONS ──────────────────────────────────────────────────

  if (acceptanceUrl) {
    const btnW = 90
    const btnH = 12
    const btnR = 3

    // Filled green "Accept this quote online" button
    doc.setFillColor(...C_GREEN)
    doc.roundedRect(MARGIN, y, btnW, btnH, btnR, btnR, 'F')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C_WHITE)
    doc.text('Accept this quote online', MARGIN + btnW / 2, y + 8, { align: 'center' })
    doc.link(MARGIN, y, btnW, btnH, { url: acceptanceUrl })
    y += btnH + 5

    if (photosUrl) {
      // Outlined "View photos online" button
      doc.setDrawColor(...C_GREEN)
      doc.setLineWidth(0.5)
      doc.roundedRect(MARGIN, y, btnW, btnH, btnR, btnR, 'D')
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...C_GREEN)
      doc.text('View photos online', MARGIN + btnW / 2, y + 8, { align: 'center' })
      doc.link(MARGIN, y, btnW, btnH, { url: photosUrl })
      y += btnH + 5
    }

    y += 5
  }

  // ── PAYMENT DETAILS ─────────────────────────────────────────────────────────

  const bankAccountNumber = settings?.bank_account_number
  const bankAccountName   = settings?.bank_account_name
  const bankName          = settings?.bank_name
  const paymentTerms      = settings?.payment_terms
  const tAndC             = settings?.terms_and_conditions

  if (bankAccountNumber || paymentTerms) {
    if (y + 40 > 255) { doc.addPage(); y = MARGIN }

    y += 6
    doc.setDrawColor(...C_BORDER)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, y, PAGE_W - MARGIN, y)
    y += 7

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    ink(doc)
    doc.text('Payment details', MARGIN, y)
    y += 6

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    ink(doc)
    const legalName   = settings?.legal_company_name
    const tradingName = settings?.trading_name
    if (legalName && tradingName) { doc.text(`${legalName} trading as ${tradingName}`, MARGIN, y); y += 5 }
    else if (legalName)           { doc.text(legalName, MARGIN, y); y += 5 }
    if (bankAccountName) { doc.text(`Account name: ${bankAccountName}`, MARGIN, y); y += 5 }
    if (bankName)         { doc.text(`Bank: ${bankName}`, MARGIN, y); y += 5 }
    if (bankAccountNumber){ doc.text(`Account number: ${bankAccountNumber}`, MARGIN, y); y += 5 }

    if (paymentTerms) {
      y += 2
      muted(doc)
      doc.text(paymentTerms, MARGIN, y, { maxWidth: CONTENT_W })
      y += 8
    }
  }

  // ── TERMS AND CONDITIONS ─────────────────────────────────────────────────────

  if (tAndC) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const tcLines = doc.splitTextToSize(tAndC, CONTENT_W)
    const tcNeeded = tcLines.length * 4.5 + 22

    if (y + tcNeeded > 255) { doc.addPage(); y = MARGIN }

    y += 6
    doc.setDrawColor(...C_BORDER)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, y, PAGE_W - MARGIN, y)
    y += 7

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    ink(doc)
    doc.text('Terms and conditions', MARGIN, y)
    y += 6

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    muted(doc)
    tcLines.forEach((line) => {
      if (y > 262) { doc.addPage(); y = MARGIN }
      doc.text(line, MARGIN, y)
      y += 4.5
    })
    y += 4
  }

  // ── FOOTER ──────────────────────────────────────────────────────────────────

  const footerY = 277
  doc.setDrawColor(...C_BORDER)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, footerY - 6, PAGE_W - MARGIN, footerY - 6)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  muted(doc)
  doc.text(`Thank you for choosing ${bizName}`, PAGE_W / 2, footerY, { align: 'center' })

  doc.setFontSize(8)
  doc.setTextColor(...C_SUBTLE)
  const ref = `Ref: AQ-${(job.id || '').substring(0, 8).toUpperCase()}`
  doc.text(ref, PAGE_W / 2, footerY + 5, { align: 'center' })

  return doc.output('blob')
}

// Trigger a PDF download in the browser
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
