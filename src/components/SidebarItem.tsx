import React from 'react';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

export function SidebarItem({ icon, label, active }: SidebarItemProps) {
  return (
    <div className="relative group w-full rounded-xl cursor-pointer">
      {/* Glow Effect Wrapper */}
      <div 
        className={`absolute -inset-[1.5px] rounded-xl transition-opacity duration-500 ${
          active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        {/* Blur Aura */}
        <div className="absolute inset-0 rounded-xl blur-[8px] overflow-hidden opacity-70">
          <div className="absolute top-1/2 left-1/2 w-[200%] aspect-square -translate-x-1/2 -translate-y-1/2">
            <div 
              className="w-full h-full bg-[conic-gradient(from_0deg,transparent_0%,transparent_65%,#f97316_80%,#fbbf24_95%,#ffffff_100%)]"
              style={{ animation: 'spin 3s linear infinite' }}
            />
          </div>
        </div>
        
        {/* Sharp Border */}
        <div className="absolute inset-0 rounded-xl overflow-hidden bg-[#e2e4e9]">
          <div className="absolute top-1/2 left-1/2 w-[200%] aspect-square -translate-x-1/2 -translate-y-1/2">
            <div 
              className="w-full h-full bg-[conic-gradient(from_0deg,transparent_0%,transparent_65%,#f97316_80%,#fbbf24_95%,#ffffff_100%)]"
              style={{ animation: 'spin 3s linear infinite' }}
            />
          </div>
        </div>
      </div>

      {/* Inner Content */}
      <div 
        className={`relative flex items-center gap-3 px-4 py-3 bg-white rounded-xl z-10 transition-all duration-300 shadow-[0_2px_10px_rgba(0,0,0,0.02)] ${
          active ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-900'
        }`}
      >
        <div 
          className={`transition-transform duration-300 ${
            active ? 'scale-110 text-orange-500' : 'group-hover:scale-110 group-hover:text-orange-500'
          }`}
        >
          {icon}
        </div>
        <span className="font-medium">{label}</span>
      </div>
    </div>
  );
}
