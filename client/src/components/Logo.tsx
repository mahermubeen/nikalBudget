interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = "", size = 32 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Wallet base */}
      <rect
        x="20"
        y="35"
        width="60"
        height="45"
        rx="6"
        fill="hsl(var(--primary))"
        opacity="0.9"
      />

      {/* Wallet flap */}
      <path
        d="M20 41C20 37.6863 22.6863 35 26 35H74C77.3137 35 80 37.6863 80 41V45H20V41Z"
        fill="hsl(var(--primary))"
      />

      {/* Card slot detail */}
      <rect
        x="30"
        y="50"
        width="25"
        height="3"
        rx="1.5"
        fill="white"
        opacity="0.4"
      />

      {/* Upward arrow - represents "Nikal" (extract/take out) */}
      <g transform="translate(55, 20)">
        <circle cx="10" cy="10" r="15" fill="hsl(var(--primary))" />
        <path
          d="M10 15 L10 5 M10 5 L7 8 M10 5 L13 8"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Rupee symbol accent */}
      <text
        x="35"
        y="72"
        fontFamily="monospace"
        fontSize="20"
        fontWeight="bold"
        fill="white"
        opacity="0.9"
      >
        ₨
      </text>
    </svg>
  );
}
