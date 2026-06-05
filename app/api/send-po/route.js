import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const FROM_ADDRESS = 'hello@jotey.co.nz'

export async function POST(request) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 503 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const {
    pdf_base64,
    filename,
    supplier_email,
    supplier_name,
    po_number,
    collection_method,
    delivery_address,
    business_name,
    business_email,
  } = body

  if (!supplier_email || !pdf_base64 || !filename) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const displayName = (business_name || '').trim()
  if (!displayName) {
    return NextResponse.json(
      { error: 'Add your business name in settings before sending purchase orders.' },
      { status: 400 }
    )
  }

  const subject = `Purchase order ${po_number} from ${displayName}`

  const collectionLine =
    collection_method === 'delivery' && delivery_address
      ? `Delivery to: ${delivery_address}`
      : 'Collection: Pickup'

  const html = `
<p>Hi ${supplier_name || 'there'},</p>
<p>Please find our purchase order ${po_number} attached.</p>
<p>${collectionLine}</p>
<p>Reply to this email if you have any questions.</p>
<p>${displayName}</p>
`.trim()

  const text = [
    `Hi ${supplier_name || 'there'},`,
    '',
    `Please find our purchase order ${po_number} attached.`,
    '',
    collectionLine,
    '',
    'Reply to this email if you have any questions.',
    '',
    displayName,
  ].join('\n')

  if (!business_email) {
    console.warn('send-po: no business_email set -- reply-to will not be configured.')
  }

  const resend = new Resend(apiKey)

  try {
    await resend.emails.send({
      from: `${displayName} <${FROM_ADDRESS}>`,
      to: supplier_email,
      ...(business_email ? { replyTo: business_email } : {}),
      subject,
      html,
      text,
      attachments: [
        {
          filename,
          content: Buffer.from(pdf_base64, 'base64'),
        },
      ],
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('send-po: Resend error:', err?.message || err)
    return NextResponse.json({ error: err?.message || 'Failed to send email' }, { status: 500 })
  }
}
