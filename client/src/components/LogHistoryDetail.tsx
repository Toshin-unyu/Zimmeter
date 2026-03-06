import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { History, ChevronDown, ChevronUp } from 'lucide-react';

interface HistoryChange {
  old: string | number | null;
  new: string | number | null;
  oldName?: string;
  newName?: string;
}

interface HistoryRecord {
  id: number;
  workLogId: number;
  editedById: number;
  editedBy: { id: number; name: string; role: string };
  changes: Record<string, HistoryChange>;
  createdAt: string;
}

interface LogHistoryDetailProps {
  logId: number;
}

const formatTimeValue = (val: string | number | null): string => {
  if (val == null) return '-';
  if (typeof val === 'string' && val.includes('T')) {
    return new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return String(val);
};

const changeLabel: Record<string, string> = {
  startTime: '開始',
  endTime: '終了',
  categoryId: 'カテゴリ',
  note: 'メモ',
};

export const LogHistoryDetail = ({ logId }: LogHistoryDetailProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const { data: histories, isLoading } = useQuery({
    queryKey: ['logHistory', logId],
    queryFn: async () => {
      const res = await api.get<HistoryRecord[]>(`/logs/${logId}/history`);
      return res.data;
    },
    enabled: isOpen,
  });

  return (
    <div className="mt-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-blue-600 transition-colors"
        type="button"
      >
        <History size={12} />
        <span>履歴</span>
        {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {isOpen && (
        <div className="mt-1 pl-2 border-l-2 border-gray-200 space-y-2">
          {isLoading && <div className="text-[10px] text-gray-400">読み込み中...</div>}
          {histories && histories.length === 0 && (
            <div className="text-[10px] text-gray-400">履歴なし</div>
          )}
          {histories?.map((h) => (
            <div key={h.id} className="text-[10px] text-gray-600">
              <div className="flex items-center gap-1 text-gray-500">
                <span className="font-mono">
                  {new Date(h.createdAt).toLocaleString([], {
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="font-medium text-gray-700">{h.editedBy.name}</span>
                {h.editedBy.role === 'ADMIN' && (
                  <span className="px-1 py-0.5 bg-red-100 text-red-600 rounded text-[9px]">ADMIN</span>
                )}
              </div>
              <div className="mt-0.5 space-y-0.5">
                {Object.entries(h.changes).map(([field, change]) => (
                  <div key={field} className="flex items-center gap-1">
                    <span className="text-gray-500">{changeLabel[field] || field}:</span>
                    <span className="text-red-500 line-through">
                      {field === 'categoryId' ? change.oldName
                        : field === 'note' ? (change.old || '(なし)')
                        : formatTimeValue(change.old)}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="text-green-600 font-medium">
                      {field === 'categoryId' ? change.newName
                        : field === 'note' ? (change.new || '(なし)')
                        : formatTimeValue(change.new)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
