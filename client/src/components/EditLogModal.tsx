import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { CATEGORIES } from '../lib/constants';

interface EditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: {
    id: number;
    categoryId: string;
    categoryLabel: string;
  } | null;
}

export const EditLogModal = ({ isOpen, onClose, log }: EditLogModalProps) => {
  const queryClient = useQueryClient();
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  useEffect(() => {
    if (log) {
      setSelectedCat(log.categoryId);
    }
  }, [log]);

  const updateMutation = useMutation({
    mutationFn: async (data: { categoryId: string; categoryLabel: string }) => {
      if (!log) return;
      return api.patch(`/logs/${log.id}`, { ...data, isManual: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
      onClose();
    },
  });

  const handleSave = () => {
    if (!selectedCat) return;
    const cat = CATEGORIES[selectedCat];
    updateMutation.mutate({ categoryId: cat.id, categoryLabel: cat.label });
  };

  if (!isOpen || !log) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl">
        <h2 className="text-xl font-bold mb-4">履歴の修正</h2>
        <p className="mb-4 text-gray-600">正しい作業内容を選択してください。</p>
        
        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto mb-6 p-1">
          {Object.values(CATEGORIES).map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={`p-3 rounded-lg border text-left transition-all ${
                  selectedCat === cat.id 
                  ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-500 font-bold' 
                  : 'hover:bg-gray-50 border-gray-200'
              }`}
            >
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${cat.color.split(' ')[0]}`}></span>
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">キャンセル</button>
          <button 
            onClick={handleSave} 
            disabled={!selectedCat || updateMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-bold shadow-sm"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};
