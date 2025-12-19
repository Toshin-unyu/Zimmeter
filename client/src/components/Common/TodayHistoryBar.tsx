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

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getDurationSeconds = (log: WorkLog) => {
    const startMs = new Date(log.startTime).getTime();
    const endMs = log.endTime ? new Date(log.endTime).getTime() : nowMs;

    if (log.endTime && typeof log.duration === 'number') return Math.max(0, log.duration);
    return Math.max(0, Math.floor((endMs - startMs) / 1000));
  };

  const { hourGroups, taskCount } = useMemo(() => {
    const today = new Date(nowMs).toDateString();
    const filtered = logs
      .filter(log => {
        const logDate = new Date(log.startTime).toDateString();
        // 時間が0の履歴（終了済みかつ時間が0）は表示しない
        if (log.endTime && (log.duration || 0) === 0) return false;
        return logDate === today;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    type HourItem =
      | { kind: 'task'; key: string; log: WorkLog; durationSeconds: number; startTime: string }
      | { kind: 'break'; key: string; startTime: string; durationSeconds: number };

    const hourMap = new Map<number, HourItem[]>();
    const pushToHour = (timeString: string, item: HourItem) => {
      const hour = new Date(timeString).getHours();
      const list = hourMap.get(hour) ?? [];
      list.push(item);
      hourMap.set(hour, list);
    };

    for (let i = 0; i < filtered.length; i++) {
      const log = filtered[i];
      const durationSeconds = getDurationSeconds(log);
      pushToHour(log.startTime, {
        kind: 'task',
        key: `task-${log.id}`,
        log,
        durationSeconds,
        startTime: log.startTime,
      });

      const next = filtered[i + 1];
      if (!next) continue;
      if (!log.endTime) continue;

      const gapStartMs = new Date(log.endTime).getTime();
      const gapEndMs = new Date(next.startTime).getTime();
      const gapSeconds = Math.max(0, Math.floor((gapEndMs - gapStartMs) / 1000));
      if (gapSeconds <= 0) continue;

      pushToHour(log.endTime, {
        kind: 'break',
        key: `break-${log.id}-${next.id}`,
        startTime: log.endTime,
        durationSeconds: gapSeconds,
      });
    }

    const groups = [...hourMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([hour, items]) => {
        const label = `${hour.toString().padStart(2, '0')}:00`;
        const sorted = [...items].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        return { hour, label, items: sorted };
      });

    return { hourGroups: groups, taskCount: filtered.length };
  }, [logs, nowMs]);

  return (
    <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-lg">
      {/* 标题栏 */}
      <div className="container mx-auto px-2 sm:px-4 py-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock size={16} />
          <span className="font-medium">本日履歴</span>
          <span className="text-xs text-gray-400">({taskCount}件)</span>
        </div>
      </div>

      {/* 履历内容 - 始终显示 */}
      <div className="border-t border-gray-100">
        <div className="container mx-auto px-2 sm:px-4 py-3">
          <div className="max-h-[30vh] overflow-y-auto">
            <div className="flex flex-col gap-2">
              {hourGroups.map(group => (
                <div key={group.hour} className="flex">
                  <div className="w-16 shrink-0 pr-2 text-right font-mono text-xs text-gray-500 leading-none pt-1">
                    {group.label}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-1">
                      {group.items.map(item => {
                        if (item.kind === 'break') {
                          return (
                            <div
                              key={item.key}
                              className="border border-gray-200 bg-gray-50/60 rounded-sm px-2 py-1 text-[10px] text-gray-600"
                              title={`${formatTime(item.startTime)} Break (${formatDuration(item.durationSeconds)})`}
                            >
                              <span className="font-mono text-gray-500">{formatTime(item.startTime)}</span>
                              <span className="ml-1">Break</span>
                              <span className="ml-1 font-mono text-gray-500">{formatDuration(item.durationSeconds)}</span>
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
                            className={`border-l-4 border border-gray-200 bg-white rounded-sm px-2 py-1 text-[10px] text-gray-700 cursor-pointer ${
                              isActive ? 'border-dashed' : ''
                            }`}
                            style={{
                              borderLeftColor: style?.backgroundColor || undefined,
                            }}
                            onDoubleClick={() => onItemDoubleClick?.(log.categoryId)}
                            title={`${formatTime(log.startTime)} ${log.categoryNameSnapshot} (${formatDuration(item.durationSeconds)})`}
                          >
                            <div className="flex items-center gap-1 max-w-[18rem]">
                              <span className="font-mono text-gray-500 shrink-0">{formatTime(log.startTime)}</span>
                              <span className="font-medium truncate">{log.categoryNameSnapshot}</span>
                              <span className="font-mono text-gray-500 shrink-0">{formatDuration(item.durationSeconds)}</span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-1 shrink-0">
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
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {hourGroups.length === 0 && (
                <div className="p-4 text-center text-gray-400 text-sm">本日の履歴はありません</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
