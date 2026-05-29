/**
 * Clamp terminal dimension to minimum of 2 and floor to integer.
 */
export function normalizeDimension(value: number): number {
  return Math.max(2, Math.floor(value));
}
