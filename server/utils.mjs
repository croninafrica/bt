export function formatSize(sizeBytes) {
  if (!sizeBytes || sizeBytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = sizeBytes;
  for (let i = 0; i < units.length; i++) {
    if (value < 1024 || i === units.length - 1) {
      if (units[i] === "B") return `${Math.round(value)} ${units[i]}`;
      return `${value.toFixed(1)} ${units[i]}`;
    }
    value /= 1024;
  }
  return `${sizeBytes} B`;
}
