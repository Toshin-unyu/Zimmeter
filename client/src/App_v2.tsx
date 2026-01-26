import { useState, useEffect, useMemo, useRef } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, History, AlertCircle, Pencil, Square, LogOut, RotateCcw } from 'lucide-react';
import { getCategoryColor } from './lib/constants';
import type { Category } from './lib/constants';
import { api } from './lib/axios';
import { TaskButton } from './components/TaskButton';
import { SettingsModal } from './components/SettingsModal';
import { HistoryModal } from './components/HistoryModal';
import { EditLogModal } from './components/EditLogModal';
import { LoginModal } from './components/LoginModal';
import { CheckStatusModal } from './components/CheckStatusModal';
import { LeaveConfirmModal } from './components/LeaveConfirmModal';
import { StatusGuard } from './components/Common/StatusGuard';
import { TimeDecoration } from './components/Common/TimeDecoration';
import { TodayHistoryBar } from './components/Common/TodayHistoryBar';
import { useUserStatus } from './hooks/useUserStatus';
import { useTimer } from './hooks/useTimer';
import { AdminPage } from './pages/AdminPage';
import { ToastProvider, useToast } from './context/ToastContext';

const queryClient = new QueryClient();

// Types for API responses
interface WorkLog {
  id: number;
  userId: number; 
  categoryId: number; // Int
  categoryNameSnapshot: string; 
  startTime: string;
  endTime?: string | null;
  duration?: number | null;
  isManual?: boolean;
  isEdited?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface UserSettings {
  userId: number;
  preferences: {
    primaryButtons?: number[]; // IDs
    secondaryButtons?: number[];
    hiddenButtons?: number[];
  };
}

interface DailyStatusCheck {
    date: string;
    hasLeft: boolean;
    hasUnstoppedTasks: boolean;
    needsFix: boolean;
    isFixed: boolean;
}

function ZimmeterApp() {
  const queryClient = useQueryClient();
  const [uid, setUid] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showIdleAlert, setShowIdleAlert] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'main' | 'admin'>('main');
  const [editingLog, setEditingLog] = useState<WorkLog | null>(null);
  const [isAddingLog, setIsAddingLog] = useState(false);
  const [initialAddCategoryId, setInitialAddCategoryId] = useState<number | null>(null);
  const [hasLeftWork, setHasLeftWork] = useState(false);
  const [historyFilterCategoryId, setHistoryFilterCategoryId] = useState<number | null>(null);
  const [showUserCard, setShowUserCard] = useState(false);
  const userCardRef = useRef<HTMLDivElement>(null);

