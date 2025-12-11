import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import { Activity, Download, ChevronDown, Check } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { getCategoryColor, type Category } from '../../lib/constants';

interface User {
  id: number;
  uid: string;
  name: string;
  role: 'ADMIN' | 'USER';
}

interface TimeSeriesPoint {
  label: string;
  totalMinutes: number;
}

interface CategoryStat {
  categoryName: string;
  minutes: number;
}

interface StatsResponse {
  timeSeries: TimeSeriesPoint[];
  byCategory: CategoryStat[];
}

const MODES = [
  { key: 'day', label: '日別 (直近30日)' },
  { key: 'week', label: '週別 (直近12週)' },
  { key: 'month', label: '月別 (直近12ヶ月)' },
] as const;

type ModeKey = (typeof MODES)[number]['key'];

import { ChartWrapper } from '../Common/ChartWrapper';

export const AdminWorkLogCharts = () => {
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<ModeKey>('day');
  
  // CSVダウンロード用の期間state
  // デフォルト: 今月1日 ～ 今日
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [downloadStartDate, setDownloadStartDate] = useState(firstDay.toISOString().slice(0, 10));
  const [downloadEndDate, setDownloadEndDate] = useState(today.toISOString().slice(0, 10));

  const { data: users } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get<User[]>('/users');
      return res.data;
    },
  });

  // Initialize selection with first user if available and nothing selected
  useEffect(() => {
    if (users && users.length > 0 && selectedUserIds.length === 0) {
      setSelectedUserIds([users[0].id]);
    }
  }, [users]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<Category[]>('/categories');
      return res.data.map(c => ({
          ...c,
          ...getCategoryColor(c)
      }));
    },
    staleTime: 1000 * 60 * 5,
  });

  const effectiveUserIds = useMemo(() => {
      if (selectedUserIds.length > 0) return selectedUserIds;
      if (users && users.length > 0) return [users[0].id];
      return [];
  }, [selectedUserIds, users]);

  // Primary user for Single-User charts (Time Series)
  const primaryUserId = effectiveUserIds[0];

  // Query for Multi-User Stats (Pie Chart)
  const { data: multiStats, isLoading: isLoadingMulti } = useQuery<StatsResponse>({
    queryKey: ['logsStats', effectiveUserIds, mode],
    queryFn: async () => {
      if (effectiveUserIds.length === 0) throw new Error('No user selected');
      const res = await api.get<StatsResponse>('/logs/stats', {
        params: { userIds: effectiveUserIds.join(','), mode },
      });
      return res.data;
    },
    enabled: effectiveUserIds.length > 0,
  });

  // Query for Single-User Stats (Bar Chart)
  const { data: singleStats, isLoading: isLoadingSingle } = useQuery<StatsResponse>({
    queryKey: ['logsStats', [primaryUserId], mode],
    queryFn: async () => {
      if (!primaryUserId) throw new Error('No user selected');
      const res = await api.get<StatsResponse>('/logs/stats', {
        params: { userIds: String(primaryUserId), mode },
      });
      return res.data;
    },
    enabled: !!primaryUserId,
  });

  const totalMinutesMulti = multiStats?.byCategory.reduce((sum, c) => sum + c.minutes, 0) ?? 0;
  const totalMinutesSingle = singleStats?.timeSeries.reduce((sum, p) => sum + p.totalMinutes, 0) ?? 0;

  // Pie Chart Data Preparation (Multi User)
  const pieData = useMemo(() => {
    if (!multiStats?.byCategory) return [];
    
    return multiStats.byCategory.map(stat => {
        // Resolve color
        const category = categories?.find(c => c.name === stat.categoryName);
        // Fallback to name-based logic if category not found in DB list (e.g. deleted)
        const { color: twClass } = getCategoryColor(category || { name: stat.categoryName });
        
        let fill = '#cbd5e1'; // default slate-300
        
        // Tailwind Colors Map (Approximate for graph)
        const colorMap: Record<string, string> = {
            'bg-white': '#f8fafc',
            'bg-blue-100': '#60a5fa', // blue-400
            'bg-green-100': '#4ade80', // green-400
            'bg-orange-100': '#fb923c', // orange-400
            'bg-purple-100': '#c084fc', // purple-400
            'bg-pink-100': '#f472b6', // pink-400
            'bg-gray-100': '#94a3b8', // slate-400
            'bg-teal-50': '#2dd4bf', // teal-400
            'bg-slate-800': '#1e293b', // slate-800
        };
        
        const bgClassKey = category?.bgColor || twClass.split(' ').find(c => c.startsWith('bg-'));
        
        if (bgClassKey && colorMap[bgClassKey]) {
            fill = colorMap[bgClassKey];
        }

        return {
            name: stat.categoryName,
            value: stat.minutes,
            fill
        };
    }).sort((a, b) => b.value - a.value);
  }, [multiStats, categories]);

  // Display Name Logic
  const userNameForTitle = useMemo(() => {
    if (!users || effectiveUserIds.length === 0) return 'No User';
    if (effectiveUserIds.length === 1) {
        const u = users.find(user => user.id === effectiveUserIds[0]);
        return u ? `${u.name} (${u.role})` : 'Unknown User';
    }
    return `${effectiveUserIds.length} Users Selected`;
  }, [users, effectiveUserIds]);

  const detailedUserNames = useMemo(() => {
    if (!users || effectiveUserIds.length === 0) return 'No User';
    const names = effectiveUserIds.map(id => {
        const u = users.find(user => user.id === id);
        return u ? `${u.name} (${u.role})` : String(id);
    });
    return names.join(', ');
  }, [users, effectiveUserIds]);

  // Single User Name for Bar Chart Title
  const primaryUserName = useMemo(() => {
      const u = users?.find(user => user.id === primaryUserId);
      return u ? `${u.name} (${u.role})` : 'Unknown User';
  }, [users, primaryUserId]);

  const handleDownload = async () => {
    if (effectiveUserIds.length === 0) return;
    try {
      const res = await api.get('/export/csv', {
        params: {
          start: downloadStartDate,
          end: downloadEndDate,
          userIds: effectiveUserIds.join(','),
        },
        responseType: 'blob', // バイナリとして受け取る
      });

      // ブラウザでダウンロード発火
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // ファイル名にユーザーIDを含める
      const uidPart = effectiveUserIds.map(id => {
          const u = users?.find(user => user.id === id);
          return u ? u.uid : String(id);
      }).join('_');
        
      link.setAttribute('download', `work_logs_${uidPart}_${downloadStartDate}_${downloadEndDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download failed:', error);
      alert('CSVダウンロードに失敗しました');
    }
  };
  
  const toggleUserSelection = (id: number) => {
    setSelectedUserIds(prev => {
        if (prev.includes(id)) {
            // Don't allow empty selection, keep at least one if clicked
            if (prev.length === 1) return prev;
            return prev.filter(uid => uid !== id);
        } else {
            return [...prev, id];
        }
    });
  };

  const selectAllUsers = () => {
      if (users && users.length > 0) {
          if (selectedUserIds.length === users.length) {
              // Deselect all -> Revert to first user to ensure at least one is selected
              setSelectedUserIds([users[0].id]);
          } else {
              setSelectedUserIds(users.map(u => u.id));
          }
      }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
       {/* ... Header ... */}
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-gray-700 flex items-center gap-2">
            <Activity size={20} />
            業務実績グラフ
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center gap-2 relative" ref={dropdownRef}>
            <span className="text-gray-500">ユーザー:</span>
            
            <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center justify-between gap-2 border border-gray-300 rounded px-3 py-1.5 bg-white text-sm min-w-[200px] hover:border-gray-400 transition-colors"
            >
                <span className="truncate max-w-[180px]">
                    {userNameForTitle}
                </span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[300px] overflow-y-auto">
                    <div className="p-2 border-b border-gray-100 sticky top-0 bg-white z-10">
                         <button 
                            onClick={selectAllUsers}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 w-full text-left"
                         >
                            {users && selectedUserIds.length === users.length ? 'すべて解除' : 'すべて選択'}
                         </button>
                    </div>
                    <div className="p-1">
                        {users?.map((u) => (
                            <div 
                                key={u.id}
                                onClick={() => toggleUserSelection(u.id)}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer rounded"
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedUserIds.includes(u.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                    {selectedUserIds.includes(u.id) && <Check size={10} className="text-white" />}
                                </div>
                                <span className="text-sm text-gray-700">
                                    {u.name} <span className="text-gray-400 text-xs">({u.role})</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMode(m.key)}
                className={`px-2 py-1 rounded text-xs font-medium border ${
                  mode === m.key
                    ? 'bg-blue-50 border-blue-400 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4 p-4 min-h-0 overflow-y-auto">
        <ChartWrapper
            title="時間推移 (分)"
            previewTitle={`${primaryUserName} - 時間推移 (分)`}
            headerContent={
                <span className="text-xs text-slate-400">
                  {primaryUserName} - 合計 {Math.round(totalMinutesSingle / 60 * 10) / 10} 時間 ({totalMinutesSingle} 分)
                </span>
            }
            isLoading={isLoadingSingle}
            className="flex-1 min-h-[300px]"
        >
          {isLoadingSingle && <div className="flex h-full items-center justify-center text-gray-400 text-xs">読み込み中...</div>}
          {!isLoadingSingle && singleStats && singleStats.timeSeries.length === 0 && <div className="flex h-full items-center justify-center text-gray-400 text-xs">データがありません</div>}
          {!isLoadingSingle && singleStats && singleStats.timeSeries.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={singleStats.timeSeries} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 10, fill: '#64748b' }} 
                      axisLine={false}
                      tickLine={false}
                  />
                  <YAxis 
                      tick={{ fontSize: 10, fill: '#64748b' }} 
                      axisLine={false}
                      tickLine={false}
                  />
                  <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      cursor={{ fill: '#f1f5f9' }}
                  />
                  <Bar dataKey="totalMinutes" fill="#3b82f6" radius={[4, 4, 0, 0]} name="業務時間(分)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartWrapper>

        <ChartWrapper 
            title="業務項目別 割合 (複数選択可)" 
            previewTitle={`${detailedUserNames} - 業務項目別 割合`}
            headerContent={
                <span className="text-xs text-slate-400">
                  選択中ユーザー合計 {Math.round(totalMinutesMulti / 60 * 10) / 10} 時間 ({totalMinutesMulti} 分)
                </span>
            }
            isLoading={isLoadingMulti}
            className="flex-1 min-h-[300px]"
        >
          {isLoadingMulti && <div className="flex-1 flex items-center justify-center text-gray-400 text-xs">読み込み中...</div>}
          {!isLoadingMulti && multiStats && multiStats.byCategory.length === 0 && <div className="flex-1 flex items-center justify-center text-gray-400 text-xs">データがありません</div>}
          {!isLoadingMulti && pieData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                      <Pie
                          data={pieData}
                          cx="40%"
                          cy="50%"
                          innerRadius="40%"
                          outerRadius="70%"
                          paddingAngle={2}
                          dataKey="value"
                      >
                          {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                          ))}
                      </Pie>
                      <Tooltip 
                           contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                           formatter={(value: number) => [`${value}分`, '時間']}
                      />
                      <Legend 
                          layout="vertical" 
                          verticalAlign="middle" 
                          align="right"
                          wrapperStyle={{ fontSize: '11px', lineHeight: '14px' }}
                      />
                  </PieChart>
              </ResponsiveContainer>
          )}
        </ChartWrapper>
      </div>

      {/* CSV Download Area */}
      <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0">
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">CSVダウンロード</h4>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={downloadStartDate}
              onChange={(e) => setDownloadStartDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-700"
            />
            <span className="text-gray-400">～</span>
            <input
              type="date"
              value={downloadEndDate}
              onChange={(e) => setDownloadEndDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-700"
            />
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors ml-auto"
              title="CSVダウンロード"
            >
              <Download size={16} />
              ダウンロード
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

