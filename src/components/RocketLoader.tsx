
import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

const STARS = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  top:    Math.round(Math.random() * 100),
  left:   Math.round(Math.random() * 100),
  size:   Math.random() * 2.5 + 0.5,
  delay:  Math.random() * 2.5,
  dur:    Math.random() * 1.5 + 1.5,
}));

const SMOKE_COUNT = 7;

const RocketLoader: React.FC<{ text?: string }> = ({ text = 'Загрузка системы...' }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setProgress(p => {
        if (p >= 95) { clearInterval(id); return p; }
        return p + Math.random() * 4;
      });
    }, 180);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-transparent overflow-hidden">

      {/* Stars */}
      {STARS.map(s => (
        <motion.div
          key={s.id}
          className="absolute rounded-full bg-zinc-400 dark:bg-white pointer-events-none"
          style={{
            top:    `${s.top}%`,
            left:   `${s.left}%`,
            width:  s.size,
            height: s.size,
          }}
          animate={{ opacity: [0.15, 1, 0.15] }}
          transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Rocket */}
      <motion.div
        animate={{ y: [0, -16, 0] }}
        transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity }}
        className="relative z-10 flex flex-col items-center"
      >
        {/* SVG ракеты */}
        <motion.svg
          width="72"
          height="108"
          viewBox="0 0 80 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          animate={{ rotate: [-1, 1, -1] }}
          transition={{ duration: 0.18, repeat: Infinity, ease: 'linear' }}
        >
          <defs>
            <linearGradient id="rocketBody" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#E30613" />
              <stop offset="50%"  stopColor="#ff4d4d" />
              <stop offset="100%" stopColor="#a1040d" />
            </linearGradient>
            <filter id="glowFilter">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="windowGrad" cx="45%" cy="40%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.3" />
            </radialGradient>
          </defs>

          {/* Корпус */}
          <path d="M40 10C25 40 20 70 20 90H60C60 70 55 40 40 10Z" fill="url(#rocketBody)" />
          {/* Блик */}
          <path d="M40 14C36 38 33 62 33 82" stroke="white" strokeOpacity="0.25" strokeWidth="2" strokeLinecap="round" />
          {/* Иллюминатор */}
          <circle cx="40" cy="47" r="9" fill="url(#windowGrad)" stroke="#475569" strokeWidth="1.5" />
          <circle cx="37" cy="44" r="3.5" fill="white" fillOpacity="0.6" />
          {/* Крылья */}
          <path d="M20 74L4 96V100H20V74Z" fill="#a1040d" />
          <path d="M60 74L76 96V100H60V74Z" fill="#a1040d" />
          <path d="M40 80L29 106H51L40 80Z" fill="#82040c" />

          {/* Огонь */}
          <g filter="url(#glowFilter)">
            <motion.path
              d="M30 100C30 100 30 122 40 127C50 122 50 100 50 100H30Z"
              fill="#fbbf24"
              animate={{ scaleY: [1, 1.25, 1] }}
              transition={{ duration: 0.14, repeat: Infinity, ease: 'linear' }}
              style={{ transformOrigin: 'top' }}
            />
            <motion.path
              d="M34 100C34 100 35 114 40 118C45 114 46 100 46 100H34Z"
              fill="#f59e0b"
              animate={{ scaleY: [1, 1.35, 1] }}
              transition={{ duration: 0.1, repeat: Infinity, ease: 'linear' }}
              style={{ transformOrigin: 'top' }}
            />
            <motion.path
              d="M37 100C37 100 38 108 40 111C42 108 43 100 43 100H37Z"
              fill="#fff"
              fillOpacity="0.5"
              animate={{ scaleY: [1, 1.2, 1] }}
              transition={{ duration: 0.08, repeat: Infinity, ease: 'linear' }}
              style={{ transformOrigin: 'top' }}
            />
          </g>
        </motion.svg>

        {/* Дым */}
        <div className="relative flex justify-center mt-[-4px]">
          {Array.from({ length: SMOKE_COUNT }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-zinc-300/60 dark:bg-zinc-700/50"
              style={{
                width:  28 + i * 2,
                height: 28 + i * 2,
                left:   (i % 3 - 1) * 10,
              }}
              animate={{
                y:       [0, 60 + i * 12],
                scale:   [0.2, 1.8 + i * 0.3],
                opacity: [0, 0.6, 0],
              }}
              transition={{
                duration: 1.8,
                delay:    i * 0.28,
                repeat:   Infinity,
                ease:     'easeOut',
              }}
            />
          ))}
        </div>

        {/* Земля */}
        <div className="mt-10 w-64 h-1.5 bg-gradient-to-r from-transparent via-zinc-300 dark:via-zinc-700 to-transparent rounded-full" />
      </motion.div>

      {/* Карточка */}
      <motion.div
        className="mt-8 clay-panel px-8 py-5 text-center max-w-xs w-full mx-4"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-sm font-black uppercase tracking-[0.28em] text-zinc-800 dark:text-zinc-100 mb-1">
          {text}
        </h2>
        <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4">
          Подготавливаем систему
        </p>

        {/* Прогресс-бар */}
        <div className="clay-inset h-2 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-red-400 shadow-red-glow"
            style={{ width: `${progress}%` }}
            transition={{ ease: 'easeOut' }}
          />
        </div>
        <div className="text-[9px] text-zinc-400 font-bold mt-1.5 tabular-nums">
          {Math.round(progress)}%
        </div>
      </motion.div>
    </div>
  );
};

export default RocketLoader;
