import React from 'react';
import { Link } from 'lucide-react';

const UsefulLinksView: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center animate-fade-in">
            <div className="w-24 h-24 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mb-6 shadow-inner border border-primary/20">
                <Link size={40} className="text-primary" />
            </div>
            <h2 className="text-2xl font-black mb-2 text-zinc-900 dark:text-white tracking-tighter uppercase">Полезные Ссылки</h2>
            <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest max-w-md">
                Раздел находится в стадии разработки. Скоро здесь появится каталог полезных ресурсов и документов.
            </p>
        </div>
    );
};

export default UsefulLinksView;
