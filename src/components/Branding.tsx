
import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  collapsed?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', collapsed = false, orientation = 'horizontal' }) => {
  const styles = {
    sm: {
      text: 'text-[10px]',
      hubBox: 'px-1.5 py-0.5 rounded',
      hubText: 'text-sm',
      gap: 'gap-1.5',
      img: 'h-10' 
    },
    md: {
      text: 'text-xs',
      hubBox: 'px-2.5 py-1 rounded-lg',
      hubText: 'text-xl',
      gap: 'gap-2.5',
      img: 'h-16' 
    },
    lg: {
      text: 'text-3xl',
      hubBox: 'px-6 py-2.5 rounded-2xl',
      hubText: 'text-6xl',
      gap: 'gap-5',
      img: 'h-64' // Значительно увеличен размер для страницы логина
    }
  };

  const currentStyle = styles[size];

  // Свернутое состояние (OCH) - остается текстовым для компактности
  if (collapsed) {
    return (
      <div className={`flex items-center justify-center font-black tracking-tighter ${className}`}>
        <span className="text-zinc-900 dark:text-white text-xl">OC</span>
        <div className="bg-primary text-white px-1 py-0.5 rounded ml-0.5 shadow-red-glow">
          <span className="text-sm block leading-none">H</span>
        </div>
      </div>
    );
  }

  // Полное состояние
  return (
    <div className={`flex ${orientation === 'vertical' ? 'flex-col justify-center' : 'flex-row'} items-center ${className}`}>
      
      {/* Изображение нового логотипа */}
      <img 
        src="/pict.png" 
        alt="Logo" 
        className={`${currentStyle.img} w-auto object-contain ${orientation === 'vertical' ? 'mb-8' : 'mr-5'} transition-all duration-500`}
      />

      {/* Текстовая часть */}
      <div className={`flex items-center ${currentStyle.gap}`}>
        {/* Левая часть: Optima Control в 2 строки */}
        <div className={`flex flex-col items-end font-black uppercase tracking-tight leading-[0.85] text-zinc-900 dark:text-white ${currentStyle.text}`}>
          <span>Optima</span>
          <span>Control</span>
        </div>

        {/* Правая часть: HUB в красном блоке */}
        <div className={`bg-primary text-white ${currentStyle.hubBox} shadow-red-glow flex items-center justify-center`}>
          <span className={`font-black uppercase tracking-tighter leading-none ${currentStyle.hubText}`}>
            HUB
          </span>
        </div>
      </div>
    </div>
  );
};

export default Logo;
