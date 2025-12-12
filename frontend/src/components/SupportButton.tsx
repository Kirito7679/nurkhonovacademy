export default function SupportButton() {
  const telegramUrl = 'https://t.me/Nurkhonov_Dilmurod';

  return (
    <a
      href={telegramUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 group"
      aria-label="Связаться с поддержкой в Telegram"
    >
      <div className="relative">
        {/* Button */}
        <div className="relative flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4 bg-gradient-to-r from-accent-600 to-accent-700 rounded-full shadow-glow hover:shadow-glow-lg transition-all duration-300 hover:scale-105 md:hover:scale-110 border-2 border-accent-500/50">
          {/* Telegram Icon SVG */}
          <div className="relative">
            <svg
              className="w-5 h-5 md:w-6 md:h-6 text-white relative z-10"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              style={{ 
                filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))',
                stroke: 'rgba(0,0,0,0.1)',
                strokeWidth: '0.5'
              }}
            >
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.169 1.858-.896 6.375-1.262 8.453-.151.844-.448 1.125-.736 1.152-.641.052-1.127-.423-1.748-.827-.969-.64-1.518-1.038-2.458-1.662-1.08-.72-.38-1.116.236-1.763.163-.168 2.991-2.745 3.043-2.978.006-.032.012-.15-.056-.212-.068-.062-.17-.041-.244-.024-.105.023-1.793 1.14-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.44-.752-.243-1.349-.374-1.297-.789.027-.216.325-.437.895-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.14.122.099.155.23.171.325.016.095.036.312.02.48z"/>
            </svg>
            {/* Дополнительная тень для лучшей видимости */}
            <div className="absolute inset-0 bg-white/20 blur-sm rounded-full"></div>
          </div>
          
          <span className="text-white font-bold text-xs md:text-sm hidden md:block group-hover:block transition-all drop-shadow-md">
            Поддержка
          </span>
          
          {/* Pulse animation dot */}
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent-500 rounded-full animate-ping"></span>
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent-500 rounded-full"></span>
        </div>
        
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-primary-800 text-white border-2 border-primary-600 rounded-lg shadow-glow opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
          <span className="text-white text-xs font-semibold">@Nurkhonov_Dilmurod</span>
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-primary-800"></div>
        </div>
      </div>
    </a>
  );
}

