import { v4 as uuidv4 } from 'uuid'
import { createSupabaseBrowserClient } from './supabase-browser'
import { compressImage } from './compress-image'

// Uploads a photo File to Supabase storage after aggressive compression.
// Returns the public URL of the stored image.
// Path: job-photos/{jobId}/{itemId}/{type}-{uuid}.jpg (itemId optional)
export async function uploadPhoto(file, { jobId, itemId, type = 'before' }) {
  const compressed = await compressImage(file)

  const supabase = createSupabaseBrowserClient()
  if (!supabase) {
    // Dev fallback: return a local object URL (not persisted)
    return URL.createObjectURL(compressed)
  }

  const photoId = uuidv4()
  const path = itemId
    ? `${jobId}/${itemId}/${type}-${photoId}.jpg`
    : `${jobId}/${type}-${photoId}.jpg`

  const { error } = await supabase.storage
    .from('job-photos')
    .upload(path, compressed, { contentType: 'image/jpeg', upsert: false })

  if (error) throw error

  const { data } = supabase.storage.from('job-photos').getPublicUrl(path)
  return data.publicUrl
}
