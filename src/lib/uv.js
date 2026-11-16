// Global UV Index categories: https://www.epa.gov/sunsafety/uv-index-scale-0
export function uvSeverity(value) {
  if (!Number.isFinite(value) || value < 0) return null;
  if (value < 3) return 'Low';
  if (value < 6) return 'Moderate';
  if (value < 8) return 'High';
  if (value < 11) return 'Very high';
  return 'Extreme';
}