  // Undo Leave State
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);

  const { data: userStatus } = useUserStatus(!!uid);
  const { showToast } = useToast();
  const prevUserRef = useRef<typeof userStatus>(undefined);
  const opRateLimitRef = useRef<number>(0);

  // Cleanup timer
  useEffect(() => {
    // No timer cleanup needed anymore
  }, []);

  // Close user card when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userCardRef.current && !userCardRef.current.contains(event.target as Node)) {
        setShowUserCard(false);
      }
    };
    if (showUserCard) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserCard]);

  // Monitor User Info Changes
  useEffect(() => {
    if (!userStatus) return;
    
    if (prevUserRef.current) {
        const prev = prevUserRef.current;
        // Only if it's the same user session
        if (prev.id === userStatus.id) {
            const hasChanged = 
                prev.name !== userStatus.name || 
                prev.role !== userStatus.role || 
                prev.hourlyRate !== userStatus.hourlyRate;
            
            if (hasChanged) {
                showToast('管理者により情報が更新されました', 'info');
            }
        }
    }
    prevUserRef.current = userStatus;
  }, [userStatus, showToast]);

  // Initialize UID
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pUid = params.get('uid');
    if (pUid) {
      setUid(pUid);
      localStorage.setItem('zimmeter_uid', pUid);
    } else {
      const stored = localStorage.getItem('zimmeter_uid');
      if (stored) setUid(stored);
      else setShowLoginModal(true);
    }
  }, []);

  // Fetch today's leave status from server (authoritative source)
  const todayStatusQuery = useQuery({
    queryKey: ['todayStatus', uid],
    queryFn: async () => {
      const res = await api.get<{ hasLeft: boolean; date: string }>('/status/today');
      return res.data;
    },
    enabled: !!uid,
    staleTime: 1000 * 60, // Cache for 1 minute
  });

  // Sync hasLeftWork state with server response
  useEffect(() => {
    if (todayStatusQuery.data) {
      setHasLeftWork(todayStatusQuery.data.hasLeft);
      // Also sync localStorage for immediate feedback on next load
      if (todayStatusQuery.data.hasLeft) {
        localStorage.setItem('zimmeter_last_left_date', new Date().toLocaleDateString());
      } else {
        localStorage.removeItem('zimmeter_last_left_date');
      }
    }
  }, [todayStatusQuery.data]);

  const handleLogin = (username: string) => {
    setUid(username);
    localStorage.setItem('zimmeter_uid', username);
    setShowLoginModal(false);
  };

  // 1. Fetch Categories
  const categoriesQuery = useQuery({
    queryKey: ['categories', uid],
    queryFn: async () => {
      const res = await api.get<Category[]>('/categories');
      // Assign colors on frontend
      return res.data.map(c => ({
        ...c,
        ...getCategoryColor(c)
      }));
    },
    enabled: !!uid, 
    refetchInterval: 3000,
  });

  // 2. Fetch Active Log
  const activeLogQuery = useQuery({
    queryKey: ['activeLog', uid],
    queryFn: async () => {
      if (!uid) return null;
      const res = await api.get<WorkLog | null>(`/logs/active`);
      return res.data;
    },
    enabled: !!uid,
    refetchInterval: 3000,
  });

  // Idle Alert
  useEffect(() => {
    if (activeLogQuery.isLoading) return;
    if (activeLogQuery.data) {
        setShowIdleAlert(false);
        return;
    }
    // Only show idle alert if NOT left work
    if (!hasLeftWork) {
        const timer = setTimeout(() => setShowIdleAlert(true), 30000);
        return () => clearTimeout(timer);
    }
  }, [activeLogQuery.data, activeLogQuery.isLoading, hasLeftWork]);

  // 3. Fetch Settings
  const settingsQuery = useQuery({
    queryKey: ['settings', uid],
    queryFn: async () => {
      if (!uid) return null;
      try {
        const res = await api.get<UserSettings | null>(`/settings`);
        return res.data;
      } catch { return null; }
    },
    enabled: !!uid,
    refetchInterval: 3000,
  });

  // 4. Fetch History (always fetch for today history bar)
  const historyQuery = useQuery({
      queryKey: ['history', uid],
      queryFn: async () => {
          if (!uid) return [];
          const res = await api.get<WorkLog[]>(`/logs/history`);
          return res.data;
      },
      enabled: !!uid,
      refetchInterval: 3000, // 每3秒更新一次
  });

  // 5. Check Daily Status (Yesterday's check)
  const checkStatusQuery = useQuery({
      queryKey: ['statusCheck', uid],
      queryFn: async () => {
          if (!uid) return null;
          try {
             const res = await api.get<DailyStatusCheck>('/status/check');
             return res.data;
          } catch { return null; }
      },
      enabled: !!uid && activeTab === 'main',
      staleTime: 1000 * 60 * 60, // Check once per session usually, or infrequent
  });

  // Merge Categories & Settings
  const { primaryButtons, secondaryButtons } = useMemo(() => {
    const allCats = categoriesQuery.data || [];
    const prefs = settingsQuery.data?.preferences || {};
    
    // Create copies to avoid mutating original preferences
    let primaryIds = [...(prefs.primaryButtons || [])];
    let secondaryIds = [...(prefs.secondaryButtons || [])];
    const hiddenIds = prefs.hiddenButtons || [];

    const sorted = [...allCats].sort((a, b) => a.priority - b.priority);

    // Special logic for admin: ALWAYS use system defaults (plus their own custom items)
    if (userStatus?.role === 'ADMIN') {
        primaryIds = sorted.filter(c => c.defaultList === 'PRIMARY').map(c => c.id);
        secondaryIds = sorted.filter(c => c.defaultList !== 'PRIMARY' && c.defaultList !== 'HIDDEN').map(c => c.id);
    } else if (primaryIds.length === 0 && secondaryIds.length === 0) {
       // New user: show SYSTEM categories with their defaultList settings
       primaryIds = sorted.filter(c => c.type === 'SYSTEM' && c.defaultList === 'PRIMARY').map(c => c.id);
       secondaryIds = sorted.filter(c => c.type === 'SYSTEM' && c.defaultList !== 'PRIMARY' && c.defaultList !== 'HIDDEN').map(c => c.id);
    } else {
      // Merge logic: Find SYSTEM items that exist in allCats but are NOT in user preferences AND are not explicitly hidden
      const orphanCats = sorted.filter(c => 
        c.type === 'SYSTEM' && 
        !primaryIds.includes(c.id) && 
        !secondaryIds.includes(c.id) &&
        !hiddenIds.includes(c.id)
      );
      
      orphanCats.forEach(c => {
        const shouldShow = c.defaultList === 'PRIMARY' || c.defaultList === 'SECONDARY';
        
        if (shouldShow) {
          if (c.defaultList === 'PRIMARY') {
            primaryIds.push(c.id);
          } else {
            secondaryIds.push(c.id);
          }
        }
      });
    }

    const result = {
        primaryButtons: primaryIds
            .map(id => allCats.find(c => c.id === id))
            .filter((c) => c !== undefined) as Category[],
            
        secondaryButtons: secondaryIds
            .map(id => allCats.find(c => c.id === id))
            .filter((c) => c !== undefined) as Category[],
    };
    
    return result;
  }, [categoriesQuery.data, settingsQuery.data, userStatus]);

  const switchMutation = useMutation({
    mutationFn: async (data: { categoryId: number }) => {
      return api.post('/logs/switch', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeLog', uid] });
      queryClient.invalidateQueries({ queryKey: ['history', uid] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      return api.post('/logs/stop', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeLog', uid] });
      queryClient.invalidateQueries({ queryKey: ['history', uid] });
    },
  });

  const leaveWorkMutation = useMutation({
      mutationFn: async () => {
          return api.post('/status/leave', {});
      },
      onSuccess: (res) => {
          queryClient.invalidateQueries({ queryKey: ['activeLog', uid] });
          queryClient.invalidateQueries({ queryKey: ['history', uid] });
          queryClient.invalidateQueries({ queryKey: ['statusCheck', uid] });
          queryClient.invalidateQueries({ queryKey: ['todayStatus', uid] });
          
          // Set state
          setHasLeftWork(true);
          
          // Fallback for date if server doesn't return it (e.g. stale server process)
          let date = res.data.date;
          if (!date) {
            console.warn('Server did not return date, using client-side fallback');
            const now = new Date();
            // Simple check: if < 5 AM, treat as yesterday (matching server logic roughly)
            if (now.getHours() < 5) {
                const y = new Date();
                y.setDate(y.getDate() - 1);
                // Format YYYY-MM-DD
                date = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
            } else {
                date = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
            }
          }
          
          console.log('Leave Work Date set to:', date);

          // Persist to localStorage
          const today = new Date().toLocaleDateString();
          localStorage.setItem('zimmeter_last_left_date', today);
          
          showToast('退社しました。お疲れ様でした。', 'success');
          setShowIdleAlert(false);
      },
      onError: () => {
          showToast('退社処理に失敗しました', 'error');
      }
  });

  const resumeWorkMutation = useMutation({
    mutationFn: async () => {
        return api.post('/status/resume', {});
    },
    onSuccess: () => {
        // Unlock screen immediately
        setHasLeftWork(false);
        localStorage.removeItem('zimmeter_last_left_date');
        showToast('業務を再開しました', 'success');
        
        // Refresh data
        queryClient.invalidateQueries({ queryKey: ['activeLog', uid] });
        queryClient.invalidateQueries({ queryKey: ['statusCheck', uid] });
        queryClient.invalidateQueries({ queryKey: ['todayStatus', uid] });
    },
    onError: () => {
        showToast('業務再開に失敗しました', 'error');
    },
    onSettled: () => {
        // Re-enable UI if needed
    }
  });

  const handleResumeWork = () => {
    if (window.confirm('退社を取り消して業務を再開しますか？')) {
        resumeWorkMutation.mutate();
    }
  };

  const handleTaskSwitch = (catId: number) => {
    // Global Rate Limit Check
    const now = Date.now();
    if (now - opRateLimitRef.current < 800) {
        showToast('操作が頻繁すぎます。再度お試しください。', 'error');
        return;
    }
    
    setShowIdleAlert(false);

    // Prevent consecutive clicks if already active (server state)
    if (activeLogQuery.data?.categoryId === catId) return;

    // Check if there is an active task running
    if (activeLogQuery.data) {
      const ok = window.confirm('現在進行中のタスクを終了し、新しいタスクを開始しますか？');
      if (!ok) return;
    }

    if (switchMutation.isPending) return;

    // Update operation time only on valid execution attempt
    opRateLimitRef.current = now;
    switchMutation.mutate({ categoryId: catId });
  };

  const handleHistoryDoubleClick = (catId: number) => {
    setHistoryFilterCategoryId(catId);
    setShowHistory(true);
  };

  const handleTaskStop = () => {
    setShowIdleAlert(false);
    stopMutation.mutate();
  };

  const handleLeaveWork = () => {
    setIsLeaveConfirmOpen(true);
  };

  const confirmLeaveWork = () => {
    leaveWorkMutation.mutate();
  };

  const { formattedTime } = useTimer(activeLogQuery.data?.startTime ?? null);

  if (!uid && !showLoginModal) return <div className="p-10">Loading...</div>;

  // Header z-index logic:
  // For ADMIN who has left work, header must be above overlay (z-[101]) to allow tab switching.
  // Otherwise default z-20 is fine.
  const headerZIndex = (hasLeftWork && userStatus?.role === 'ADMIN') ? 'z-[101]' : 'z-20';

  // Overlay visibility logic:
  // Show if hasLeftWork is true
  // BUT if ADMIN, only show on 'main' tab (hide on 'admin' tab)
  const showLeaveOverlay = hasLeftWork && (userStatus?.role !== 'ADMIN' || activeTab === 'main');

  return (
    <div className="min-h-screen bg-[#F4F6F8] text-gray-800 font-sans">
        <StatusGuard />
        {/* Header */}
        <header className={`bg-white border-b border-gray-200 px-4 lg:px-6 h-16 flex justify-between items-center sticky top-0 ${headerZIndex} whitespace-nowrap`}>
            <div className="flex items-center gap-2 lg:gap-8 overflow-hidden">
                <div className="flex items-center gap-3 shrink-0">
                    {/* Branding: [Icon] | [Name] */}
                    <div className="flex items-center gap-3">
                        <div className="bg-gray-100 p-2 rounded-lg flex items-center justify-center w-10 h-10 shadow-sm">
                            {/* T-Shield Icon */}
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-gray-800">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                <path d="M9 9h6"></path>
                                <path d="M12 9v8"></path>
                            </svg>
                        </div>
                        <div className="h-6 w-px bg-gray-200 mx-3"></div>
                        <span className="text-xl font-bold tracking-[0.02em] text-gray-900 hidden sm:block">Zimmeter</span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center border border-gray-200 rounded-md ml-4 shrink-0">
                    <button
                        onClick={() => setActiveTab('main')}
                        className={`px-3 lg:px-4 py-1.5 rounded-l-md text-xs lg:text-sm font-medium transition-colors ${
                            activeTab === 'main'
                                ? 'bg-slate-800 text-white'
                                : 'text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        メイン
                    </button>
                    {userStatus?.role === 'ADMIN' && (
                        <button
                            onClick={() => setActiveTab('admin')}
                            className={`px-3 lg:px-4 py-1.5 rounded-r-md text-xs lg:text-sm font-medium transition-colors ${
                                activeTab === 'admin'
                                    ? 'bg-slate-800 text-white'
                                    : 'text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            管理画面
                        </button>
                    )}
                </div>
            </div>

            <div className="flex gap-4 shrink-0 items-center">
                {/* App Specific Actions */}
                <div className="flex gap-2 mr-2 border-r border-gray-200 pr-4">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={`p-2 rounded-md transition-colors ${showHistory ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100'}`}
                        title="履歴"
                    >
                        <History size={20} />
                    </button>
                    <a
                        href={`${api.defaults.baseURL}/export/csv?uid=${uid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                        title="CSVエクスポート"
                    >
                        <Download size={20} />
                    </a>

                    <button
                        onClick={handleLeaveWork}
                        className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-all shadow-sm hover:shadow-md font-bold ml-1 border border-orange-600"
                        title="退社する"
                    >
                        <LogOut size={18} />
                        <span className="hidden lg:inline text-sm">退社</span>
                    </button>
                </div>

                {/* Common Toolbar: [Avatar] [Settings] [Bell] [Logout] */}
                <div className="flex items-center gap-4">
                    {/* Avatar with User Card */}
                    <div className="relative" ref={userCardRef}>
                        <button
                            onClick={() => setShowUserCard(!showUserCard)}
                            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shadow-sm hover:bg-gray-200 transition-colors"
                            title="ユーザー情報"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </button>

                        {/* User Info Card */}
                        {showUserCard && (
                            <div className="absolute right-0 top-12 bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-[200px] z-50">
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wider">UID / Name</p>
                                        <p className="text-sm font-medium text-gray-800">{uid}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wider">Role</p>
                                        <p className="text-sm font-medium text-gray-800">
                                            {userStatus?.role === 'ADMIN' ? 'ADMIN' : 'USER'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wider">Status</p>
                                        <p className={`text-sm font-medium ${hasLeftWork ? 'text-gray-500' : activeLogQuery.data ? 'text-green-600' : 'text-yellow-600'}`}>
                                            {hasLeftWork ? '退社済み' : activeLogQuery.data ? '業務中' : '待機中'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Settings */}
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shadow-sm hover:bg-gray-200 transition-colors"
                        title="設定"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>


                    {/* Logout (Reset ID) */}
                    <button
                        onClick={() => {
                            if(window.confirm('ログアウトしますか？')) {
                                localStorage.removeItem('zimmeter_uid');
                                setUid('');
                                setShowLoginModal(true);
                            }
                        }}
                        className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shadow-sm hover:bg-gray-200 transition-colors"
                        title="ログアウト"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </div>
        </header>

        <main className="container mx-auto p-4 md:p-6">
            {activeTab === 'admin' ? (
                <AdminPage />
            ) : (
                <>
                    {/* Status Bar */}
                    <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 border border-gray-100">
                        <div className="flex items-center gap-4 w-full">
                            <div className={`w-3 h-3 rounded-full animate-pulse ${activeLogQuery.data ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            <div>
                                <p className="text-sm text-gray-400 font-medium uppercase tracking-wider">Current Task</p>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-3xl font-bold text-gray-800">
                                        {activeLogQuery.data ? activeLogQuery.data.categoryNameSnapshot : '計測待機中'}
                                    </h2>
                                    {activeLogQuery.data && (
                                        <button
                                            onClick={() => setEditingLog(activeLogQuery.data)}
                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                            title="修正"
                                        >
                                            <Pencil size={20} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="text-right">
                                <div className="text-5xl font-mono font-light tracking-tight text-slate-700 tabular-nums">
                                    {formattedTime}
                                </div>
                            </div>
                            {activeLogQuery.data && (
                                <button
                                    onClick={handleTaskStop}
                                    className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
                                    title="業務停止"
                                >
                                    <Square size={20} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Primary Buttons */}
                    <div className="mb-8">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 px-1">Main Actions</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {primaryButtons.map(cat => (
                                <TaskButton
                                    key={cat.id}
                                    category={cat}
                                    isActive={activeLogQuery.data?.categoryId === cat.id}
                                    onClick={() => handleTaskSwitch(cat.id)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Secondary Buttons */}
                    {secondaryButtons.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 px-1">Other Actions</h3>
                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {secondaryButtons.map(cat => (
                                    <TaskButton
                                        key={cat.id}
                                        category={cat}
                                        isActive={activeLogQuery.data?.categoryId === cat.id}
                                        onClick={() => handleTaskSwitch(cat.id)}
                                        onDoubleClick={() => handleHistoryDoubleClick(cat.id)}
                                        className="h-16 text-sm"
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 营业时间栏 */}
                    <TimeDecoration />
                    
                    {/* 本日履历栏 */}
                    <TodayHistoryBar
                      logs={historyQuery.data || []}
                      mergedCategories={categoriesQuery.data?.reduce((acc, c) => ({...acc, [c.id]: c}), {}) || {}}
                      onItemDoubleClick={handleHistoryDoubleClick}
                    />
                </>
            )}
        </main>

        <HistoryModal
            isOpen={showHistory}
            onClose={() => {
                setShowHistory(false);
                setHistoryFilterCategoryId(null);
            }}
            logs={historyQuery.data || []}
            onEdit={(log) => setEditingLog(log)}
            onAdd={() => setIsAddingLog(true)}
            mergedCategories={categoriesQuery.data?.reduce((acc, c) => ({...acc, [c.id]: c}), {}) || {}}
            filterCategoryId={historyFilterCategoryId}
            onClearFilter={() => setHistoryFilterCategoryId(null)}
            onItemDoubleClick={handleHistoryDoubleClick}
        />

        <EditLogModal
            isOpen={!!editingLog}
            onClose={() => setEditingLog(null)}
            mode="edit"
            log={editingLog}
            categories={categoriesQuery.data || []}
            uid={uid}
        />

        <EditLogModal
            isOpen={isAddingLog}
            onClose={() => {
                setIsAddingLog(false);
                setInitialAddCategoryId(null);
            }}
            mode="create"
            log={null}
            categories={categoriesQuery.data || []}
            uid={uid}
            initialCategoryId={initialAddCategoryId}
        />

        {isSettingsOpen && (
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => {
                    setIsSettingsOpen(false);
                    // Force refresh data to ensure new categories appear immediately
                    queryClient.invalidateQueries({ queryKey: ['categories', uid] });
                    queryClient.invalidateQueries({ queryKey: ['settings', uid] });
                }}
                uid={uid}
                categories={categoriesQuery.data || []}
                initialPrimary={primaryButtons.map(c => c.id)}
                initialSecondary={secondaryButtons.map(c => c.id)}
            />
        )}

        <CheckStatusModal 
            isOpen={!!checkStatusQuery.data?.needsFix}
            onClose={() => {
                // If closed without fix, we might want to re-check or just let it close
                // But the modal itself has a 'Fix' button which closes it on success.
                // If user clicks backdrop (if allowed), it closes. 
                // We should probably force user to interact, but the requirement says "Prompt reminder".
                // Let's assume closing is fine, it will pop up again next reload/time.
            }}
            statusData={checkStatusQuery.data || null}
            uid={uid}
        />

        <LeaveConfirmModal
            isOpen={isLeaveConfirmOpen}
            onClose={() => setIsLeaveConfirmOpen(false)}
            onConfirm={confirmLeaveWork}
        />

        <LoginModal 
            isOpen={showLoginModal}
            onSubmit={handleLogin}
        />

        {showIdleAlert && !activeLogQuery.data && !showLoginModal && !hasLeftWork && (
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

        {/* Leave Work Overlay */}
        {showLeaveOverlay && (
            <div className="fixed inset-0 bg-green-50/95 z-[100] flex flex-col items-center justify-center backdrop-blur-sm">
                <div className="bg-white p-10 rounded-3xl shadow-xl flex flex-col items-center border-4 border-green-100 max-w-lg mx-4">
                    <div className="bg-green-100 p-6 rounded-full mb-6 text-green-600 animate-pulse">
                        <LogOut size={48} />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">本日の業務は終了しました</h2>
                    <p className="text-gray-500 text-lg mb-8 text-center">
                        退社処理が完了しました。<br/>
                        今日も一日お疲れ様でした。
                    </p>

                    <div className="mt-4 flex flex-col items-center gap-4">
                        <button
                            onClick={handleResumeWork}
                            disabled={resumeWorkMutation.isPending}
                            className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-all font-bold hover:shadow-md active:scale-95"
                        >
                            <RotateCcw size={18} />
                            {resumeWorkMutation.isPending ? '処理中...' : '業務を再開する（退社取消）'}
                        </button>
                    </div>
                    
                    <div className="text-sm text-gray-400 mt-6">
                        ※明日になると自動的にリセットされます
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ZimmeterApp />
      </ToastProvider>
    </QueryClientProvider>
  );
}
