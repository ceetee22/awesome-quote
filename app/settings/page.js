'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSettings } from '@/lib/settings-context'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getRepairTemplatesCount, getSuppliers } from '@/lib/db'
import ConfirmModal from '@/components/ConfirmModal'
import BackButton from '@/components/BackButton'

const ADMIN_USER_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID || ''
const FEEDBACK_EMAIL = process.env.NEXT_PUBLIC_FEEDBACK_EMAIL || 'vetearii.thomas@fatpukus.co.nz'

// ── Icon containers ───────────────────────────────────────────────────────────

function IconBox({ bg, stroke, children }) {
  return (
    <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
    </div>
  )
}

function IconPriceTag() {
  return (
    <IconBox bg="#E6F7F0" stroke="#147A5A">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="2.5" />
    </IconBox>
  )
}

function IconDollar() {
  return (
    <IconBox bg="#E6F7F0" stroke="#147A5A">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v12M9 9.5h4.5a1.5 1.5 0 010 3H10.5a1.5 1.5 0 000 3H15" />
    </IconBox>
  )
}

function IconMapPin() {
  return (
    <IconBox bg="#E6F7F0" stroke="#147A5A">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </IconBox>
  )
}

function IconTruck() {
  return (
    <IconBox bg="#FEF7E6" stroke="#C47A00">
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <path d="M16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </IconBox>
  )
}

function IconRuler() {
  return (
    <IconBox bg="#FEF7E6" stroke="#C47A00">
      <path d="M5 3l14 14M3 7l4-4M7 3l-4 4M14 17l4-4M17 13l-4 4" />
      <rect x="3" y="3" width="18" height="18" rx="2" transform="rotate(-45 12 12)" fill="none" />
    </IconBox>
  )
}

function IconBriefcase() {
  return (
    <IconBox bg="#F0F2F1" stroke="#4A5B68">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
      <line x1="12" y1="12" x2="12.01" y2="12" strokeWidth="2.5" />
    </IconBox>
  )
}

function IconReceipt() {
  return (
    <IconBox bg="#F0F2F1" stroke="#4A5B68">
      <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2V2l-3 2-3-2-3 2-3-2-3 2z" />
      <line x1="9" y1="9" x2="15" y2="9" />
      <line x1="9" y1="13" x2="15" y2="13" />
    </IconBox>
  )
}

function IconCloud() {
  return (
    <IconBox bg="#E8F1FB" stroke="#3B82D6">
      <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" />
    </IconBox>
  )
}

function IconCompass() {
  return (
    <IconBox bg="#F0F2F1" stroke="#4A5B68">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="none" />
    </IconBox>
  )
}

function IconLock() {
  return (
    <IconBox bg="#F0F2F1" stroke="#4A5B68">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </IconBox>
  )
}

function IconChat() {
  return (
    <IconBox bg="#F0F2F1" stroke="#4A5B68">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </IconBox>
  )
}

function IconDownload() {
  return (
    <IconBox bg="#F0F2F1" stroke="#4A5B68">
      <path d="M12 2v13M7 10l5 5 5-5" />
      <path d="M20 17v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2" />
    </IconBox>
  )
}

// ── Menu primitives ───────────────────────────────────────────────────────────

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#C5E8D5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 4l4 4-4 4" />
    </svg>
  )
}

function MenuRow({ icon, name, badge, description, value, href, onClick, isFirst }) {
  const inner = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
      minHeight: 64, borderTop: isFirst ? 'none' : '1px solid #F0F2F1',
    }}>
      {icon}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1F2D37' }}>{name}</span>
          {badge && (
            <span style={{ fontSize: 10, fontWeight: 600, background: '#E6F7F0', color: '#147A5A', borderRadius: 4, padding: '2px 6px', lineHeight: 1.4 }}>
              {badge}
            </span>
          )}
        </div>
        {description && <p style={{ fontSize: 12, color: '#8CA3A0', margin: 0, marginTop: 2 }}>{description}</p>}
      </div>
      {value && (
        <span style={{ fontSize: 14, fontWeight: 600, color: '#22A67A', flexShrink: 0, maxWidth: 130, textAlign: 'right' }}>
          {value}
        </span>
      )}
      <Chevron />
    </div>
  )
  if (onClick) {
    return (
      <button type="button" onClick={onClick} style={{ display: 'block', width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, WebkitTapHighlightColor: 'transparent' }}>
        {inner}
      </button>
    )
  }
  return <Link href={href} style={{ display: 'block', textDecoration: 'none' }}>{inner}</Link>
}

function MenuCard({ items }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E4EAE8', borderRadius: 12, overflow: 'hidden' }}>
      {items.map((item, idx) => (
        <MenuRow key={item.href || item.name} {...item} isFirst={idx === 0} />
      ))}
    </div>
  )
}

