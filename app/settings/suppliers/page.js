'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  setDefaultSupplier,
} from '@/lib/db'
import Button from '@/components/Button'
import BackButton from '@/components/BackButton'
import ConfirmModal from '@/components/ConfirmModal'

const inputClass =
  'w-full bg-white border border-aq-border rounded-aq-md min-h-tap px-4 text-body text-aq-ink placeholder:text-aq-subtle focus:outline-none focus:border-aq-green transition-colors duration-150'

const labelClass = 'block text-secondary text-aq-muted mb-aq-sm'

const EMPTY_SUPPLIER = { name: '', email: '', phone: '', contact_person: '', notes: '' }

export default function SuppliersPage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editState, setEditState] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addState, setAddState] = useState(EMPTY_SUPPLIER)
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    getSuppliers().then((data) => { setSuppliers(data); setLoading(false) })
  }, [])

  function startEdit(supplier) {
    setEditingId(supplier.id)
    setEditState({
      name: supplier.name || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      contact_person: supplier.contact_person || '',
      notes: supplier.notes || '',
    })
  }

  async function saveEdit() {
    await updateSupplier(editingId, editState)
    setSuppliers((prev) => prev.map((s) => s.id === editingId ? { ...s, ...editState } : s))
    setEditingId(null)
    setEditState(null)
  }

  async function handleSetDefault(id) {
    await setDefaultSupplier(id)
    setSuppliers((prev) => prev.map((s) => ({ ...s, is_default: s.id === id })))
  }

  async function confirmDelete() {
    await deleteSupplier(deleteId)
    setSuppliers((prev) => prev.filter((s) => s.id !== deleteId))
    setDeleteId(null)
  }

  async function handleAdd() {
    if (!addState.name.trim()) return
    await createSupplier({ ...addState })
    const updated = await getSuppliers()
    setSuppliers(updated)
    setAddOpen(false)
    setAddState(EMPTY_SUPPLIER)
  }

  const supplierFields = (state, onChange) => (
    <div className="flex flex-col gap-aq-sm">
      <div>
        <p className={labelClass}>Name</p>
        <input type="text" value={state.name} onChange={(e) => onChange('name', e.target.value)} className={inputClass} />
      </div>
      <div>
        <p className={labelClass}>Email</p>
        <input type="email" value={state.email} onChange={(e) => onChange('email', e.target.value)} placeholder="orders@supplier.co.nz" className={inputClass} />
      </div>
      <div>
        <p className={labelClass}>Phone</p>
        <input type="tel" value={state.phone} onChange={(e) => onChange('phone', e.target.value)} placeholder="e.g. 09 123 4567" className={inputClass} />
      </div>
      <div>
        <p className={labelClass}>Contact person</p>
        <input type="text" value={state.contact_person} onChange={(e) => onChange('contact_person', e.target.value)} className={inputClass} />
      </div>
      <div>
        <p className={labelClass}>Notes</p>
        <input type="text" value={state.notes} onChange={(e) => onChange('notes', e.target.value)} className={inputClass} />
      </div>
    </div>
  )

  return (
    <>
      <div className="min-h-dvh bg-aq-surface">
        <div className="max-w-[480px] mx-auto px-aq-lg pb-[88px]">

          <div className="flex items-center gap-aq-sm py-aq-xl">
            <BackButton href="/settings" label="Settings" />
            <h1 className="text-page-title font-medium text-aq-ink ml-aq-sm">Suppliers</h1>
          </div>

          {loading ? (
            <p className="text-secondary text-aq-muted">Loading suppliers...</p>
          ) : (
            <div className="flex flex-col gap-[10px]">
              {suppliers.map((supplier) => (
                <div key={supplier.id} className={`bg-aq-surface border rounded-aq-xl p-aq-lg ${editingId === supplier.id ? 'border-aq-green bg-aq-green-tint' : 'border-aq-border'}`}>
                  {editingId === supplier.id && editState ? (
                    <>
                      {supplierFields(editState, (key, val) => setEditState((prev) => ({ ...prev, [key]: val })))}
                      <div className="flex gap-aq-sm mt-aq-md">
                        <Button variant="primary" className="flex-1" onClick={saveEdit}>Save</Button>
                        <Button variant="secondary" className="flex-1" onClick={() => { setEditingId(null); setEditState(null) }}>Cancel</Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-start justify-between gap-aq-sm">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-aq-sm mb-aq-xs">
                          <p className="text-secondary font-medium text-aq-ink">{supplier.name}</p>
                          {supplier.is_default && (
                            <span className="text-caption font-medium text-aq-green bg-aq-green-tint border border-aq-green-tint-border px-2 py-0.5 rounded-aq-sm">Default</span>
                          )}
                        </div>
                        {supplier.email && <p className="text-caption text-aq-muted">{supplier.email}</p>}
                        {supplier.phone && <p className="text-caption text-aq-muted">{supplier.phone}</p>}
                      </div>
                      <div className="flex flex-col gap-aq-xs shrink-0">
                        <Button variant="secondary" onClick={() => startEdit(supplier)}>Edit</Button>
                        {!supplier.is_default && (
                          <Button variant="secondary" onClick={() => handleSetDefault(supplier.id)}>Set default</Button>
                        )}
                        {!supplier.is_default && (
                          <Button variant="destructive" onClick={() => setDeleteId(supplier.id)}>Remove</Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {addOpen ? (
                <div className="bg-aq-green-tint border border-aq-green-tint-border rounded-aq-xl p-aq-lg">
                  {supplierFields(addState, (key, val) => setAddState((prev) => ({ ...prev, [key]: val })))}
                  <div className="flex gap-aq-sm mt-aq-md">
                    <Button variant="primary" className="flex-1" onClick={handleAdd} disabled={!addState.name.trim()}>Add</Button>
                    <Button variant="secondary" className="flex-1" onClick={() => { setAddOpen(false); setAddState(EMPTY_SUPPLIER) }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button variant="secondary" fullWidth onClick={() => setAddOpen(true)}>Add supplier</Button>
              )}
            </div>
          )}

        </div>
      </div>

      <ConfirmModal
        open={!!deleteId}
        question="Remove this supplier?"
        confirmLabel="Yes, remove"
        cancelLabel="Keep"
        variant="destructive"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </>
  )
}
