import { useState, useEffect, useMemo } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Download, History, AlertCircle } from 'lucide-react';
import { CATEGORIES, ROLE_PRESETS } from './lib/constants';
import type { CategoryId, Category } from './lib/constants';
import { api } from './lib/axios';
import { TaskButton } from './components/TaskButton';
import { SettingsModal } from './components/SettingsModal';
import { AwayModal } from './components/AwayModal';
import { EditLogModal } from './components/EditLogModal';
import { HistoryModal } from './components/HistoryModal';
import { LoginModal } from './components/LoginModal';
import { StatusGuard } from './components/Common/StatusGuard';
import { useTimer } from './hooks/useTimer';

const queryClient = new QueryClient();

// Types for API responses
interface WorkLog {
  id: number;
  uid: string;
  categoryId: string;
  categoryLabel: string;
  role?: string;
  startTime: string;
  endTime?: string | null;
  duration?: number | null;
  isManual: boolean;
}

interface UserSettings {
  uid: string;
  primaryButtons: string[];
  secondaryButtons: string[];
  customCategories?: { id: string; label: string; color: string; borderColor?: string }[];
}

function ZimmeterApp() {
  const queryClient = useQueryClient();
  const [uid, setUid] = useState<string>('');
  const [role, setRole] = useState<string>('common');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [awayLogId, setAwayLogId] = useState<number | null>(null);
  const [editingLog, setEditingLog] = useState<WorkLog | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showIdleAlert, setShowIdleAlert] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Initialize UID and Role
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pUid = params.get('uid');
    const pRole = params.get('role');

    if (pUid) {
      setUid(pUid);
      localStorage.setItem('zimmeter_uid', pUid);
    } else {
      const stored = localStorage.getItem('zimmeter_uid');
      if (stored && !stored.startsWith('user-')) {
        setUid(stored);
      } else {
        setShowLoginModal(true);
      }
    }

    if (pRole) {
      setRole(pRole);
      localStorage.setItem('zimmeter_role', pRole);
    } else {
        const stored = localStorage.getItem('zimmeter_role');
        if (stored) setRole(stored);
    }
  }, []);

  const handleLogin = (username: string) => {
    setUid(username);
    localStorage.setItem('zimmeter_uid', username);
    setShowLoginModal(false);
  };

  // Queries
  const activeLogQuery = useQuery({
    queryKey: ['activeLog', uid],
    queryFn: async () => {
      if (!uid) return null;
      const res = await api.get<WorkLog | null>(`/logs/active/${uid}`);
      return res.data;
    },
    enabled: !!uid,
    refetchInterval: 60000, // Re-sync every minute
  });

  // Idle Alert Timer
  useEffect(() => {
    if (activeLogQuery.isLoading) return;

    if (activeLogQuery.data) {
        setShowIdleAlert(false);
        return;
    }

    const timer = setTimeout(() => {
        setShowIdleAlert(true);
    }, 30000);

    return () => clearTimeout(timer);
  }, [activeLogQuery.data, activeLogQuery.isLoading]);

  const settingsQuery = useQuery({
    queryKey: ['settings', uid],
    queryFn: async () => {
        if (!uid) return null;
        try {
            const res = await api.get<UserSettings | null>(`/settings/${uid}`);
            return res.data;
        } catch {
            return null;
        }
    },
    enabled: !!uid,
  });

  const historyQuery = useQuery({
      queryKey: ['history', uid],
      queryFn: async () => {
          if (!uid) return [];
          const res = await api.get<WorkLog[]>(`/logs/history/${uid}`);
          return res.data;
      },
      enabled: !!uid && showHistory,
  });

  // Determine button layout
  const defaultSettings = useMemo(() => ({
      uid,
      primaryButtons: ROLE_PRESETS[role as keyof typeof ROLE_PRESETS]?.primary || ROLE_PRESETS.common.primary,
      secondaryButtons: ROLE_PRESETS[role as keyof typeof ROLE_PRESETS]?.secondary || ROLE_PRESETS.common.secondary,
      customCategories: [],
  }), [uid, role]);

  const currentSettings = settingsQuery.data || defaultSettings;

  const mergedCategories = useMemo<Record<string, Category>>(() => {
    let custom = currentSettings.customCategories;
    
    // Safety check for data format
    if (typeof custom === 'string') {
        try {
            custom = JSON.parse(custom);
            // Handle double-stringified JSON
            if (typeof custom === 'string') {
                custom = JSON.parse(custom);
            }
        } catch (e) {
            console.error('Failed to parse customCategories', e);
            custom = [];
        }
    }
    
    if (!Array.isArray(custom)) {
        custom = [];
    }
    
    // Filter out invalid items
    custom = custom.filter(c => c && typeof c === 'object' && 'id' in c);

    const customMap = custom.reduce((acc, cat) => ({ ...acc, [cat.id]: cat }), {});
    return { ...CATEGORIES, ...customMap };
  }, [currentSettings.customCategories]);

  const switchMutation = useMutation({
    mutationFn: async (data: { uid: string; categoryId: string; categoryLabel: string; role: string }) => {
      return api.post('/logs/switch', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeLog', uid] });
      queryClient.invalidateQueries({ queryKey: ['history', uid] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/logs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history', uid] });
      queryClient.invalidateQueries({ queryKey: ['activeLog', uid] });
    },
  });

  const handleDeleteLog = (id: number) => {
    if (window.confirm('この履歴を削除してもよろしいですか？')) {
      deleteMutation.mutate(id);
    }
  };

  const handleTaskSwitch = (catId: CategoryId) => {
    const category = mergedCategories[catId];
    if (!category) return;

    setShowIdleAlert(false);

    // Prevent consecutive clicks on the same category
    if (activeLogQuery.data?.categoryId === catId) {
        return;
    }

    // Check if coming back from away
    if (activeLogQuery.data?.categoryId === 'away' && catId !== 'away') {
        setAwayLogId(activeLogQuery.data.id);
    }

    switchMutation.mutate({
        uid,
        categoryId: catId,
        categoryLabel: category.label,
        role,
    });
  };

  const { formattedTime } = useTimer(activeLogQuery.data?.startTime ?? null);

  if (!uid && !showLoginModal) return <div className="p-10">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 text-gray-800 font-sans">
        <StatusGuard />
        {/* Header */}
        <header className="bg-white shadow px-6 py-4 flex justify-between items-center sticky top-0 z-20">
            <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold tracking-tight text-gray-700">Zimmeter</h1>
                <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-500">
                    <span>{uid}</span>
                    <span className="w-px h-3 bg-gray-300"></span>
                    <span>{role}</span>
                </div>
            </div>
            
            <div className="flex gap-2">
                <button 
                    onClick={() => setShowHistory(!showHistory)}
                    className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${showHistory ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}
                    title="履歴"
                >
                    <History />
                </button>
                <a 
                    href={`${api.defaults.baseURL}/export/csv`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    title="CSVエクスポート"
                >
                    <Download />
                </a>
                <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    title="設定"
                >
                    <Settings />
                </button>
            </div>
        </header>

        <main className="container mx-auto p-4 md:p-6 pb-32">
            
            {/* Status Bar */}
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 border border-gray-100">
                <div className="flex items-center gap-4 w-full">
                    <div className={`w-3 h-3 rounded-full animate-pulse ${activeLogQuery.data ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <div>
                        <p className="text-sm text-gray-400 font-medium uppercase tracking-wider">Current Task</p>
                        <h2 className="text-3xl font-bold text-gray-800">
                            {activeLogQuery.data ? activeLogQuery.data.categoryLabel : '計測待機中'}
                        </h2>
                    </div>
                </div>
                <div className="text-right w-full md:w-auto">
                    <div className="text-5xl font-mono font-light tracking-tight text-slate-700 tabular-nums">
                        {formattedTime}
                    </div>
                </div>
            </div>

            {/* Primary Buttons Grid */}
            <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 px-1">Main Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {currentSettings.primaryButtons.map(catId => {
                        const cat = mergedCategories[catId] || {
                            id: catId,
                            label: `不明: ${catId}`,
                            color: 'bg-gray-200 border-dashed border-gray-400 text-gray-400'
                        };
                        return (
                            <TaskButton
                                key={catId}
                                category={cat}
                                isActive={activeLogQuery.data?.categoryId === catId}
                                onClick={() => handleTaskSwitch(catId)}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Secondary Buttons Grid */}
            {currentSettings.secondaryButtons.length > 0 && (
                <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 px-1">Other Actions</h3>
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {currentSettings.secondaryButtons.map(catId => {
                            const cat = mergedCategories[catId] || {
                                id: catId,
                                label: `不明: ${catId}`,
                                color: 'bg-gray-200 border-dashed border-gray-400 text-gray-400'
                            };
                            return (
                                <TaskButton
                                    key={catId}
                                    category={cat}
                                    isActive={activeLogQuery.data?.categoryId === catId}
                                    onClick={() => handleTaskSwitch(catId)}
                                    className="h-16 text-sm"
                                />
                            );
                        })}
                    </div>
                </div>
            )}
        </main>

        <HistoryModal
            isOpen={showHistory}
            onClose={() => setShowHistory(false)}
            logs={historyQuery.data || []}
            onEdit={setEditingLog}
            onDelete={handleDeleteLog}
            mergedCategories={mergedCategories}
        />

        <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            uid={uid}
            initialPrimary={currentSettings.primaryButtons}
            initialSecondary={currentSettings.secondaryButtons}
            initialCustom={currentSettings.customCategories}
        />

        <AwayModal
            isOpen={!!awayLogId}
            onClose={() => setAwayLogId(null)}
            logId={awayLogId!}
        />

        <EditLogModal
            isOpen={!!editingLog}
            onClose={() => setEditingLog(null)}
            log={editingLog}
        />

        <LoginModal 
            isOpen={showLoginModal}
            onSubmit={handleLogin}
        />

        {showIdleAlert && !activeLogQuery.data && !showLoginModal && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 pointer-events-none transition-opacity duration-500">
                <div className="bg-white px-8 py-6 rounded-2xl shadow-2xl flex flex-col items-center pointer-events-auto animate-bounce border-2 border-red-100">
                    <div className="bg-red-100 p-3 rounded-full mb-3 text-red-500">
                        <AlertCircle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-1">業務項目を選択してください。</h3>
                    <p className="text-gray-500 text-sm">計測が開始されていません</p>
                    <button 
                        onClick={() => setShowIdleAlert(false)}
                        className="mt-4 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm font-medium"
                    >
                        閉じる
                    </button>
                </div>
            </div>
        )}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ZimmeterApp />
    </QueryClientProvider>
  );
}
