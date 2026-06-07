'use client'

import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useRouter } from 'next/navigation'
import { useSettings } from '@/lib/settings-context'
import Button from '@/components/Button'
import BackButton from '@/components/BackButton'
import ConfirmModal from '@/components/ConfirmModal'

const inputClass =
  'w-full bg-white border border-aq-border rounded-aq-md min-h-tap px-4 text-body text-aq-ink placeholder:text-aq-subtle focus:outline-none focus:border-aq-green transition-colors duration-150'

const labelClass = 'block text-secondary text-aq-muted mb-aq-sm'

function PrefixInput({ id, prefix, value, onChange, placeholder }) {
  return (
    <div className="flex items-stretch border border-aq-border rounded-aq-md overflow-hidden min-h-tap focus-within:border-aq-green transition-colors duration-150 bg-white">
      <span className="px-3 flex items-center text-body text-aq-muted bg-aq-surface border-r border-aq-border shrink-0">{prefix}</span>
      <input id={id} type="number" value={value} onChange={onChange} placeholder={placeholder} className="flex-1 px-3 text-body text-aq-ink bg-white focus:outline-none min-w-0" />
    </div>
  )
}

function ZoneCard({ zone, isEditing, onEdit, onSaveEdit, onCancelEdit, onDelete, canDelete, editState, onEditChange }) {
  if (isEditing && editState) {
    return (
      <div className="bg-aq-green-tint border border-aq-green-tint-border rounded-aq-xl p-aq-lg flex flex-col gap-aq-sm">
        <div>
          <p className={labelClass}>Zone name</p>
          <input
            type="text"
            value={editState.name}
            onChange={(e) => onEditChange('name', e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex gap-aq-sm">
          <div className="flex-1">
            <p className={labelClass}>From (km)</p>
            <input
              type="number"
              value={editState.min_km}
              onChange={(e) => onEditChange('min_km', e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex-1">
            <p className={labelClass}>To (km)</p>
            <input
              type="number"
              value={editState.max_km}
              onChange={(e) => onEditChange('max_km', e.target.value)}
              placeholder="No limit"
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <p className={labelClass}>Fee</p>
          <PrefixInput
            prefix="$"
            value={editState.fee}
            onChange={(e) => onEditChange('fee', e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="flex gap-aq-sm">
          <Button variant="primary" className="flex-1" onClick={onSaveEdit}>
            Save
          </Button>
          <Button variant="secondary" className="flex-1" onClick={onCancelEdit}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  const distanceLabel =
    zone.max_km != null ? `${zone.min_km} to ${zone.max_km} km` : `${zone.min_km}+ km`

  return (
    <div className="bg-aq-surface border border-aq-border rounded-aq-xl p-aq-lg flex items-center justify-between gap-aq-sm">
      <div className="flex-1 min-w-0">
        <p className="text-secondary font-medium text-aq-ink">{zone.name}</p>
        <p className="text-caption text-aq-muted">{distanceLabel}</p>
        <p className="text-secondary font-medium text-aq-green mt-aq-xs">${zone.fee.toFixed(2)}</p>
      </div>
      <div className="flex gap-aq-sm shrink-0">
        <Button variant="secondary" onClick={onEdit}>
          Edit
        </Button>
        {canDelete && (
          <Button variant="destructive" onClick={onDelete}>
            Delete
          </Button>
        )}
      </div>
    </div>
  )
}

export default function CalloutZonesPage() {
  const router = useRouter()
  const { settings, updateSettings, settingsLoaded } = useSettings()

  const [zones, setZones] = useState([])
  const [editingZoneId, setEditingZoneId] = useState(null)
  const [editZoneState, setEditZoneState] = useState(null)
  const [deleteZoneId, setDeleteZoneId] = useState(null)
  const [saveStatus, setSaveStatus] = useState(null)

  useEffect(() => {
    if (!settingsLoaded) return
    setZones(settings.callout_zones || [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded])

  function startEditZone(zone) {
    setEditingZoneId(zone.id)
    setEditZoneState({
      name: zone.name,
      min_km: String(zone.min_km),
      max_km: zone.max_km != null ? String(zone.max_km) : '',
      fee: String(zone.fee),
    })
  }

  function saveEditZone() {
    setZones((prev) =>
      prev.map((z) => {
        if (z.id !== editingZoneId) return z
        return {
          ...z,
          name: editZoneState.name,
          min_km: parseFloat(editZoneState.min_km) || 0,
          max_km: editZoneState.max_km === '' ? null : parseFloat(editZoneState.max_km),
          fee: parseFloat(editZoneState.fee) || 0,
        }
      })
    )
    setEditingZoneId(null)
    setEditZoneState(null)
  }

  function cancelEditZone() {
    setEditingZoneId(null)
    setEditZoneState(null)
  }

  function addZone() {
    const newZone = { id: uuidv4(), name: 'New zone', min_km: 0, max_km: null, fee: 0 }
    setZones((prev) => [...prev, newZone])
    startEditZone(newZone)
  }

  function confirmDeleteZone() {
    setZones((prev) => prev.filter((z) => z.id !== deleteZoneId))
    setDeleteZoneId(null)
  }

  async function handleSave() {
    setSaveStatus('saving')
    updateSettings({ callout_zones: zones })
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus(null), 2500)
  }

  return (
    <>
      <div className="min-h-dvh bg-aq-surface">
        <div className="max-w-[480px] mx-auto px-aq-lg pb-[88px]">

          <div className="flex items-center gap-aq-sm py-aq-xl">
            <BackButton href="/settings" label="Settings" />
            <h1 className="text-page-title font-medium text-aq-ink ml-aq-sm">Callout zones</h1>
          </div>

          <div className="flex flex-col gap-aq-lg">

            <p className="text-secondary text-aq-muted">
              Set zones by distance from your home base. The fee is added to every quote automatically.
            </p>

            <div className="flex flex-col gap-[10px]">
              {zones.map((zone) => (
                <ZoneCard
                  key={zone.id}
                  zone={zone}
                  isEditing={editingZoneId === zone.id}
                  onEdit={() => startEditZone(zone)}
                  onSaveEdit={saveEditZone}
                  onCancelEdit={cancelEditZone}
                  onDelete={() => setDeleteZoneId(zone.id)}
                  canDelete={zones.length > 1}
                  editState={editZoneState}
                  onEditChange={(key, value) =>
                    setEditZoneState((prev) => ({ ...prev, [key]: value }))
                  }
                />
              ))}
            </div>

            <Button variant="secondary" fullWidth onClick={addZone}>
              Add zone
            </Button>

            <Button variant="primary" fullWidth onClick={handleSave} disabled={saveStatus === 'saving'}>
              {saveStatus === 'saving' ? 'Saving...' : 'Save zones'}
            </Button>
            {saveStatus === 'saved' && (
              <p className="text-secondary font-medium text-aq-green text-center">Saved</p>
            )}

          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!deleteZoneId}
        question="Delete this callout zone?"
        confirmLabel="Yes, delete"
        cancelLabel="Keep"
        variant="destructive"
        onConfirm={confirmDeleteZone}
        onCancel={() => setDeleteZoneId(null)}
      />
    </>
  )
}
