import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[#D8DEE4] bg-white py-6 mt-8">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p className="text-xs text-[#4A5866] leading-relaxed max-w-2xl mx-auto">
          Demo tool using synthetic data only. All recommendations are advisory — a compliance officer makes the final filing or reversal decision.
        </p>
        <p className="text-[11px] text-[#4A5866]/80 mt-2 font-medium">
          Built by Meghna Murali · IIM Kozhikode, PGP-BL
        </p>
      </div>
    </footer>
  );
};
