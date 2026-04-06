import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  icon?: React.ReactNode;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({ options, value, onChange, placeholder = 'Выберите...', icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const selectedLabels = value.map(v => options.find(o => o.value === v)?.label).filter(Boolean);

  return (
    <div className="relative" ref={containerRef}>
      <div 
        className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 cursor-pointer min-w-[180px] hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        {icon && <span className="text-zinc-400">{icon}</span>}
        <div className="flex-1 truncate text-sm text-zinc-700 dark:text-zinc-300">
          {value.length === 0 ? (
            <span className="text-zinc-400">{placeholder}</span>
          ) : value.length === 1 ? (
            selectedLabels[0]
          ) : (
            `Выбрано: ${value.length}`
          )}
        </div>
        {value.length > 0 && (
          <button onClick={clearSelection} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X size={14} />
          </button>
        )}
        <ChevronDown size={14} className={`text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full min-w-[200px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg py-1 max-h-60 overflow-y-auto custom-scrollbar">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-zinc-500 italic">Нет вариантов</div>
          ) : (
            options.map(option => {
              const isSelected = value.includes(option.value);
              return (
                <div 
                  key={option.value}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer text-sm text-zinc-700 dark:text-zinc-300"
                  onClick={() => toggleOption(option.value)}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-primary border-primary text-white' : 'border-zinc-300 dark:border-zinc-600'}`}>
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                  <span className="truncate">{option.label}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
