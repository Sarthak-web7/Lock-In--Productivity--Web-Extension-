// Turns whatever the user typed ("https://www.YouTube.com/watch?v=1", "reddit.com/r/x")
// into a bare domain ("youtube.com", "reddit.com"), or null if it isn't one.
export function normalizeSite(input) {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  const withScheme = /^[a-z]+:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  let hostname;
  try {
    hostname = new URL(withScheme).hostname;
  } catch {
    return null;
  }

  hostname = hostname.replace(/^www\./, '');
  if (!hostname.includes('.') || hostname.startsWith('.') || hostname.endsWith('.')) return null;
  return hostname;
}

export function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
