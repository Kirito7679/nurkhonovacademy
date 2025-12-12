export default function Logo({ className = "w-8 h-8", variant = "icon" }: { className?: string; variant?: "icon" | "full" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="nurkhonovGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="50%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
      </defs>
      
      {variant === "icon" ? (
        <>
          {/* Стилизованная буква N - сильная, геометрическая */}
          <path
            d="M8 8 L8 42 M8 8 L32 42 M32 8 L32 42"
            stroke="url(#nurkhonovGradient)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Акцентная линия под N */}
          <line
            x1="8"
            y1="45"
            x2="32"
            y2="45"
            stroke="url(#nurkhonovGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.8"
          />
        </>
      ) : (
        <>
          {/* Полный текст "Nurkhonov_" */}
          <text
            x="0"
            y="32"
            fontSize="28"
            fontWeight="800"
            fill="url(#nurkhonovGradient)"
            fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
            letterSpacing="1"
          >
            Nurkhonov_
          </text>
          {/* Подчеркивание */}
          <line
            x1="0"
            y1="38"
            x2="180"
            y2="38"
            stroke="url(#nurkhonovGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}




