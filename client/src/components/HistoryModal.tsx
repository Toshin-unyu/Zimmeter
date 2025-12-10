import { X, Pencil, Trash2 } from 'lucide-react';
import type { Category } from '../lib/constants';
import { getCategoryStyle } from '../lib/utils';

interface WorkLog {
  id: number;
  userId: number;
  categoryId: number;
  categoryNameSnapshot: string;
  startTime: string;
  endTime?: string | null;
  duration?: number | null;
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: WorkLog[];
  onEdit: (log: WorkLog) => void;
  onDelete: (id: number) => void;
  mergedCategories: Record<number, Category>;
}

export const HistoryModal = ({ isOpen, onClose, logs, onEdit, onDelete, mergedCategories }: HistoryModalProps) => {
  if (!isOpen) return null;

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h2 className="text-xl font-bold text-gray-700">本日の履歴</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm text-center">
            <thead className="bg-gray-50 text-gray-500 sticky top-0 z-10">
              <tr>
                <th className="p-2 rounded-l text-center">開始時刻</th>
                <th className="p-2 text-center">タスク</th>
                <th className="p-2 text-center">時間</th>
                <th className="p-2 text-center">タイプ</th>
                <th className="p-2 rounded-r text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                 const cat = mergedCategories[log.categoryId];
                 const { className: colorClass, style } = getCategoryStyle(cat);
                 
                 return (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="p-2 font-mono text-gray-500 text-center">
                        {new Date(log.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="p-2 font-medium">
                        <div className="flex items-center justify-center">
                            <span 
                                className={`inline-block w-2 h-2 rounded-full mr-2 ${colorClass.split(' ')[0]}`}
                                style={style?.backgroundColor ? { backgroundColor: style.backgroundColor } : {}}
                            ></span>
                            {log.categoryNameSnapshot}
                        </div>
                      </td>
                      <td className="p-2 text-gray-500 font-mono text-center">
                        {log.duration ? formatDuration(log.duration) : '-'}
                      </td>
                      <td className="p-2 text-xs text-gray-400 text-center">
                        {'自動'}
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1 justify-center">
                            <button
                            onClick={() => onEdit(log)}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="修正"
                            >
                            <Pencil size={16} />
                            </button>
                            <button
                            onClick={() => onDelete(log.id)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="削除"
                            >
                            <Trash2 size={16} />
                            </button>
                        </div>
                      </td>
                    </tr>
                 );
              })}
              {logs.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center text-gray-400">履歴なし</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
