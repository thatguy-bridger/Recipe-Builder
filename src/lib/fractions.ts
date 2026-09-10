// Cooking amounts are entered and displayed as fractions/whole numbers, never
// decimals — "1/2", "1 1/2", "2" — since nobody measures 0.5 cups by eye.

const DISPLAY_DENOMINATORS = [2, 3, 4, 8];

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Parses "1/2", "1 1/2", "2", or a plain decimal into a number. */
export function parseFraction(input: string): number | null {
  const s = input.trim();
  if (!s) return null;

  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const [, whole, num, den] = mixed;
    if (Number(den) === 0) return null;
    return Number(whole) + Number(num) / Number(den);
  }

  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) {
    const [, num, den] = frac;
    if (Number(den) === 0) return null;
    return Number(num) / Number(den);
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Formats a number as a whole number and/or simple fraction for display. */
export function formatFraction(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "";
  const whole = Math.floor(n + 1e-9);
  const frac = n - whole;

  if (frac < 0.02) return String(whole);

  let best = { num: 1, den: 1, err: Infinity };
  for (const den of DISPLAY_DENOMINATORS) {
    const num = Math.round(frac * den);
    if (num === 0) continue;
    const err = Math.abs(frac - num / den);
    if (err < best.err) best = { num, den, err };
  }

  if (best.num === best.den) return String(whole + 1);

  const g = gcd(best.num, best.den);
  const fracStr = `${best.num / g}/${best.den / g}`;
  return whole > 0 ? `${whole} ${fracStr}` : fracStr;
}
