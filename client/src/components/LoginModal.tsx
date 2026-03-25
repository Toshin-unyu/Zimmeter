import { useState } from 'react';
import { User } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onSubmit: (username: string) => void;
}

export const LoginModal = ({ isOpen, onSubmit }: LoginModalProps) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const UID_PATTERN = /^[a-zA-Z0-9_-]+$/;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    if (value && !UID_PATTERN.test(value)) {
      setError('半角英数字、ハイフン(-)、アンダースコア(_)のみ使用できます');
    } else {
      setError('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    if (!UID_PATTERN.test(trimmed)) {
      setError('半角英数字、ハイフン(-)、アンダースコア(_)のみ使用できます');
      return;
    }
    onSubmit(trimmed);
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
                ユーザーIDを入力してください。
            </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                    ユーザーID <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={username}
                    onChange={handleChange}
                    className={`w-full p-4 text-lg border-2 rounded-xl focus:ring-4 outline-none transition-all placeholder-gray-300 ${
                      error
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-50'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-50'
                    }`}
                    placeholder="例: suzuki, tanaka_t"
                    autoFocus
                    required
                />
                {error && (
                  <p className="mt-2 text-sm text-red-500">{error}</p>
                )}
            </div>

            <button
                type="submit"
                disabled={!username.trim() || !!error}
                className="btn-primary w-full py-4 text-lg disabled:opacity-50 shadow-lg"
            >
                開始する
            </button>
        </form>
      </div>
    </div>
  );
};
