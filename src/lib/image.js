// Resizes/compresses an image file in the browser before it's stored as a
// base64 data URL in Firestore — used for profile photos since Firebase
// Storage requires the paid Blaze plan (a card on file) and the user
// explicitly wants to stay on the free Spark plan. Keeping avatars small
// (128px, JPEG) keeps them well within Firestore's 1MB document limit.
export function resizeImageToDataUrl(file, maxSize = 128, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No pudimos leer el archivo.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('No pudimos procesar la imagen.'))
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const width = Math.round(img.width * scale)
        const height = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}
