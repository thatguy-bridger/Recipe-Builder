// Formats a duration in seconds as a stopwatch-style string: "3:45" under
// an hour, "1:02:34" once it runs an hour or more.
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const ss = String(seconds).padStart(2, "0");
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${ss}`;
  }
  return `${minutes}:${ss}`;
}

// Pulls the first number out of a free-form duration string (matching how
// prep/cook time is entered, e.g. "10-12 min") so it can drive a countdown.
export function parseMinutesText(text: string): number | null {
  const match = text.match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}