function GroupLabel({ label }) {
  return (
    <p style={{ fontSize: 12, fontWeight: 600, color: '#8CA3A0', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 6px 4px' }}>
      {label}
    </p>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

const NAV_APP_LABELS = {
  google_maps: 'Google Maps',
  apple_maps: 'Apple Maps',
  waze: 'Waze',
  system_default: 'System default',
}

export default function SettingsPage() {
  const router = useRouter()
  const { settings } = useSettings()
  const [signOutModalOpen, setSignOutModalOpen] = useState(false)
  const [templatesCount, setTemplatesCount] = useState(null)
  const [supplierCount, setSupplierCount] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    getRepairTemplatesCount().then(setTemplatesCount)
    getSuppliers().then((s) => setSupplierCount(s.length))

    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches)

    function handleInstallPrompt(e) {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleInstallPrompt)

    if (ADMIN_USER_ID) {
      const supabase = createSupabaseBrowserClient()
      if (supabase) {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user?.id === ADMIN_USER_ID) setIsAdmin(true)
        })
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setDeferredPrompt(null)
  }

  function handleFeedback() {
    const subject = encodeURIComponent('Jotey beta feedback')
    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${subject}`
  }

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient()
    if (supabase) await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const hourlyRate = settings.hourly_labour_rate ? `$${settings.hourly_labour_rate}/hr` : null
  const zoneCount = (settings.callout_zones || []).length
  const navApp = NAV_APP_LABELS[settings.nav_app || 'google_maps']

  return (
    <>
      <div className="min-h-dvh bg-aq-surface">
        <div className="max-w-[480px] mx-auto px-aq-lg pb-[88px]">

          <div className="flex items-center gap-aq-sm py-aq-xl">
            <BackButton href="/" label="Home" />
            <h1 className="text-page-title font-medium text-aq-ink ml-aq-sm">Settings</h1>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Pricing */}
            <div>
              <GroupLabel label="Pricing" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

                {/* Standard rates — highlighted standalone card */}
                <Link href="/settings/standard-rates" style={{ display: 'block', textDecoration: 'none', background: '#FFFFFF', border: '2px solid #22A67A', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', minHeight: 64 }}>
                    <IconPriceTag />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: '#1F2D37' }}>Standard rates</span>
                        <span style={{ fontSize: 10, fontWeight: 600, background: '#E6F7F0', color: '#147A5A', borderRadius: 4, padding: '2px 6px', lineHeight: 1.4 }}>Speed quoting</span>
                      </div>
                      <p style={{ fontSize: 12, color: '#8CA3A0', margin: '2px 0 0' }}>Auto-fill parts and pricing per repair type</p>
                    </div>
                    {templatesCount !== null && (
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#22A67A', flexShrink: 0 }}>{templatesCount} saved</span>
                    )}
                    <Chevron />
                  </div>
                </Link>

                <MenuCard items={[
                  { icon: <IconDollar />, name: 'Labour and markup', value: hourlyRate, href: '/settings/labour' },
                  { icon: <IconMapPin />, name: 'Callout zones', value: `${zoneCount} zone${zoneCount !== 1 ? 's' : ''}`, href: '/settings/callout-zones' },
                ]} />
              </div>
            </div>

            {/* Parts and suppliers */}
            <div>
              <GroupLabel label="Parts and suppliers" />
              <MenuCard items={[
                {
                  icon: <IconTruck />,
                  name: 'Suppliers',
                  value: supplierCount !== null ? `${supplierCount} supplier${supplierCount !== 1 ? 's' : ''}` : null,
                  href: '/settings/suppliers',
                },
                { icon: <IconRuler />, name: 'Window size bands', href: '/settings/window-bands' },
              ]} />
            </div>

            {/* Your business */}
            <div>
              <GroupLabel label="Your business" />
              <MenuCard items={[
                { icon: <IconBriefcase />, name: 'Business details', href: '/settings/business' },
                { icon: <IconReceipt />, name: 'Payment and invoicing', href: '/settings/payment' },
              ]} />
            </div>

            {/* Integrations */}
            <div>
              <GroupLabel label="Integrations" />
              <MenuCard items={[
                { icon: <IconCloud />, name: 'Xero', description: 'Send invoices directly to Xero', value: 'Not connected', href: '/settings/xero' },
              ]} />
            </div>

            {/* Account */}
            <div>
              <GroupLabel label="Account" />
              {(() => {
                const items = [
                  { icon: <IconCompass />, name: 'Navigation app', value: navApp, href: '/settings/navigation' },
                  { icon: <IconLock />, name: 'Change password', href: '/settings/password' },
                ]
                if (!isStandalone && deferredPrompt) {
                  items.push({ icon: <IconDownload />, name: 'Add to home screen', description: 'Use Jotey like a native app', onClick: handleInstall })
                }
                if (!isAdmin) {
                  items.push({ icon: <IconChat />, name: 'Send feedback', description: 'Help us improve Jotey', onClick: handleFeedback })
                }
                return <MenuCard items={items} />
              })()}
            </div>

          </div>

          {/* Sign out */}
          <div style={{ textAlign: 'center', marginTop: 32, marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => setSignOutModalOpen(true)}
              style={{ background: 'none', border: 'none', fontSize: 16, fontWeight: 500, color: '#D94444', cursor: 'pointer', padding: '8px 16px', minHeight: 48 }}
            >
              Sign out
            </button>
          </div>

        </div>
      </div>

      <ConfirmModal
        open={signOutModalOpen}
        question="Sign out of Jotey?"
        confirmLabel="Yes, sign out"
        cancelLabel="Cancel"
        onConfirm={handleSignOut}
        onCancel={() => setSignOutModalOpen(false)}
      />
    </>
  )
}
