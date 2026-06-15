/** Formatting helpers for byte sizes, transfer speeds and durations. */

/** Human-readable byte size, e.g. 1536 -> "1.50 KB". */
export function formatBytes(bytes: number, decimals = 2): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  return `${(bytes / Math.pow(1024, i)).toFixed(decimals)} ${units[i]}`;
}

/**
 * Transfer speed from bytes-per-second to a readable Mbps/Kbps string.
 * Network speed is conventionally reported in bits, so we multiply by 8.
 */
export function formatSpeed(bytesPerSecond: number, decimals = 2): string {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return "0 Mbps";
  const bitsPerSecond = bytesPerSecond * 8;
  if (bitsPerSecond >= 1e9)
    return `${(bitsPerSecond / 1e9).toFixed(decimals)} Gbps`;
  if (bitsPerSecond >= 1e6)
    return `${(bitsPerSecond / 1e6).toFixed(decimals)} Mbps`;
  return `${(bitsPerSecond / 1e3).toFixed(decimals)} Kbps`;
}

/** Bytes-per-second expressed as Mbps number (for charts). */
export function toMbps(bytesPerSecond: number): number {
  return (bytesPerSecond * 8) / 1e6;
}

/** Milliseconds with a sensible precision, e.g. "42.3 ms". */
export function formatMs(ms: number, decimals = 1): string {
  if (!Number.isFinite(ms)) return "—";
  return `${ms.toFixed(decimals)} ms`;
}

/** Seconds with one decimal, e.g. "3.4 s". */
export function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`;
}