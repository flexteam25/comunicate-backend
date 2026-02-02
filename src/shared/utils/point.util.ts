/**
 * Format point/balance values to 2 decimal places for API responses.
 */
export function formatPoints(value: number | string | null | undefined): number {
  if (value == null || value === '') {
    return 0;
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    return 0;
  }
  return parseFloat(num.toFixed(2));
}
