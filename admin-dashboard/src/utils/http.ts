/**
 * Extract a list from any of the API's response envelope shapes.
 *
 * The backend is not consistent: some routes return a bare array, some
 * `{ data: [...] }`, and most `{ success, data: [...] }`. A page that assumed
 * one shape crashed on `.map`/`.filter` when it received another (e.g. `leads`
 * became the whole `{ success, data }` object, and `(leads || []).filter` threw
 * because the object is truthy but has no `.filter`).
 *
 * Pass the raw axios response (or an already-unwrapped body) and always get an
 * array back — never a throw. This is the single place list-shape tolerance
 * lives, so pages never have to trust the API shape.
 */
export function asList<T = any>(res: any): T[] {
  const body = res?.data ?? res
  if (Array.isArray(body)) return body
  if (Array.isArray(body?.data)) return body.data
  return []
}
