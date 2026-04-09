
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Lock, User as UserIcon, AlertTriangle, Loader, HelpCircle } from 'lucide-react';
import { auth } from '../firebase';
import Logo from './Branding';

interface LoginProps {
  onLogin: (u: string, p: string) => Promise<boolean>;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    const email = username.trim();

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (err: any) {
        // Auto-create super admin if specific email not found (Dev/Demo purpose)
        if (email === 'temirlan.ishenbek@optimabank.kg' && err.code === 'auth/user-not-found') {
             try { await auth.createUserWithEmailAndPassword(email, password); return; } catch (ce:any) { setError(ce.message); setIsLoading(false); return; }
        }
        setError("Доступ отклонен. Проверьте данные или обратитесь к администратору.");
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-3 bg-transparent relative overflow-hidden">
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-[480px] relative z-10 flex flex-col"
      >
        {/* Декоративное свечение */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/10 rounded-full blur-[100px] opacity-50 pointer-events-none"></div>
        
        <div className="relative clay-panel p-6 md:p-14 mb-8">
            <div className="text-center mb-12">
                <div className="flex justify-center mb-6">
                    <Logo size="lg" orientation="vertical" />
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-[0.3em] drop-shadow-sm">
                    Единая экосистема управления
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest ml-4">Корпоративный Email</label>
                    <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-primary transition-colors">
                            <UserIcon size={20} />
                        </div>
                        <input 
                            type="text" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 clay-input text-sm font-semibold dark:text-white"
                            placeholder="user@optimabank.kg"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest ml-4">Пароль доступа</label>
                    <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-primary transition-colors">
                            <Lock size={20} />
                        </div>
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 clay-input text-sm font-semibold dark:text-white"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50/80 dark:bg-red-950/50 text-red-600 dark:text-red-400 p-3 rounded-2xl text-xs font-bold flex items-center gap-3 border border-red-200 dark:border-red-900/50 animate-pulse shadow-sm">
                        <AlertTriangle size={18} className="shrink-0" /> {error}
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full clay-btn clay-btn-primary py-5 font-bold uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 disabled:opacity-50 mt-4 hover:scale-[1.02] transition-transform"
                >
                    {isLoading ? <Loader size={20} className="animate-spin" /> : <>Войти в систему <ArrowRight size={18} /></>}
                </button>
            </form>
        </div>

        {/* Анимированный блок поддержки */}
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-center"
        >
            <a 
                href="https://t.me/temirlan_ishenbek" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 px-6 py-3 clay-btn"
            >
                <div className="p-1.5 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full text-white animate-pulse-soft">
                    <HelpCircle size={14} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 animate-gradient-slow bg-[length:200%_auto]">
                    Тех. Поддержка: Ишенбек уулу Темирлан
                </span>
            </a>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
