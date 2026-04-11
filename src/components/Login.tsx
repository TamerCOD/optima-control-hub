
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Lock, User as UserIcon, AlertTriangle, Loader, HelpCircle, Eye, EyeOff, ShieldAlert, Clock } from 'lucide-react';
import { auth } from '../firebase';
import Logo from './Branding';

interface LoginProps {
  onLogin: (u: string, p: string) => Promise<boolean>;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restore lockout from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('login_lock_until');
    const storedAttempts = sessionStorage.getItem('login_attempts');
    if (stored) {
      const until = parseInt(stored, 10);
      if (until > Date.now()) {
        setLockUntil(until);
        setAttempts(storedAttempts ? parseInt(storedAttempts, 10) : MAX_ATTEMPTS);
      } else {
        sessionStorage.removeItem('login_lock_until');
        sessionStorage.removeItem('login_attempts');
      }
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (lockUntil) {
      const tick = () => {
        const remaining = Math.ceil((lockUntil - Date.now()) / 1000);
        if (remaining <= 0) {
          setLockUntil(null);
          setAttempts(0);
          setCountdown(0);
          sessionStorage.removeItem('login_lock_until');
          sessionStorage.removeItem('login_attempts');
          if (timerRef.current) clearInterval(timerRef.current);
        } else {
          setCountdown(remaining);
        }
      };
      tick();
      timerRef.current = setInterval(tick, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [lockUntil]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (lockUntil && lockUntil > Date.now()) {
      setError(`Слишком много попыток. Подождите ${countdown} сек.`);
      return;
    }

    const email = username.trim().toLowerCase();
    if (!email || !password) {
      setError('Заполните все поля.');
      return;
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Введите корректный email.');
      return;
    }

    setIsLoading(true);
    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (err: any) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      sessionStorage.setItem('login_attempts', String(newAttempts));

      if (newAttempts >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_SECONDS * 1000;
        setLockUntil(until);
        sessionStorage.setItem('login_lock_until', String(until));
        setError(`Аккаунт заблокирован на ${LOCKOUT_SECONDS} секунд после ${MAX_ATTEMPTS} неудачных попыток.`);
      } else {
        const remaining = MAX_ATTEMPTS - newAttempts;
        setError(`Доступ отклонён. Проверьте данные. Осталось попыток: ${remaining}`);
      }
      setIsLoading(false);
    }
  };

  const isLocked = !!(lockUntil && lockUntil > Date.now());

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-4 bg-transparent relative overflow-hidden">

      {/* Декоративные орбы */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none animate-float" style={{ animationDelay: '0s' }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-400/5 rounded-full blur-3xl pointer-events-none animate-float" style={{ animationDelay: '2s' }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[460px] relative z-10 flex flex-col gap-4"
      >
        {/* Карточка логина */}
        <div className="relative clay-panel p-8 md:p-10 overflow-hidden">
          {/* Декоративная полоска вверху */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0 rounded-t-3xl" />

          <div className="text-center mb-8">
            <motion.div
              className="flex justify-center mb-5"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <Logo size="md" orientation="horizontal" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-zinc-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-[0.35em]">
                Единая экосистема управления
              </p>
            </motion.div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <motion.div
              className="space-y-1.5"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
            >
              <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.25em] ml-3 block">
                Корпоративный Email
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-primary transition-colors duration-200 pointer-events-none">
                  <UserIcon size={18} />
                </div>
                <input
                  type="email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLocked || isLoading}
                  className="w-full pl-12 pr-5 py-3.5 clay-input text-sm font-medium dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-600 disabled:opacity-50"
                  placeholder="user@optimabank.kg"
                  autoComplete="email"
                />
              </div>
            </motion.div>

            {/* Password */}
            <motion.div
              className="space-y-1.5"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.25em] ml-3 block">
                Пароль доступа
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-primary transition-colors duration-200 pointer-events-none">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLocked || isLoading}
                  className="w-full pl-12 pr-12 py-3.5 clay-input text-sm font-medium dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-600 disabled:opacity-50"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-0.5"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </motion.div>

            {/* Индикатор попыток */}
            {attempts > 0 && attempts < MAX_ATTEMPTS && !isLocked && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-3 py-2"
              >
                {[...Array(MAX_ATTEMPTS)].map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                      i < attempts ? 'bg-primary' : 'bg-zinc-200 dark:bg-zinc-700'
                    }`}
                  />
                ))}
                <span className="text-[10px] text-zinc-400 font-bold ml-1 shrink-0">
                  {MAX_ATTEMPTS - attempts} попыток
                </span>
              </motion.div>
            )}

            {/* Error */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key={error}
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl text-xs font-semibold border ${
                    isLocked
                      ? 'bg-amber-50/80 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50'
                      : 'bg-red-50/80 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {isLocked ? <Clock size={16} /> : <AlertTriangle size={16} />}
                  </div>
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Кнопка входа */}
            <motion.button
              type="submit"
              disabled={isLoading || isLocked}
              className="w-full py-4 font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 disabled:opacity-40 transition-all duration-200 rounded-2xl bg-primary text-white shadow-[0_4px_24px_rgba(227,6,19,0.35)] hover:shadow-[0_8px_32px_rgba(227,6,19,0.45)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              whileTap={{ scale: 0.97 }}
            >
              {isLoading ? (
                <Loader size={18} className="animate-spin" />
              ) : isLocked ? (
                <>
                  <ShieldAlert size={16} />
                  Блокировка {countdown}с
                </>
              ) : (
                <>
                  Войти в систему
                  <ArrowRight size={16} />
                </>
              )}
            </motion.button>
          </form>
        </div>

        {/* Поддержка */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
        >
          <a
            href="https://t.me/temirlan_ishenbek"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2.5 px-5 py-2.5 clay-btn hover:-translate-y-0.5 transition-transform duration-200"
          >
            <div className="p-1.5 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full text-white">
              <HelpCircle size={12} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400">
              Тех. Поддержка: Ишенбек уулу Темирлан
            </span>
          </a>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
