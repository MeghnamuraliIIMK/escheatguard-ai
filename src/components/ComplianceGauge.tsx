import React from 'react';

interface ComplianceGaugeProps {
  score: number; // 0 to 100
}

export const ComplianceGauge: React.FC<ComplianceGaugeProps> = ({ score }) => {
  // Clamp score
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));

  // Needle angle: 0 score = -90deg, 50 score = 0deg, 100 score = +90deg
  const needleAngle = -90 + (safeScore / 100) * 180;

  // Semantic color for needle and score:
  // Green 70-100 / Amber 40-69 / Red 0-39
  let semanticColor = '#C43D3D'; // Red
  let semanticLabel = 'Deficient (Non-compliant)';
  let bgBadge = 'bg-[#FBEAEA] text-[#C43D3D] border-[#C43D3D]/30';

  if (safeScore >= 70) {
    semanticColor = '#1D9E75'; // Green
    semanticLabel = 'Compliant (Safe harbor met)';
    bgBadge = 'bg-[#E1F5EE] text-[#1D9E75] border-[#1D9E75]/30';
  } else if (safeScore >= 40) {
    semanticColor = '#BA7517'; // Amber
    semanticLabel = 'Partial Diligence (Hold suggested)';
    bgBadge = 'bg-[#FAEEDA] text-[#BA7517] border-[#BA7517]/30';
  }

  // SVG parameters for semicircular arc
  // Center (100, 85), radius = 65, strokeWidth = 14
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-28 flex items-center justify-center">
        <svg viewBox="0 0 200 110" className="w-full h-full overflow-visible">
          <defs>
            {/* Soft drop shadow for needle hub */}
            <filter id="hubShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Background Track Arc (Grey) */}
          <path
            d="M 25 95 A 75 75 0 0 1 175 95"
            fill="none"
            stroke="#E5E9EE"
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* Section 1: Red 0 - 39 (0 to 39% of 180 deg) */}
          <path
            d="M 25 95 A 75 75 0 0 1 65 37"
            fill="none"
            stroke="#C43D3D"
            strokeWidth="16"
            strokeLinecap="round"
            className="opacity-90"
          />

          {/* Section 2: Amber 40 - 69 */}
          <path
            d="M 67 35 A 75 75 0 0 1 133 35"
            fill="none"
            stroke="#BA7517"
            strokeWidth="16"
            className="opacity-90"
          />

          {/* Section 3: Green 70 - 100 */}
          <path
            d="M 135 37 A 75 75 0 0 1 175 95"
            fill="none"
            stroke="#1D9E75"
            strokeWidth="16"
            strokeLinecap="round"
            className="opacity-90"
          />

          {/* Scale tick labels */}
          <text x="18" y="108" fill="#4A5866" fontSize="11" fontWeight="600" textAnchor="middle">
            0
          </text>
          <text x="65" y="24" fill="#4A5866" fontSize="10" fontWeight="600" textAnchor="middle">
            40
          </text>
          <text x="135" y="24" fill="#4A5866" fontSize="10" fontWeight="600" textAnchor="middle">
            70
          </text>
          <text x="182" y="108" fill="#4A5866" fontSize="11" fontWeight="600" textAnchor="middle">
            100
          </text>

          {/* Needle Group */}
          <g
            style={{
              transform: `rotate(${needleAngle}deg)`,
              transformOrigin: '100px 95px',
              transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            {/* Needle shape */}
            <polygon
              points="97,95 100,22 103,95"
              fill={semanticColor}
              stroke="#FFFFFF"
              strokeWidth="0.8"
            />
            {/* Counterbalance base */}
            <circle cx="100" cy="95" r="9" fill={semanticColor} filter="url(#hubShadow)" />
            <circle cx="100" cy="95" r="4" fill="#FFFFFF" />
          </g>
        </svg>
      </div>

      {/* Numerical score and label */}
      <div className="text-center mt-1">
        <div className="flex items-baseline justify-center space-x-1">
          <span className="text-2xl font-black font-sans tracking-tight" style={{ color: semanticColor }}>
            {safeScore}
          </span>
          <span className="text-xs text-[#4A5866] font-medium">/ 100</span>
        </div>
        <p className="text-xs font-semibold text-[#18242F] mt-0.5">
          Due diligence completeness
        </p>
        <span className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${bgBadge}`}>
          {semanticLabel}
        </span>
      </div>
    </div>
  );
};
