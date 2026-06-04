'use client'

import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { uploadPhoto } from '@/lib/upload-photo'

function XIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

// Reusable photo capture component. Handles compression + upload internally.
// photos: [{ id, url, caption, type }]
// onChange: (photos) => void
// uploadOpts: { jobId, itemId, type }
export default function PhotoCapture({
  photos = [],
  onChange,
  label = 'Photos',
  buttonLabel,
  uploadOpts = {},
  disabled = false,
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const type = uploadOpts.type || 'before'
  const derivedButtonLabel = buttonLabel || `Add ${type} photo`

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setError(null)
    setUploading(true)
    try {
      const url = await uploadPhoto(file, uploadOpts)
      const newPhoto = { id: uuidv4(), url, caption: '', type }
      onChange([...photos, newPhoto])
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  function updateCaption(id, caption) {
    onChange(photos.map((p) => (p.id === id ? { ...p, caption } : p)))
  }

  function removePhoto(id) {
    onChange(photos.filter((p) => p.id !== id))
  }

  return (
    <div>
      <p className="text-body font-medium text-aq-ink mb-aq-md">{label}</p>

      {photos.length > 0 && (
        <div className="flex flex-col gap-aq-sm mb-aq-md">
          {photos.map((photo) => (
            <div key={photo.id}
              className="flex items-start gap-aq-md bg-white border border-aq-border rounded-aq-xl p-aq-md">
              <img
                src={photo.url}
                alt={photo.caption || 'Photo'}
                className="w-16 h-16 object-cover rounded-aq-md shrink-0 bg-aq-surface"
              />
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={photo.caption}
                  onChange={(e) => updateCaption(photo.id, e.target.value)}
                  placeholder="Caption (optional)"
                  className="w-full text-secondary text-aq-ink bg-transparent border-b border-aq-border focus:outline-none focus:border-aq-green transition-colors pb-0.5"
                />
              </div>
              <button
                type="button"
                onClick={() => removePhoto(photo.id)}
                className="min-h-tap min-w-[48px] flex items-center justify-center text-aq-error rounded-aq-md transition-colors shrink-0"
                aria-label="Remove photo"
              >
                <XIcon />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-secondary text-aq-error mb-aq-sm">{error}</p>
      )}

      <label
        className={`flex items-center justify-center gap-aq-sm w-full min-h-tap bg-white border-2 border-dashed border-aq-border rounded-aq-xl text-body font-medium text-aq-muted transition-colors duration-150 cursor-pointer ${
          !uploading && !disabled ? 'hover:border-aq-green hover:text-aq-green' : 'opacity-50 cursor-not-allowed'
        }`}
        style={{ padding: '14px 16px' }}
      >
        <CameraIcon />
        <span>{uploading ? 'Uploading...' : derivedButtonLabel}</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          disabled={uploading || disabled}
          onChange={handleFile}
        />
      </label>
    </div>
  )
}
