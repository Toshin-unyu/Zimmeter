import { useState } from 'react';
import { User } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onSubmit: (username: string) => void;
}

export const LoginModal = ({ isOpen, onSubmit }: LoginModalProps) => {
  const [username, setUsername] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onSubmit(username.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center mb-6">
            <div className="bg-blue-100 p-4 rounded-full mb-4">
                <User size={40} className="text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">ようこそ</h2>
            <p className="text-gray-500 mt-2 text-center">
                業務を開始する前に、<br/>
                あなたのお名前（ユーザー名）を入力してください。
            </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                    ユーザー名 <span className="text-red-500">*</span>
                </label>
                <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all placeholder-gray-300"
                    placeholder="例: 山田 太郎"
                    autoFocus
                    required
                />
            </div>

            <button 
                type="submit"
                disabled={!username.trim()}
                className="w-full py-4 bg-blue-600 text-white text-lg font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-blue-200 hover:-translate-y-0.5"
            >
                開始する
            </button>
        </form>
      </div>
    </div>
  );
};
