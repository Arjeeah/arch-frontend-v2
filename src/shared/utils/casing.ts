/**
 * Key-casing conversion for the API boundary.
 *
 * Convention: snake_case on the wire, camelCase inside the app.
 *
 * Conversion is NOT done globally in the axios interceptors. Each module's
 * `api/*.ts` owns the boundary instead, with typed `*Resource` interfaces and
 * explicit `fromResource` / `toPayload` mappers — the pattern `gen:module`
 * emits and every module follows. That is deliberate: the mappers are the only
 * place that can also narrow a wire string onto a union (`toRole`, `toStatus`),
 * drop fields the UI must not send, and document per-endpoint quirks. A blind
 * global transform would erase all of that and silently rename keys the
 * backend expects verbatim.
 *
 * These helpers are therefore a tool for one-off conversions, not the app's
 * casing policy. Both walk plain objects and arrays recursively; values that
 * are not plain objects (Date, File, Blob, FormData, Map, class instances, …)
 * pass through untouched so upload payloads survive the round trip.
 */

/** `created_at` → `createdAt` at the type level. */
export type SnakeToCamel<S extends string> = S extends `${infer Head}_${infer Tail}`
  ? `${Head}${Capitalize<SnakeToCamel<Tail>>}`
  : S

/** `createdAt` → `created_at` at the type level. */
export type CamelToSnake<S extends string> = S extends `${infer Head}${infer Tail}`
  ? Head extends Uppercase<Head>
    ? Head extends Lowercase<Head>
      ? `${Head}${CamelToSnake<Tail>}`
      : `_${Lowercase<Head>}${CamelToSnake<Tail>}`
    : `${Head}${CamelToSnake<Tail>}`
  : S

/** Types that are forwarded as-is instead of being walked. */
type Opaque = Date | File | Blob | FormData | RegExp | ((...args: never[]) => unknown)

export type KeysToCamel<T> = T extends readonly (infer Item)[]
  ? KeysToCamel<Item>[]
  : T extends Opaque
    ? T
    : T extends object
      ? { [K in keyof T as K extends string ? SnakeToCamel<K> : K]: KeysToCamel<T[K]> }
      : T

export type KeysToSnake<T> = T extends readonly (infer Item)[]
  ? KeysToSnake<Item>[]
  : T extends Opaque
    ? T
    : T extends object
      ? { [K in keyof T as K extends string ? CamelToSnake<K> : K]: KeysToSnake<T[K]> }
      : T

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  const proto: unknown = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/** `created_at` → `createdAt`. Leading underscores and digits are preserved. */
export function camelCaseKey(key: string): string {
  return key.replace(/_+([a-z0-9])/g, (_match, char: string) => char.toUpperCase())
}

/** `createdAt` → `created_at`. Already-snake keys are returned unchanged. */
export function snakeCaseKey(key: string): string {
  return key
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
}

function convert(value: unknown, mapKey: (key: string) => string): unknown {
  if (Array.isArray(value)) return value.map((item) => convert(item, mapKey))
  if (!isPlainObject(value)) return value

  const result: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    result[mapKey(key)] = convert(item, mapKey)
  }
  return result
}

/** Deep snake_case → camelCase conversion of every key in an object/array tree. */
export function keysToCamel<T>(input: T): KeysToCamel<T> {
  return convert(input, camelCaseKey) as KeysToCamel<T>
}

/** Deep camelCase → snake_case conversion of every key in an object/array tree. */
export function keysToSnake<T>(input: T): KeysToSnake<T> {
  return convert(input, snakeCaseKey) as KeysToSnake<T>
}
