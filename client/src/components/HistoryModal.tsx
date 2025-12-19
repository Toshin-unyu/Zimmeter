import { X, Pencil, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
  isManual?: boolean;
  isEdited?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: WorkLog[];
  onEdit: (log: WorkLog) => void;
  onAdd: () => void;
  mergedCategories: Record<number, Category>;
  filterCategoryId: number | null;
  onClearFilter: () => void;
  onItemDoubleClick?: (categoryId: number) => void;
}

export const HistoryModal = ({ 
    isOpen, 
    onClose, 
    logs, 
    onEdit, 
    onAdd, 
    mergedCategories, 
    filterCategoryId, 
    onClearFilter, 
    onItemDoubleClick 
}: HistoryModalProps) => {
  if (!isOpen) return null;

  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getLogTypeInfo = (log: WorkLog) => {
    if (log.isManual) {
      if (log.isEdited) {
        return { 
          label: '作成済（変更済）', 
          color: 'bg-purple-100 text-purple-700',
          showTime: true 
        };
      }
      return { 
        label: '作成済', 
        color: 'bg-green-100 text-green-700',
        showTime: false 
      };
    }

    if (log.isEdited) {
      return { 
        label: '変更済', 
        color: 'bg-orange-100 text-orange-700',
        showTime: true 
      };
    }

    return { 
      label: '通常', 
      color: 'bg-gray-100 text-gray-600',
      showTime: false 
    };
  };

  const PIXELS_PER_MINUTE = 2;
  const MIN_HEIGHT_PX = 40;

  const getBlockHeight = (durationInSeconds: number) => {
    const minutes = durationInSeconds / 60;
    const height = minutes * PIXELS_PER_MINUTE;
    return Math.max(height, MIN_HEIGHT_PX);
  };

  const getDurationSeconds = (log: WorkLog) => {
    const startMs = new Date(log.startTime).getTime();
    const endMs = log.endTime ? new Date(log.endTime).getTime() : nowMs;

    if (log.endTime && typeof log.duration === 'number') return Math.max(0, log.duration);
    return Math.max(0, Math.floor((endMs - startMs) / 1000));
  };

  const timelineItems = useMemo(() => {
    const today = new Date(nowMs).toDateString();

    const filtered = logs
      .filter(log => {
        if (log.endTime && (log.duration || 0) === 0) return false;

        const logDate = new Date(log.startTime).toDateString();
        const isSameDay = logDate === today;
        const matchesFilter = filterCategoryId ? log.categoryId === filterCategoryId : true;
        return isSameDay && matchesFilter;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const items: Array<
      | { kind: 'task'; key: string; log: WorkLog; heightPx: number; durationSeconds: number }
      | { kind: 'break'; key: string; startTime: string; durationSeconds: number; heightPx: number }
    > = [];

    for (let i = 0; i < filtered.length; i++) {
      const log = filtered[i];
      const durationSeconds = getDurationSeconds(log);

      items.push({
        kind: 'task',
        key: `task-${log.id}`,
        log,
        durationSeconds,
        heightPx: getBlockHeight(durationSeconds),
      });

      const next = filtered[i + 1];
      if (!next) continue;
      if (!log.endTime) continue;

      const gapStartMs = new Date(log.endTime).getTime();
      const gapEndMs = new Date(next.startTime).getTime();
      const gapSeconds = Math.max(0, Math.floor((gapEndMs - gapStartMs) / 1000));
      if (gapSeconds <= 0) continue;

      items.push({
        kind: 'break',
        key: `break-${log.id}-${next.id}`,
        startTime: log.endTime,
        durationSeconds: gapSeconds,
        heightPx: getBlockHeight(gapSeconds),
      });
    }

    return items;
  }, [filterCategoryId, logs, nowMs]);

  const filterCategory = filterCategoryId ? mergedCategories[filterCategoryId] : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-gray-700">本日の履歴</h2>
              {filterCategory && (
                  <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full text-sm text-blue-700 border border-blue-100 animate-fadeIn">
                      <span className="font-bold">フィルタ: {filterCategory.name}</span>
                      <button 
                        onClick={onClearFilter} 
                        className="p-0.5 hover:bg-blue-100 rounded-full transition-colors"
                        title="フィルタを解除"
                      >
                          <X size={14}/>
                      </button>
                  </div>
              )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onAdd}
              className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
              title="追加"
              type="button"
            >
              <Plus size={16} />
              追加
            </button>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="flex flex-col gap-1">
            {timelineItems.map(item => {
              if (item.kind === 'break') {
                return (
                  <div key={item.key} className="flex">
                    <div className="w-20 shrink-0 pr-3 text-right font-mono text-xs text-gray-400 leading-none pt-1">
                      {formatTime(item.startTime)}
                    </div>
                    <div className="flex-1">
                      <div
                        className="border-l-4 border-gray-200 bg-gray-50/60 rounded-sm px-3 flex items-center text-xs text-gray-500"
                        style={{ height: `${item.heightPx}px` }}
                      >
                        Break ({formatDuration(item.durationSeconds)})
                      </div>
                    </div>
                  </div>
                );
              }

              const log = item.log;
              const cat = mergedCategories[log.categoryId];
              const { style } = getCategoryStyle(cat);
              const typeInfo = getLogTypeInfo(log);
              const isActive = !log.endTime;

              return (
                <div
                  key={item.key}
                  className="flex cursor-pointer"
                  onDoubleClick={() => onItemDoubleClick?.(log.categoryId)}
                >
                  <div className="w-20 shrink-0 pr-3 text-right font-mono text-sm text-gray-500 leading-none pt-1">
                    {formatTime(log.startTime)}
                  </div>
                  <div className="flex-1">
                    <div
                      className={`border-l-4 bg-gray-50 rounded-sm p-3 flex flex-col gap-2 ${isActive ? 'border-dashed' : ''}`}
                      style={{
                        height: `${item.heightPx}px`,
                        borderLeftColor: style?.backgroundColor || undefined,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-gray-700 font-semibold truncate">{log.categoryNameSnapshot}</div>
                          <div className="font-mono text-xs text-gray-500">
                            {isActive ? `進行中 (${formatDuration(item.durationSeconds)})` : formatDuration(item.durationSeconds)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isActive && (
                            <span className="inline-block px-2 py-0.5 text-[11px] rounded-full whitespace-nowrap bg-blue-100 text-blue-700">
                              Active
                            </span>
                          )}
                          <div className="flex flex-col items-end gap-1">
                            <span className={`px-2 py-0.5 text-[11px] rounded-full whitespace-nowrap ${typeInfo.color}`}>
                              {typeInfo.label}
                            </span>
                            {typeInfo.showTime && log.updatedAt && (
                              <span className="text-[10px] text-gray-400 font-mono">
                                {new Date(log.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onEdit(log);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="修正"
                            type="button"
                          >
                            <Pencil size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {timelineItems.length === 0 && (
              <div className="p-4 text-center text-gray-400">履歴なし</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
