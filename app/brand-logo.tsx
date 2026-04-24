type BrandLogoProps = {
  className?: string;
  compact?: boolean;
};

export default function BrandLogo({
  className = "",
  compact = false,
}: BrandLogoProps) {
  if (compact) {
    return (
      <div className={`flex items-center gap-3 ${className}`.trim()}>
        <svg
          viewBox="0 0 140 140"
          className="h-11 w-11 shrink-0 text-black"
          aria-hidden="true"
        >
          <path
            d="M20 54 L70 16 L120 54"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
          <rect x="32" y="70" width="10" height="10" fill="currentColor" />
          <rect x="46" y="70" width="10" height="10" fill="currentColor" />
          <rect x="32" y="84" width="10" height="10" fill="currentColor" />
          <rect x="46" y="84" width="10" height="10" fill="currentColor" />
          <text
            x="74"
            y="98"
            textAnchor="middle"
            fontFamily="Georgia, serif"
            fontSize="76"
            fontWeight="700"
            fill="currentColor"
          >
            L
          </text>
        </svg>
        <div className="leading-none">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-900">
            Lex Ventured
          </div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
            & Co.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-col items-center ${className}`.trim()}>
      <svg
        viewBox="0 0 520 620"
        className="w-full max-w-[260px] text-black"
        aria-label="Lex Ventured and Company logo"
        role="img"
      >
        <path
          d="M115 135 L260 28 L405 135"
          fill="none"
          stroke="currentColor"
          strokeWidth="22"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        <rect x="122" y="210" width="28" height="28" fill="currentColor" />
        <rect x="162" y="210" width="28" height="28" fill="currentColor" />
        <rect x="122" y="250" width="28" height="28" fill="currentColor" />
        <rect x="162" y="250" width="28" height="28" fill="currentColor" />
        <text
          x="276"
          y="336"
          textAnchor="middle"
          fontFamily="Georgia, serif"
          fontSize="220"
          fontWeight="700"
          fill="currentColor"
        >
          L
        </text>
        <text
          x="260"
          y="428"
          textAnchor="middle"
          fontFamily="var(--font-geist-sans), Arial, sans-serif"
          fontSize="104"
          fontWeight="700"
          letterSpacing="8"
          fill="currentColor"
        >
          LEX
        </text>
        <text
          x="260"
          y="525"
          textAnchor="middle"
          fontFamily="var(--font-geist-sans), Arial, sans-serif"
          fontSize="74"
          fontWeight="700"
          letterSpacing="6"
          fill="currentColor"
        >
          VENTURED
        </text>
        <text
          x="260"
          y="602"
          textAnchor="middle"
          fontFamily="var(--font-geist-sans), Arial, sans-serif"
          fontSize="72"
          fontWeight="700"
          fill="currentColor"
        >
          &amp; Co.
        </text>
      </svg>
    </div>
  );
}
