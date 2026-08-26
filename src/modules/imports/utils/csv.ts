/**
 * A minimal RFC 4180 CSV reader.
 *
 * It exists because the only machine-readable view of an import's failed rows
 * is the spreadsheet `GET /v1/imports/{jobId}/errors` streams back — there is
 * no JSON endpoint for them (see `ImportStatusController::errors`). Asking for
 * `?format=csv` and parsing it here is what turns that download into the
 * on-screen error table.
 *
 * Handles quoted fields, doubled quotes inside them, embedded newlines, CRLF
 * line endings and a UTF-8 BOM — everything PhpSpreadsheet's CSV writer emits
 * for a `row_data` column full of JSON.
 */
export function parseCsv(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input

  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let hasContent = false

  const endField = (): void => {
    row.push(field)
    field = ''
  }

  const endRow = (): void => {
    endField()
    // Skip the trailing empty line every CSV writer leaves behind.
    if (!(row.length === 1 && row[0] === '' && !hasContent)) rows.push(row)
    row = []
    hasContent = false
  }

  for (let i = 0; i < text.length; i += 1) {
    const char = text.charAt(i)

    if (inQuotes) {
      if (char === '"') {
        if (text.charAt(i + 1) === '"') {
          field += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      hasContent = true
      continue
    }

    if (char === '"') {
      inQuotes = true
      hasContent = true
      continue
    }
    if (char === ',') {
      endField()
      hasContent = true
      continue
    }
    if (char === '\r') {
      // Swallow the LF of a CRLF pair; a lone CR also ends the row.
      if (text.charAt(i + 1) === '\n') i += 1
      endRow()
      continue
    }
    if (char === '\n') {
      endRow()
      continue
    }

    field += char
    hasContent = true
  }

  // Whatever is left after the last delimiter is a final row unless the file
  // ended on a newline.
  if (field !== '' || row.length > 0) endRow()

  return rows
}
