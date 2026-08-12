/** Rounds a cent ceiling up to a "nice" axis maximum (1/2/5 × 10^n). */
export function niceCeiling(maxValue: number): number {
  if (maxValue <= 0) {
    return 100;
  }
  const magnitude = 10 ** Math.floor(Math.log10(maxValue));
  for (const step of [1, 2, 5, 10]) {
    if (maxValue <= step * magnitude) {
      return step * magnitude;
    }
  }
  return 10 * magnitude;
}
