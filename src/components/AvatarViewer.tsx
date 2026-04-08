import React, { useState, useRef } from 'react';
import { X, Edit2 } from 'lucide-react';
import { User, UserRole } from '../types';
import { storage, db } from '../firebase';

interface Props {
  user: User;
  currentUser: User;
  onClose: () => void;
  onAvatarUpdated: (newAvatarUrl: string) => void;
}

const AvatarViewer: React.FC<Props> = ({ user, currentUser, onClose, onAvatarUpdated }) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = currentUser.roles.includes(UserRole.SUPER_ADMIN);
  const isSelf = currentUser.id === user.id;
  
  // Can change if admin, OR if it's self and hasn't changed before
  const canChange = isAdmin || (isSelf && !user.avatarChanged);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (5MB = 5 * 1024 * 1024 bytes)
    if (file.size > 5 * 1024 * 1024) {
      alert('Размер изображения не должен превышать 5 МБ. Пожалуйста, сожмите изображение или выберите другое.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Check type
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.8 quality
          const base64Avatar = canvas.toDataURL('image/jpeg', 0.8);

          try {
            // Update user in Firestore
            const updateData: Partial<User> = {
              avatar: base64Avatar,
            };
            
            // If not admin and changing own photo, mark as changed
            if (!isAdmin && isSelf) {
              updateData.avatarChanged = true;
            }

            await db.collection('users').doc(user.id).update(updateData);
            
            onAvatarUpdated(base64Avatar);
            alert('Фотография успешно обновлена!');
          } catch (err: any) {
            console.error('Error saving avatar to Firestore:', err);
            alert('Ошибка при сохранении фотографии: ' + err.message);
          } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }
        };
        
        img.onerror = () => {
          alert('Ошибка при чтении изображения.');
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        };
      };
      
      reader.onerror = () => {
        alert('Ошибка при чтении файла.');
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
    } catch (error: any) {
      console.error('Error processing avatar:', error);
      alert('Ошибка при обработке фотографии: ' + error.message);
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative max-w-2xl w-full flex flex-col items-center">
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors bg-black/20 hover:bg-black/40 rounded-full"
        >
          <X size={24} />
        </button>

        <div className="relative group">
          <img 
            src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
            alt={user.name}
            className="w-64 h-64 md:w-96 md:h-96 object-cover rounded-3xl shadow-2xl border-4 border-white/10"
          />
          
          {canChange && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl flex items-center justify-center">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-white text-black px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
              >
                {isUploading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Edit2 size={18} />
                    Заменить фото
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {!canChange && isSelf && user.avatarChanged && (
          <p className="mt-6 text-white/50 text-sm font-medium text-center bg-black/40 px-4 py-2 rounded-lg">
            Вы уже меняли свою фотографию. Для повторной замены обратитесь к администратору.
          </p>
        )}

        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      </div>
    </div>
  );
};

export default AvatarViewer;
