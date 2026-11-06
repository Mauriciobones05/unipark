/** Junta classes ignorando valores falsos (substitui o clsx, sem dependência). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
