/**
 * Hands a fetched blob to the browser as a download.
 *
 * Template and error-sheet endpoints are Sanctum-protected, so the file has to
 * travel through axios (bearer header attached) rather than a plain `<a href>`
 * — this turns the resulting blob back into a save dialog.
 *
 * Module-private on purpose: `src/shared/` is owned by the foundations stream,
 * and a module may not import another module's helpers.
 */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Revoking synchronously can cancel the download in some browsers; one tick
  // is enough for the click to have been handled.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
