import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import type { Category } from '../lib/constants';
import { useToast } from '../context/ToastContext';

interface WorkLog {
  id: number;
  categoryId: number;
  categoryNameSnapshot: string;
  startTime: string;
  endTime?: string | null;
}

interface EditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'edit' | 'create';
  log: WorkLog | null;
  categories: Category[];
  uid?: string;
  initialCategoryId?: number | null;
}

export const EditLogModal = ({ isOpen, onClose, mode, log, categories, uid, initialCategoryId }: EditLogModalProps) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [startTimeStr, setStartTimeStr] = useState<string>(''); // HH:mm for create

  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'edit' && log) {
      setSelectedCatId(log.categoryId);
      return;
    }

    if (mode === 'create') {
      setSelectedCatId(initialCategoryId || null);
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const hh = pad(now.getHours());
      const mm = pad(now.getMinutes());
      setStartTimeStr(`${hh}:${mm}`);
    }
  }, [isOpen, mode, log, initialCategoryId]);

  const updateMutation = useMutation({
    mutationFn: async (data: { categoryId: number; startTime?: string; endTime?: string | null }) => {
      if (!log) return;
      return api.patch(`/logs/${log.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history', uid] });
      queryClient.invalidateQueries({ queryKey: ['activeLog', uid] });
      // Also invalidate monitor logs if we are in admin view (though uid might be different context, invalidating general helps)
      queryClient.invalidateQueries({ queryKey: ['monitorLogs'] });
      onClose();
      showToast('履歴を更新しました', 'success');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.details || error.response?.data?.error || '履歴の更新に失敗しました';
      showToast(msg, 'error');
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { categoryId: number; startTime: string }) => {
      return api.post('/logs/manual', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history', uid] });
      queryClient.invalidateQueries({ queryKey: ['activeLog', uid] });
      onClose();
      showToast('履歴を追加しました', 'success');
    },
    onError: (error: any) => {
      const status = error.response?.status;
      const data = error.response?.data;
      const serverMsg =
        (typeof data === 'string' ? data : (data?.message || data?.details || data?.error)) ||
        (status ? `HTTP ${status}` : null);
      showToast(serverMsg || '履歴の追加に失敗しました', 'error');
    },
  });

  const handleSave = () => {
    if (!selectedCatId) {
      showToast('カテゴリを選択してください', 'error');
      return;
    }

    if (mode === 'edit') {
      const payload: any = { categoryId: selectedCatId };
      updateMutation.mutate(payload);
      return;
    }

    const today = new Date();
    const [sh, sm] = startTimeStr.split(':').map(Number);

    if ([sh, sm].some(v => Number.isNaN(v))) {
      showToast('開始時刻を正しく入力してください', 'error');
      return;
    }

    const start = new Date(today);
    start.setHours(sh, sm, 0, 0);

    createMutation.mutate({
      categoryId: selectedCatId,
      startTime: start.toISOString(),
    });
  };

  if (!isOpen || (mode === 'edit' && !log)) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-bold mb-4">{mode === 'edit' ? '履歴の修正' : '履歴の追加'}</h2>
        
        {mode === 'edit' ? (
            <div className="mb-4 space-y-3">
                <p className="text-sm text-gray-600">作業内容を修正できます。</p>
            </div>
        ) : (
            <p className="mb-4 text-gray-600">追加する作業内容と時間を入力してください。</p>
        )}

        {mode === 'create' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">開始時刻</label>
            <input
              type="time"
              value={startTimeStr}
              onChange={(e) => setStartTimeStr(e.target.value)}
              className="w-full p-2 border rounded-lg bg-white"
            />
            <p className="text-xs text-gray-500 mt-1">前の項目の開始時間との差が計算時間になります</p>
          </div>
        )}
        
        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">カテゴリ選択</label>
        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto mb-6 p-1 border rounded bg-slate-50">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCatId(cat.id)}
              className={`p-3 rounded-lg border text-left transition-all ${
                  selectedCatId === cat.id 
                  ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-500 font-bold' 
                  : 'hover:bg-white border-gray-200 bg-white'
              }`}
            >
              <span 
                className={`inline-block w-2 h-2 rounded-full mr-2 ${cat.color?.split(' ')[0] || 'bg-gray-400'}`}
              ></span>
              {cat.name}
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn-secondary">キャンセル</button>
          <button 
            onClick={handleSave} 
            disabled={!selectedCatId || (mode === 'create' && !startTimeStr) || updateMutation.isPending || createMutation.isPending}
            className="btn-primary disabled:opacity-50"
          >
            {(updateMutation.isPending || createMutation.isPending) ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
};
