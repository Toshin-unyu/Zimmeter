import { useState, useEffect } from 'react';
import { X, Sparkles, Zap } from 'lucide-react';

interface ChangelogEntry {
  type: 'feat' | 'perf';
  label: string;
  description: string;
}

interface ChangelogDay {
  date: string;
  entries: ChangelogEntry[];
}

const TYPE_CONFIG = {
  feat: { icon: Sparkles, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: '新機能' },
  perf: { icon: Zap, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: '改善' },
};

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  const [changelog, setChangelog] = useState<ChangelogDay[] | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetch('/changelog.json')
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data: ChangelogDay[]) => { if (!cancelled) setChangelog(data); })
      .catch(() => { if (!cancelled) setChangelog([]); });
    return () => { cancelled = true; };
  }, [isOpen]);

  const loading = isOpen && changelog === null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">更新履歴</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              読み込み中...
            </div>
          ) : !changelog || changelog.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              更新履歴はありません
            </div>
          ) : (
            <div className="space-y-6">
              {changelog!.map((day) => (
                <div key={day.date}>
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">{day.date}</h3>
                  <div className="space-y-2">
                    {day.entries.map((entry, idx) => {
                      const config = TYPE_CONFIG[entry.type] || TYPE_CONFIG.feat;
                      const Icon = config.icon;
                      return (
                        <div key={idx} className={`flex items-start gap-3 px-3 py-2 rounded-lg ${config.bg} border ${config.border}`}>
                          <Icon size={16} className={`${config.color} mt-0.5 shrink-0`} />
                          <div className="flex-1 min-w-0">
                            <span className={`text-xs font-bold ${config.color} mr-2`}>{config.label}</span>
                            <span className="text-sm text-gray-700">{entry.description}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
