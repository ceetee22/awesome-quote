// Compresses an image File/Blob to a JPEG Blob under 200 KB.
// Canvas re-encoding strips all EXIF data (including GPS) automatically.
export async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl)

      async function encode(maxEdge, quality) {
        const canvas = document.createElement('canvas')
        const { naturalWidth: w, naturalHeight: h } = img
        const scale = Math.min(1, maxEdge / Math.max(w, h))
        canvas.width  = Math.round(w * scale)
        canvas.height = Math.round(h * scale)
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        return new Promise((res) => {
          canvas.toBlob((blob) => res(blob), 'image/jpeg', quality)
        })
      }

      const MAX_BYTES = 200 * 1024

      let blob = await encode(1400, 0.8)
      let q = 0.8

      while (blob.size > MAX_BYTES && q > 0.4) {
        q = parseFloat((q - 0.1).toFixed(1))
        blob = await encode(1400, q)
      }

      if (blob.size > MAX_BYTES) {
        blob = await encode(1000, q)
      }

      resolve(blob)
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image'))
    }
    img.src = objectUrl
  })
}
