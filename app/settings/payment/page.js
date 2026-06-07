'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSettings } from '@/lib/settings-context'
import Button from '@/components/Button'
import BackButton from '@/components/BackButton'

const inputClass =
  'w-full bg-white border border-aq-border rounded-aq-md min-h-tap px-4 text-body text-aq-ink placeholder:text-aq-subtle focus:outline-none focus:border-aq-green transition-colors duration-150'

const labelClass = 'block text-secondary text-aq-muted mb-aq-sm'

const textareaClass =
  'w-full bg-white border border-aq-border rounded-aq-md px-4 py-3 text-body text-aq-ink placeholder:text-aq-subtle focus:outline-none focus:border-aq-green transition-colors duration-150 resize-y'

export default function PaymentPage() {
  const router = useRouter()
  const { settings, updateSettings, settingsLoaded } = useSettings()

  const [gstNumber, setGstNumber] = useState('')
  const [bankName, setBankName] = useState('')
  const [bankAccountName, setBankAccountName] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [termsAndConditions, setTermsAndConditions] = useState('')
  const [saveStatus, setSaveStatus] = useState(null)

  useEffect(() => {
    if (!settingsLoaded) return
    setGstNumber(settings.gst_number || '')
    setBankName(settings.bank_name || '')
    setBankAccountName(settings.bank_account_name || '')
    setBankAccountNumber(settings.bank_account_number || '')
    setPaymentTerms(settings.payment_terms || '')
    setTermsAndConditions(settings.terms_and_conditions || '')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded])

  async function handleSave() {
    setSaveStatus('saving')
    updateSettings({
      gst_number: gstNumber,
      bank_name: bankName,
      bank_account_name: bankAccountName,
      bank_account_number: bankAccountNumber,
      payment_terms: paymentTerms,
      terms_and_conditions: termsAndConditions,
    })
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus(null), 2500)
  }

  return (
    <div className="min-h-dvh bg-aq-surface">
      <div className="max-w-[480px] mx-auto px-aq-lg pb-[88px]">

        <div className="flex items-center gap-aq-sm py-aq-xl">
          <BackButton href="/settings" label="Settings" />
          <h1 className="text-page-title font-medium text-aq-ink ml-aq-sm">Payment and invoicing</h1>
        </div>

        <div className="flex flex-col gap-aq-lg">

          <p className="text-secondary text-aq-muted">
            These appear at the bottom of every quote and invoice.
          </p>

          <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
            <div className="flex flex-col gap-aq-md">

              <div>
                <label htmlFor="gst-number" className={labelClass}>GST number</label>
                <input
                  id="gst-number"
                  type="text"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  placeholder="123-456-789"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="bank-name" className={labelClass}>Bank name</label>
                <input
                  id="bank-name"
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. ANZ, ASB, BNZ, Westpac, Kiwibank"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="bank-account-name" className={labelClass}>Account name</label>
                <input
                  id="bank-account-name"
                  type="text"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="bank-account-number" className={labelClass}>Account number</label>
                <input
                  id="bank-account-number"
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="00-0000-0000000-00"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="payment-terms" className={labelClass}>Payment terms</label>
                <textarea
                  id="payment-terms"
                  rows={3}
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="e.g. Payment due within 7 days."
                  className={textareaClass}
                />
              </div>

              <div>
                <label htmlFor="terms-conditions" className={labelClass}>Terms and conditions</label>
                <textarea
                  id="terms-conditions"
                  rows={6}
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  placeholder="Enter your terms and conditions here."
                  className={textareaClass}
                />
              </div>

            </div>
          </div>

          <Button variant="primary" fullWidth onClick={handleSave} disabled={saveStatus === 'saving'}>
            {saveStatus === 'saving' ? 'Saving...' : 'Save'}
          </Button>
          {saveStatus === 'saved' && (
            <p className="text-secondary font-medium text-aq-green text-center">Saved</p>
          )}

        </div>
      </div>
    </div>
  )
}
