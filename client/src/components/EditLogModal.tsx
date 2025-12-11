import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import type { Category } from '../lib/constants';

interface WorkLog {
  id: number;
  categoryId: number;
  categoryNameSnapshot: string;
}

interface EditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: WorkLog | null;
  categories: Category[];
}

export const EditLogModal = ({ isOpen, onClose, log, categories }: EditLogModalProps) => {
  const queryClient = useQueryClient();
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);

  useEffect(() => {
    if (log) {
        setSelectedCatId(log.categoryId);
    }
  }, [log]);

  const updateMutation = useMutation({
    mutationFn: async (data: { categoryId: number }) => {
      if (!log) return;
      return api.patch(`/logs/${log.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['activeLog'] });
      onClose();
    },
  });

  const handleSave = () => {
    if (!selectedCatId) return;
    updateMutation.mutate({ categoryId: selectedCatId });
  };

  if (!isOpen || !log) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl">
        <h2 className="text-xl font-bold mb-4">履歴の修正</h2>
        <p className="mb-4 text-gray-600">正しい作業内容を選択してください。</p>
        
        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto mb-6 p-1">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCatId(cat.id)}
              className={`p-3 rounded-lg border text-left transition-all ${
                  selectedCatId === cat.id 
                  ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-500 font-bold' 
                  : 'hover:bg-gray-50 border-gray-200'
              }`}
            >
              <span 
                className={`inline-block w-2 h-2 rounded-full mr-2 ${cat.color?.split(' ')[0] || 'bg-gray-400'}`}
              ></span>
              {cat.name}
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">キャンセル</button>
          <button 
            onClick={handleSave} 
            disabled={!selectedCatId || updateMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-bold shadow-sm"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};
