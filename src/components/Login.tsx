
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
        
        let errorMessage = "Доступ отклонен. Проверьте данные или обратитесь к администратору.";
        
        if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
            errorMessage = "Неверный email или пароль.";
        } else if (err.code === 'auth/user-disabled') {
            errorMessage = "Ваша учетная запись заблокирована администратором.";
        } else if (err.code === 'auth/too-many-requests') {
            errorMessage = "Слишком много неудачных попыток. Попробуйте позже.";
        } else if (err.code === 'auth/network-request-failed') {
            errorMessage = "Ошибка подключения (Network Error). Корпоративная сеть блокирует запрос к Firebase.";
        } else {
            errorMessage = `Ошибка: ${err.message || err.code}`;
        }
        
        setError(errorMessage);
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-3 bg-transparent relative overflow-hidden reveal">
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-[480px] relative z-10 flex flex-col"
      >
        {/* Декоративное свечение */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-red/10 rounded-full blur-[100px] opacity-50 pointer-events-none"></div>
        
        <div className="relative premium-card p-8 md:p-14 mb-8">
            <div className="text-center mb-12">
                <div className="flex justify-center mb-8">
                    <Logo size="lg" orientation="vertical" />
                </div>
                <p className="text-muted text-[10px] font-black uppercase tracking-[0.4em] drop-shadow-sm font-headline">
                    Единая экосистема управления
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em] ml-4 font-headline">Корпоративный Email</label>
                    <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-red transition-colors">
                            <UserIcon size={20} />
                        </div>
                        <input 
                            type="text" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 clay-input text-sm font-bold text-text font-headline"
                            placeholder="user@optimabank.kg"
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em] ml-4 font-headline">Пароль доступа</label>
                    <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-red transition-colors">
                            <Lock size={20} />
                        </div>
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 clay-input text-sm font-bold text-text font-headline"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                {error && (
                    <div className="bg-red/10 text-red p-4 rounded-lg text-xs font-black flex items-center gap-3 border border-red/20 animate-pulse shadow-sm font-headline uppercase tracking-tight">
                        <AlertTriangle size={18} className="shrink-0" /> {error}
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full btn-primary py-5 font-black uppercase tracking-[0.3em] text-[11px] flex items-center justify-center gap-3 disabled:opacity-50 mt-4 font-headline"
                    onMouseEnter={() => document.body.classList.add('cursor-hover')}
                    onMouseLeave={() => document.body.classList.remove('cursor-hover')}
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
                className="group inline-flex items-center gap-3 px-8 py-4 premium-card bg-surface2 hover:bg-surface3 transition-all"
                onMouseEnter={() => document.body.classList.add('cursor-hover')}
                onMouseLeave={() => document.body.classList.remove('cursor-hover')}
            >
                <div className="p-2 bg-red rounded-full text-white shadow-[0_0_15px_rgba(230,57,70,0.4)]">
                    <HelpCircle size={14} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text font-headline">
                    Тех. Поддержка: Ишенбек уулу Темирлан
                </span>
            </a>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
