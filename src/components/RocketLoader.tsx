
import React from 'react';

const RocketLoader: React.FC<{ text?: string }> = ({ text = "Загрузка системы..." }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-transparent overflow-hidden">
      {/* Космический фон с мерцающими звездами */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i}
            className="absolute bg-zinc-400 dark:bg-white rounded-full animate-pulse"
            style={{
              width: Math.random() * 3 + 'px',
              height: Math.random() * 3 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animationDelay: Math.random() * 2 + 's',
              opacity: Math.random()
            }}
          />
        ))}
      </div>

      <div className="relative w-64 h-80 flex items-center justify-center">
        {/* Анимация ракеты */}
        <div className="rocket-container animate-bounce-slow relative z-10">
          <svg width="80" height="120" viewBox="0 0 80 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="rocket-shake">
            {/* Тело ракеты с градиентом для 3D эффекта */}
            <defs>
              <linearGradient id="rocketBody" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#E30613" />
                <stop offset="50%" stopColor="#ff4d4d" />
                <stop offset="100%" stopColor="#a1040d" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Иллюминатор */}
            <circle cx="40" cy="45" r="8" fill="#e2e8f0" stroke="#475569" strokeWidth="2"/>
            <circle cx="37" cy="42" r="3" fill="white" fillOpacity="0.5"/>

            {/* Корпус */}
            <path d="M40 10C25 40 20 70 20 90H60C60 70 55 40 40 10Z" fill="url(#rocketBody)" />
            <path d="M40 10C40 10 35 40 35 60C35 80 40 90 40 90" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
            
            {/* Крылья/Плавники */}
            <path d="M20 75L5 95V100H20V75Z" fill="#a1040d" />
            <path d="M60 75L75 95V100H60V75Z" fill="#a1040d" />
            <path d="M40 80L30 105H50L40 80Z" fill="#82040c" />

            {/* Огонь двигателя */}
            <g filter="url(#glow)">
              <path className="fire-animate" d="M30 100C30 100 30 120 40 125C50 120 50 100 50 100H30Z" fill="#fbbf24" />
              <path className="fire-animate-inner" d="M35 100C35 100 35 112 40 115C45 112 45 100 45 100H35Z" fill="#f59e0b" />
            </g>
          </svg>
        </div>

        {/* Дымный след (Частицы) */}
        <div className="absolute bottom-20 flex flex-col items-center">
          {[...Array(6)].map((_, i) => (
            <div 
              key={i} 
              className={`smoke-puff smoke-delay-${i} bg-zinc-200 dark:bg-zinc-700/50 rounded-full absolute`}
            />
          ))}
        </div>

        {/* Контур земли */}
        <div className="absolute bottom-10 w-full px-4">
           <div className="h-2 w-full bg-gradient-to-r from-transparent via-zinc-300 dark:via-zinc-800 to-transparent rounded-full shadow-[0_10px_20px_rgba(0,0,0,0.1)]"></div>
        </div>
      </div>

      <div className="mt-8 text-center clay-panel p-3 bg-white/30 dark:bg-zinc-800/30">
        <h2 className="text-xl font-black uppercase tracking-[0.3em] text-zinc-900 dark:text-white animate-pulse">
          {text}
        </h2>
        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase mt-2 tracking-widest">
          Подготавливаем топливо для знаний
        </p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes shake {
          0% { transform: translate(1px, 1px) rotate(0deg); }
          10% { transform: translate(-1px, -2px) rotate(-1deg); }
          20% { transform: translate(-3px, 0px) rotate(1deg); }
          30% { transform: translate(3px, 2px) rotate(0deg); }
          40% { transform: translate(1px, -1px) rotate(1deg); }
          50% { transform: translate(-1px, 2px) rotate(-1deg); }
          60% { transform: translate(-3px, 1px) rotate(0deg); }
          70% { transform: translate(3px, 1px) rotate(-1deg); }
          80% { transform: translate(-1px, -1px) rotate(1deg); }
          90% { transform: translate(1px, 2px) rotate(0deg); }
          100% { transform: translate(1px, -2px) rotate(-1deg); }
        }
        @keyframes smoke {
          0% { transform: translateY(0) scale(0.2); opacity: 0; }
          20% { opacity: 0.8; }
          100% { transform: translateY(120px) scale(2.5); opacity: 0; }
        }
        @keyframes fire {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.3); }
        }
        .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
        .rocket-shake { animation: shake 0.2s infinite; }
        .fire-animate { animation: fire 0.15s infinite; transform-origin: top; }
        .fire-animate-inner { animation: fire 0.1s infinite; transform-origin: top; }
        .smoke-puff {
          width: 30px;
          height: 30px;
          animation: smoke 2s linear infinite;
          opacity: 0;
        }
        .smoke-delay-0 { animation-delay: 0s; left: -10px; }
        .smoke-delay-1 { animation-delay: 0.4s; left: 10px; }
        .smoke-delay-2 { animation-delay: 0.8s; left: -5px; }
        .smoke-delay-3 { animation-delay: 1.2s; left: 5px; }
        .smoke-delay-4 { animation-delay: 1.6s; left: 0px; }
        .smoke-delay-5 { animation-delay: 1.9s; left: -15px; }
      `}} />
    </div>
  );
};

export default RocketLoader;
