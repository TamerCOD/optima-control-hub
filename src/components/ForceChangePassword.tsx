
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { auth, db } from '../firebase';
import { User } from '../types';

interface Props {
  user: User;
  onSuccess: () => void;
}

const ForceChangePassword: React.FC<Props> = ({ user, onSuccess }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
        setErrorMsg('Пароль должен быть не менее 6 символов');
        return;
    }
    if (newPassword !== confirmPassword) {
        setErrorMsg('Пароли не совпадают');
        return;
    }

    setStatus('loading');
    setErrorMsg('');

    try {
        const currentUser = auth.currentUser;
        if (currentUser) {
            // 1. Смена пароля в Firebase Auth
            await currentUser.updatePassword(newPassword);
            
            // 2. Обновление статуса в Firestore
            // Это критический шаг: система помечает, что пользователь сменил временный пароль
            await db.collection('users').doc(user.id).update({
                needsPasswordChange: false,
                // Можно добавить поле для аудита, если нужно
                // lastPasswordChange: new Date().toISOString() 
            });

            // 3. Переход в систему
            onSuccess();
        } else {
            throw new Error("Сессия истекла. Пожалуйста, войдите снова.");
        }
    } catch (err: any) {
        console.error(err);
        setStatus('error');
        // Если ошибка "requires recent login", просим перезайти, но обычно это окно всплывает сразу после входа
        setErrorMsg(err.message || 'Ошибка смены пароля. Попробуйте перезайти в аккаунт.');
    }
  };

  return (
    <div className="min-h-full bg-transparent flex flex-col items-center justify-center p-3 font-sans relative overflow-hidden">
       {/* Декоративное свечение */}
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/10 rounded-full blur-[100px] opacity-50 pointer-events-none"></div>

       <motion.div 
           initial={{ opacity: 0, scale: 0.95, y: 20 }}
           animate={{ opacity: 1, scale: 1, y: 0 }}
           transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
           className="w-full max-w-md clay-panel p-6 relative z-10"
       >
           <div className="text-center mb-10">
               <div className="w-20 h-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                   <ShieldCheck size={40} />
               </div>
               <h1 className="text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">Безопасность</h1>
               <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mt-3 uppercase tracking-wide leading-relaxed">
                   Это ваш первый вход. Для активации учетной записи необходимо установить персональный пароль.
               </p>
           </div>

           <form onSubmit={handleSubmit} className="space-y-6">
               <div className="space-y-2">
                   <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Новый Пароль</label>
                   <input 
                       type="password"
                       value={newPassword}
                       onChange={(e) => setNewPassword(e.target.value)}
                       className="w-full px-6 py-4 clay-input text-sm font-bold dark:text-white"
                       placeholder="Минимум 6 символов"
                       required
                   />
               </div>
               <div className="space-y-2">
                   <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Повторите Пароль</label>
                   <input 
                       type="password"
                       value={confirmPassword}
                       onChange={(e) => setConfirmPassword(e.target.value)}
                       className="w-full px-6 py-4 clay-input text-sm font-bold dark:text-white"
                       placeholder="Повторите пароль"
                       required
                   />
               </div>

               {errorMsg && (
                   <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-2xl text-xs font-black flex items-center gap-3 border border-red-100 dark:border-red-900/50 animate-pulse">
                       <AlertTriangle size={18} className="shrink-0" /> {errorMsg}
                   </div>
               )}

               <button 
                   type="submit"
                   disabled={status === 'loading'}
                   className="w-full py-5 clay-btn clay-btn-primary font-black uppercase text-xs tracking-[0.2em] disabled:opacity-70 flex items-center justify-center gap-3"
               >
                   {status === 'loading' ? 'Активация...' : <>Сохранить и Войти <ArrowRight size={16}/></>}
               </button>
           </form>
       </motion.div>
    </div>
  );
};

export default ForceChangePassword;
