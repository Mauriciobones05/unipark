import type { Status } from '@/api/types';

/**
 * Desenho da cancela: o braço gira conforme o ângulo comandado do servo e os LEDs
 * espelham os LEDs físicos. O ângulo é o COMANDADO (o SG90 não tem realimentação).
 */
export function GateVisual({ status, dim }: { status: Status; dim?: boolean }) {
  const angle = Math.max(0, Math.min(90, status.servo.angle));
  const { arrival, obstacle } = status.sensors;
  return (
    <svg viewBox="0 0 360 190" role="img" aria-label={`Cancela ${status.state.toLowerCase()}, braço a ${Math.round(angle)} graus`} className={dim ? 'opacity-40' : undefined}>
      <defs>
        <pattern id="stripes" width="24" height="12" patternUnits="userSpaceOnUse" patternTransform="skewX(-30)">
          <rect width="12" height="12" fill="#ffffff" />
          <rect x="12" width="12" height="12" fill="#0081ef" />
        </pattern>
        <linearGradient id="post" x1="0" x2="1">
          <stop offset="0" stopColor="#033e9c" />
          <stop offset="1" stopColor="#0460c9" />
        </linearGradient>
      </defs>

      {/* via */}
      <rect x="0" y="150" width="360" height="40" rx="6" fill="#64748b" opacity="0.25" />
      <g stroke="#94a3b8" strokeWidth="3" strokeDasharray="14 12" opacity="0.7">
        <line x1="10" y1="170" x2="350" y2="170" />
      </g>

      {/* sensor de chegada (esquerda) e de passagem (sob o braço) */}
      <g>
        <circle cx="24" cy="132" r="7" fill={arrival ? '#f59e0b' : '#cbd5e1'} className={arrival ? 'animate-pulse' : undefined} />
        <text x="24" y="116" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.65">chegada</text>
        <circle cx="190" cy="132" r="7" fill={obstacle ? '#f59e0b' : '#cbd5e1'} className={obstacle ? 'animate-pulse' : undefined} />
        <text x="190" y="116" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.65">passagem</text>
      </g>

      {/* poste */}
      <rect x="296" y="86" width="48" height="74" rx="8" fill="url(#post)" />
      <circle cx="320" cy="104" r="6" fill={status.leds.red ? '#ef4444' : '#7f1d1d'} />
      <circle cx="320" cy="124" r="6" fill={status.leds.green ? '#22c55e' : '#14532d'} />

      {/* braço (pivô no poste, gira para cima) */}
      <g
        style={{
          transformBox: 'view-box',
          transformOrigin: '300px 100px',
          transform: `rotate(${angle}deg)`,
          transition: 'transform 0.5s linear',
        }}
      >
        <rect x="90" y="94" width="214" height="12" rx="6" fill="url(#stripes)" stroke="#033e9c" strokeWidth="1.5" />
      </g>
      <circle cx="300" cy="100" r="7" fill="#052d74" stroke="#ffffff" strokeWidth="2" />
    </svg>
  );
}
