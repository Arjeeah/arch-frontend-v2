/**
 * Hands a fetched blob to the browser as a download.
 *
 * Every downloadable endpoint in this app (report files, import templates,
 * import error sheets, the audit CSV) is Sanctum-protected, so the file has to
 * travel through axios (bearer header attached) rather than a plain `<a href>`
 * — this turns the resulting blob back into a save dialog.
 *
 * Lives in `src/shared/` because three modules need it: `imports`, `reports`
 * and `audit` each carried their own copy, and the audit copy revoked the
 * object URL synchronously, which cancels the download in some browsers.
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
