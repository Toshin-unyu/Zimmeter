import { Clock } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Category } from '../../lib/constants';
import { getCategoryStyle } from '../../lib/utils';

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

interface TodayHistoryBarProps {
  logs: WorkLog[];
  mergedCategories: Record<number, Category>;
  onItemDoubleClick?: (categoryId: number) => void;
}

export const TodayHistoryBar = ({ logs, mergedCategories, onItemDoubleClick }: TodayHistoryBarProps) => {
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

  const getLogType = (log: WorkLog) => {
    if (log.isManual) {
      if (log.isEdited) {
        return { label: '作成済（変更済）', color: 'bg-purple-100 text-purple-700' };
      }
      return { label: '作成済', color: 'bg-green-100 text-green-700' };
    }
    
    if (log.isEdited) {
      return { label: '変更済', color: 'bg-orange-100 text-orange-700' };
    }
    
    return { label: '通常', color: 'bg-gray-100 text-gray-600' };
  };

  const PIXELS_PER_MINUTE = 2;
  const MIN_HEIGHT_PX = 40;

  const getBlockHeight = (durationInSeconds: number) => {
    const minutes = durationInSeconds / 60;
    const height = minutes * PIXELS_PER_MINUTE;
    return Math.max(height, MIN_HEIGHT_PX);
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
        const logDate = new Date(log.startTime).toDateString();
        // 時間が0の履歴（終了済みかつ時間が0）は表示しない
        if (log.endTime && (log.duration || 0) === 0) return false;
        return logDate === today;
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
  }, [logs, nowMs]);

  return (
    <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-lg">
      {/* 标题栏 */}
      <div className="container mx-auto px-2 sm:px-4 py-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock size={16} />
          <span className="font-medium">本日履歴</span>
          <span className="text-xs text-gray-400">({timelineItems.filter(i => i.kind === 'task').length}件)</span>
        </div>
      </div>

      {/* 履历内容 - 始终显示 */}
      <div className="border-t border-gray-100">
        <div className="container mx-auto px-2 sm:px-4 py-3">
          <div className="max-h-[30vh] overflow-y-auto">
            <div className="flex flex-col">
              {timelineItems.map(item => {
                if (item.kind === 'break') {
                  return (
                    <div key={item.key} className="flex">
                      <div className="w-16 shrink-0 pr-2 text-right font-mono text-[10px] text-gray-400 leading-none pt-1">
                        {formatTime(item.startTime)}
                      </div>
                      <div className="flex-1">
                        <div
                          className="border-l-4 border-gray-200 bg-gray-50/60 rounded-sm px-2 flex items-center text-[10px] text-gray-500"
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
                const type = getLogType(log);
                const isActive = !log.endTime;

                return (
                  <div
                    key={item.key}
                    className="flex cursor-pointer"
                    onDoubleClick={() => onItemDoubleClick?.(log.categoryId)}
                  >
                    <div className="w-16 shrink-0 pr-2 text-right font-mono text-xs text-gray-500 leading-none pt-1">
                      {formatTime(log.startTime)}
                    </div>
                    <div className="flex-1">
                      <div
                        className={`border-l-4 bg-gray-50 rounded-sm p-2 flex flex-col gap-1 ${isActive ? 'border-dashed' : ''}`}
                        style={{
                          height: `${item.heightPx}px`,
                          borderLeftColor: style?.backgroundColor || undefined,
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-gray-700 font-medium truncate">
                            {log.categoryNameSnapshot}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {isActive && (
                              <span className="inline-block px-2 py-0.5 text-[10px] rounded-full whitespace-nowrap bg-blue-100 text-blue-700">
                                Active
                              </span>
                            )}
                            <span className={`inline-block px-2 py-0.5 text-[10px] rounded-full whitespace-nowrap ${type.color}`}>
                              {type.label}
                            </span>
                          </div>
                        </div>
                        <div className="font-mono text-[10px] text-gray-500">
                          {isActive ? `進行中 (${formatDuration(item.durationSeconds)})` : formatDuration(item.durationSeconds)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {timelineItems.length === 0 && (
                <div className="p-4 text-center text-gray-400 text-sm">本日の履歴はありません</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
