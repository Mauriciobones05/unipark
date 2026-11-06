import type { Status } from '@/api/types';

/**
 * Cancela em vista lateral: braço fino com faixas refletivas girando sobre o pivô do gabinete,
 * conforme o ângulo COMANDADO do servo (o SG90 não tem realimentação). Lâmpadas = LEDs físicos.
 */
export function GateVisual({ status, dim }: { status: Status; dim?: boolean }) {
  const angle = Math.max(0, Math.min(90, status.servo.angle));
  const { arrival, obstacle } = status.sensors;
  const { red, green } = status.leds;
  const PX = 348, PY = 98;          // pivô
  const TIP = 46;                   // ponta do braço fechado
  const GROUND = 168;

  return (
    <svg viewBox="0 0 420 200" role="img" aria-label={`Cancela ${status.state.toLowerCase()}, braço a ${Math.round(angle)} graus`} className={dim ? 'opacity-40' : undefined}>
      <defs>
        <pattern id="gv-bands" width="36" height="8" patternUnits="userSpaceOnUse">
          <rect width="18" height="8" fill="#dc2626" />
          <rect x="18" width="18" height="8" fill="#ffffff" />
        </pattern>
        <linearGradient id="gv-housing" x1="0" x2="1">
          <stop offset="0" stopColor="#e2e8f0" />
          <stop offset="0.55" stopColor="#f8fafc" />
          <stop offset="1" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>

      {/* via e faixa central */}
      <rect x="0" y={GROUND} width="420" height="32" fill="#64748b" opacity="0.18" />
      <line x1="0" y1={GROUND} x2="420" y2={GROUND} stroke="#64748b" strokeWidth="1" opacity="0.45" />
      <line x1="12" y1="186" x2="408" y2="186" stroke="#94a3b8" strokeWidth="2" strokeDasharray="18 14" opacity="0.6" />

      {/* laços indutivos no piso: chegada e passagem */}
      <g fontSize="10" fill="currentColor" textAnchor="middle">
        <rect x="70" y={GROUND + 4} width="56" height="8" rx="2" fill="none" stroke={arrival ? '#f59e0b' : '#94a3b8'} strokeWidth="2" />
        {arrival && <rect x="70" y={GROUND + 4} width="56" height="8" rx="2" fill="#f59e0b" opacity="0.35" className="animate-pulse" />}
        <text x="98" y={GROUND - 6} opacity="0.7">Chegada</text>
        <rect x="196" y={GROUND + 4} width="56" height="8" rx="2" fill="none" stroke={obstacle ? '#f59e0b' : '#94a3b8'} strokeWidth="2" />
        {obstacle && <rect x="196" y={GROUND + 4} width="56" height="8" rx="2" fill="#f59e0b" opacity="0.35" className="animate-pulse" />}
        <text x="224" y={GROUND - 6} opacity="0.7">Passagem</text>
      </g>

      {/* forquilha de apoio na ponta */}
      <rect x={TIP + 4} y={PY + 6} width="4" height={GROUND - PY - 6} fill="#64748b" />
      <path d={`M ${TIP - 2} ${PY + 6} v -8 M ${TIP + 14} ${PY + 6} v -8 M ${TIP - 2} ${PY + 6} h 16`} stroke="#64748b" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* braço (desenhado antes do gabinete: a raiz some dentro dele) */}
      <g style={{ transformBox: 'view-box', transformOrigin: `${PX}px ${PY}px`, transform: `rotate(${angle}deg)`, transition: 'transform 0.5s linear' }}>
        <rect x={TIP} y={PY - 4} width={PX - TIP + 22} height="8" rx="4" fill="url(#gv-bands)" stroke="#475569" strokeWidth="1" />
        <rect x={PX + 4} y={PY - 6} width="20" height="12" rx="2" fill="#334155" />
      </g>

      {/* gabinete */}
      <rect x="326" y={GROUND - 6} width="54" height="8" rx="2" fill="#475569" />
      <rect x="330" y="76" width="46" height={GROUND - 76 - 4} rx="4" fill="url(#gv-housing)" stroke="#94a3b8" />
      <rect x="330" y="76" width="46" height="8" rx="4" fill="#334155" />
      <rect x="338" y="116" width="20" height="40" rx="3" fill="#0f172a" />
      <circle cx="348" cy="126" r="5.5" fill={red ? '#ef4444' : '#3f0d0d'} />
      <circle cx="348" cy="146" r="5.5" fill={green ? '#22c55e' : '#0b2a17'} />
      {red && <circle cx="348" cy="126" r="9" fill="#ef4444" opacity="0.25" />}
      {green && <circle cx="348" cy="146" r="9" fill="#22c55e" opacity="0.25" />}

      {/* pivô */}
      <circle cx={PX} cy={PY} r="7" fill="#e2e8f0" stroke="#334155" strokeWidth="2" />
      <circle cx={PX} cy={PY} r="2" fill="#334155" />
    </svg>
  );
}
