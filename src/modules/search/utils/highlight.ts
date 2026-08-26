/** One run of snippet text, flagged when it matched a query term. */
export interface HighlightPart {
  text: string
  match: boolean
}

const REGEX_SPECIALS = /[.*+?^${}()|[\]\\]/g

function escapeRegExp(value: string): string {
  return value.replace(REGEX_SPECIALS, '\\$&')
}

/**
 * Splits a snippet into plain and matching runs so the template can wrap the
 * matches in a `<span>`.
 *
 * Deliberately returns data rather than an HTML string: the snippet is OCR text
 * from an uploaded document, so it must never reach `v-html`.
 *
 * Only whole query terms of two characters or more are marked, longest first,
 * so "رقم 1625" highlights "1625" as one run instead of four digits.
 */
export function highlightParts(content: string, query: string): HighlightPart[] {
  const terms = query
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2)
    .sort((a, b) => b.length - a.length)

  if (content.length === 0 || terms.length === 0) {
    return [{ text: content, match: false }]
  }

  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi')
  const parts: HighlightPart[] = []
  let cursor = 0

  for (const match of content.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > cursor) parts.push({ text: content.slice(cursor, index), match: false })
    parts.push({ text: match[0], match: true })
    cursor = index + match[0].length
  }

  if (cursor < content.length) parts.push({ text: content.slice(cursor), match: false })

  return parts
}
