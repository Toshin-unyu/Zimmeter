import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { CATEGORIES } from '../lib/constants';

interface AwayModalProps {
  isOpen: boolean;
  onClose: () => void;
  logId: number; // ID of the away log to patch
}

export const AwayModal = ({ isOpen, onClose, logId }: AwayModalProps) => {
  const queryClient = useQueryClient();
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  // Filter categories relevant for away reasons
  const reasons = Object.values(CATEGORIES).filter(c => c.id !== 'away');

  const mutation = useMutation({
    mutationFn: async (data: { categoryId: string; categoryLabel: string }) => {
      return api.patch(`/logs/${logId}`, { ...data, isManual: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] }); // Assuming key is 'history'
      onClose();
    },
  });

  const handleSave = () => {
    if (!selectedCat) return;
    const cat = CATEGORIES[selectedCat];
    mutation.mutate({ categoryId: cat.id, categoryLabel: cat.label });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl">
        <h2 className="text-xl font-bold mb-4">離席内容の確認</h2>
        <p className="mb-4 text-gray-600">先ほどの離席は何をしていましたか？</p>
        
        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto mb-6 p-1">
          {reasons.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={`p-3 rounded-lg border text-left transition-all ${
                  selectedCat === cat.id 
                  ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-500 font-bold' 
                  : 'hover:bg-gray-50 border-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
          <button
              onClick={() => setSelectedCat('away')}
              className={`p-3 rounded-lg border text-left transition-all ${
                  selectedCat === 'away' 
                  ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-500 font-bold' 
                  : 'hover:bg-gray-50 border-gray-200 text-gray-500'
              }`}
          >
              そのまま離席
          </button>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">スキップ</button>
          <button 
            onClick={handleSave} 
            disabled={!selectedCat || mutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-bold shadow-sm"
          >
            確定
          </button>
        </div>
      </div>
    </div>
  );
};
