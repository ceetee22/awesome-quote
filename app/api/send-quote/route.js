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

  const { pdf_base64, filename, customer_email, customer_name, accept_url, business_name, business_email } = body

  if (!customer_email || !pdf_base64 || !filename) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const displayName = (business_name || '').trim()
  if (!displayName) {
    return NextResponse.json({ error: 'Add your business name in settings before sending quotes.' }, { status: 400 })
  }
  const subject = `Quote from ${displayName}`

  const html = `
<p>Hi ${customer_name || 'there'},</p>
<p>Your quote is attached. You can view and accept it online using the link below.</p>
<p><a href="${accept_url}">Accept this quote online</a></p>
<p>Reply to this email if you have any questions.</p>
<p>${displayName}</p>
`.trim()

  const text = [
    `Hi ${customer_name || 'there'},`,
    '',
    'Your quote is attached. You can view and accept it online using the link below.',
    '',
    accept_url,
    '',
    'Reply to this email if you have any questions.',
    '',
    displayName,
  ].join('\n')

  if (!business_email) {
    console.warn('send-quote: no business_email set — reply-to will not be configured. Tradie should add their email in settings.')
  }

  const resend = new Resend(apiKey)

  try {
    await resend.emails.send({
      from: `${displayName} <${FROM_ADDRESS}>`,
      to: customer_email,
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
    console.error('send-quote: Resend error:', err?.message || err)
    return NextResponse.json({ error: err?.message || 'Failed to send email' }, { status: 500 })
  }
}
