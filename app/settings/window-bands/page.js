'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSettings } from '@/lib/settings-context'
import Button from '@/components/Button'
import BackButton from '@/components/BackButton'
import ConfirmModal from '@/components/ConfirmModal'

const inputClass =
  'w-full bg-white border border-aq-border rounded-aq-md min-h-tap px-4 text-body text-aq-ink placeholder:text-aq-subtle focus:outline-none focus:border-aq-green transition-colors duration-150'

const labelClass = 'block text-secondary text-aq-muted mb-aq-sm'

function SuffixInput({ id, suffix, value, onChange, placeholder }) {
  return (
    <div className="flex items-stretch border border-aq-border rounded-aq-md overflow-hidden min-h-tap focus-within:border-aq-green transition-colors duration-150 bg-white">
      <input id={id} type="number" value={value} onChange={onChange} placeholder={placeholder} className="flex-1 px-3 text-body text-aq-ink bg-white focus:outline-none min-w-0" />
      <span className="px-3 flex items-center text-body text-aq-muted bg-aq-surface border-l border-aq-border shrink-0">{suffix}</span>
    </div>
  )
}

export default function WindowBandsPage() {
  const router = useRouter()
  const { settings, updateSettings, settingsLoaded } = useSettings()

  const [rubberWastePct, setRubberWastePct] = useState('')
  const [bands, setBands] = useState([])
  const [editingBandIdx, setEditingBandIdx] = useState(null)
  const [editBandState, setEditBandState] = useState(null)
  const [deleteBandIdx, setDeleteBandIdx] = useState(null)
  const [saveStatus, setSaveStatus] = useState(null)

  useEffect(() => {
    if (!settingsLoaded) return
    setRubberWastePct(String(settings.rubber_waste_pct ?? 10))
    setBands(settings.window_size_bands || [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded])

  async function handleSave() {
    setSaveStatus('saving')
    updateSettings({
      rubber_waste_pct: parseFloat(rubberWastePct) || 10,
      window_size_bands: bands,
    })
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus(null), 2500)
  }

  return (
    <>
      <div className="min-h-dvh bg-aq-surface">
        <div className="max-w-[480px] mx-auto px-aq-lg pb-[88px]">

          <div className="flex items-center gap-aq-sm py-aq-xl">
            <BackButton href="/settings" label="Settings" />
            <h1 className="text-page-title font-medium text-aq-ink ml-aq-sm">Window size bands</h1>
          </div>

          <div className="flex flex-col gap-aq-lg">

            <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
              <p className="text-secondary text-aq-muted">
                Bands are your typical window sizes. Set the rubber metres and time each one usually takes so estimates are fast and accurate.
              </p>
            </div>

            <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
              <div>
                <label htmlFor="rubber-waste" className={labelClass}>Rubber waste allowance</label>
                <SuffixInput
                  id="rubber-waste"
                  suffix="%"
                  value={rubberWastePct}
                  onChange={(e) => setRubberWastePct(e.target.value)}
                  placeholder="10"
                />
                <p className="text-caption text-aq-muted mt-aq-xs">
                  Added to raw metres when calculating how much to order.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-[10px]">
              {bands.map((band, idx) =>
                editingBandIdx === idx ? (
                  <div key={idx} className="bg-aq-green-tint border border-aq-green-tint-border rounded-aq-xl p-aq-lg flex flex-col gap-aq-sm">
                    <div>
                      <p className={labelClass}>Band name</p>
                      <input
                        type="text"
                        value={editBandState.name}
                        onChange={(e) => setEditBandState((prev) => ({ ...prev, name: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div className="flex gap-aq-sm">
                      <div className="flex-1">
                        <p className={labelClass}>Perimeter (m)</p>
                        <input
                          type="number"
                          step="0.1"
                          value={editBandState.perimeter_m}
                          onChange={(e) => setEditBandState((prev) => ({ ...prev, perimeter_m: e.target.value }))}
                          className={inputClass}
                        />
                      </div>
                      <div className="flex-1">
                        <p className={labelClass}>Labour (min)</p>
                        <input
                          type="number"
                          value={editBandState.labour_min}
                          onChange={(e) => setEditBandState((prev) => ({ ...prev, labour_min: e.target.value }))}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div className="flex gap-aq-sm">
                      <Button
                        variant="primary"
                        className="flex-1"
                        onClick={() => {
                          setBands((prev) => prev.map((b, i) =>
                            i === editingBandIdx
                              ? { name: editBandState.name, perimeter_m: parseFloat(editBandState.perimeter_m) || 0, labour_min: parseInt(editBandState.labour_min, 10) || 0 }
                              : b
                          ))
                          setEditingBandIdx(null)
                          setEditBandState(null)
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={() => { setEditingBandIdx(null); setEditBandState(null) }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div key={idx} className="bg-aq-surface border border-aq-border rounded-aq-xl p-aq-lg flex items-center justify-between gap-aq-sm">
                    <div className="flex-1 min-w-0">
                      <p className="text-secondary font-medium text-aq-ink">{band.name}</p>
                      <p className="text-caption text-aq-muted">{band.perimeter_m}m perimeter · {band.labour_min} min</p>
                    </div>
                    <div className="flex gap-aq-sm shrink-0">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setEditingBandIdx(idx)
                          setEditBandState({ name: band.name, perimeter_m: String(band.perimeter_m), labour_min: String(band.labour_min) })
                        }}
                      >
                        Edit
                      </Button>
                      {bands.length > 1 && (
                        <Button variant="destructive" onClick={() => setDeleteBandIdx(idx)}>
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>

            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                const newBand = { name: 'New size', perimeter_m: 4.0, labour_min: 20 }
                setBands((prev) => [...prev, newBand])
                setEditingBandIdx(bands.length)
                setEditBandState({ name: 'New size', perimeter_m: '4.0', labour_min: '20' })
              }}
            >
              Add band
            </Button>

            <Button variant="primary" fullWidth onClick={handleSave} disabled={saveStatus === 'saving'}>
              {saveStatus === 'saving' ? 'Saving...' : 'Save'}
            </Button>
            {saveStatus === 'saved' && (
              <p className="text-secondary font-medium text-aq-green text-center">Saved</p>
            )}

          </div>
        </div>
      </div>

      <ConfirmModal
        open={deleteBandIdx !== null}
        question="Delete this size band?"
        confirmLabel="Yes, delete"
        cancelLabel="Keep"
        variant="destructive"
        onConfirm={() => {
          setBands((prev) => prev.filter((_, i) => i !== deleteBandIdx))
          setDeleteBandIdx(null)
        }}
        onCancel={() => setDeleteBandIdx(null)}
      />
    </>
  )
}
