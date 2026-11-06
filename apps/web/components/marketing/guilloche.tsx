/**
 * Guilloche security pattern, the fine interlaced lines printed on passports and banknotes.
 * Generated as SVG paths (no image assets). Purely decorative.
 */
function rosette(cx: number, cy: number, r: number, amp: number, petals: number, phase: number) {
  const points: string[] = [];
  for (let i = 0; i <= 360; i += 2) {
    const t = (i * Math.PI) / 180;
    const rr = r + amp * Math.sin(petals * t + phase);
    points.push(`${(cx + rr * Math.cos(t)).toFixed(1)},${(cy + rr * Math.sin(t)).toFixed(1)}`);
  }
  return `M${points.join("L")}Z`;
}

function wave(y: number, amp: number, freq: number, phase: number, width: number) {
  const points: string[] = [];
  for (let x = 0; x <= width; x += 6) points.push(`${x},${(y + amp * Math.sin((x / width) * Math.PI * 2 * freq + phase)).toFixed(1)}`);
  return `M${points.join("L")}`;
}

export function GuillocheRosette({ className, color = "currentColor" }: { className?: string; color?: string }) {
  const rings = Array.from({ length: 9 }, (_, i) => rosette(100, 100, 30 + i * 7.5, 5 + (i % 3) * 1.5, 12 + (i % 2) * 6, i * 0.7));
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      {rings.map((d, i) => <path key={i} d={d} fill="none" stroke={color} strokeWidth="0.5" />)}
    </svg>
  );
}

export function GuillocheWaves({ className, color = "currentColor" }: { className?: string; color?: string }) {
  const lines = Array.from({ length: 14 }, (_, i) => wave(10 + i * 6, 7, 3, i * 0.45, 400));
  return (
    <svg viewBox="0 0 400 100" preserveAspectRatio="none" className={className} aria-hidden>
      {lines.map((d, i) => <path key={i} d={d} fill="none" stroke={color} strokeWidth="0.5" />)}
    </svg>
  );
}
