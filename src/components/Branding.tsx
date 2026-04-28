
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
        <span className="text-text text-xl font-headline">OC</span>
        <div className="bg-red text-white px-1.5 py-0.5 rounded-lg ml-1 shadow-[0_0_15px_rgba(230,57,70,0.4)]">
          <span className="text-sm block leading-none font-headline">H</span>
        </div>
      </div>
    );
  }

  // Полное состояние
  return (
    <div className={`flex ${orientation === 'vertical' ? 'flex-col justify-center' : 'flex-row'} items-center ${className} group`}>
      
      {/* Изображение нового логотипа */}
      <img 
        src="/pict.png" 
        alt="Logo" 
        className={`${currentStyle.img} w-auto object-contain ${orientation === 'vertical' ? 'mb-8' : 'mr-5'} transition-all duration-700 group-hover:scale-110 group-hover:rotate-3`}
      />

      {/* Текстовая часть */}
      <div className={`flex items-center ${currentStyle.gap}`}>
        {/* Левая часть: Optima Control в 2 строки */}
        <div className={`flex flex-col items-end font-black uppercase tracking-[0.1em] leading-[0.85] text-text font-headline ${currentStyle.text}`}>
          <span className="group-hover:text-red transition-colors duration-500">Optima</span>
          <span>Control</span>
        </div>

        {/* Правая часть: HUB в красном блоке */}
        <div className={`bg-red text-white ${currentStyle.hubBox} shadow-[0_10px_30px_rgba(230,57,70,0.3)] flex items-center justify-center group-hover:scale-105 transition-transform duration-500`}>
          <span className={`font-black uppercase tracking-tighter leading-none font-headline ${currentStyle.hubText}`}>
            HUB
          </span>
        </div>
      </div>
    </div>
  );
};

export default Logo;
