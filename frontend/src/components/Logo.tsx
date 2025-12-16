export default function Logo({ className = "w-auto h-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 250 50"
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
      
      {/* Полный текст "Nurkhonov_Academy" */}
      <text
        x="0"
        y="32"
        fontSize="24"
        fontWeight="800"
        fill="url(#nurkhonovGradient)"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        letterSpacing="0.5"
      >
        Nurkhonov_Academy
      </text>
      {/* Подчеркивание */}
      <line
        x1="0"
        y1="38"
        x2="240"
        y2="38"
        stroke="url(#nurkhonovGradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}








