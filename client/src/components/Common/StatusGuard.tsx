import { useEffect, useState } from 'react';
import { useUserStatus } from '../../hooks/useUserStatus';
import { AlertTriangle, Ban } from 'lucide-react';
import { AxiosError } from 'axios';

export const StatusGuard = () => {
  const { data: user, error } = useUserStatus();
  const [lockedState, setLockedState] = useState<'DISABLED' | 'DELETED' | null>(null);

  useEffect(() => {
    if (user) {
      if (user.status === 'DISABLED') setLockedState('DISABLED');
      else if (user.status === 'DELETED') setLockedState('DELETED');
      else setLockedState(null);
    }

    // Handle 403 errors with status info
    if (error) {
      const axiosError = error as AxiosError<{ status: string }>;
      const status = axiosError.response?.data?.status;
      
      if (status === 'DISABLED') setLockedState('DISABLED');
      else if (status === 'DELETED') setLockedState('DELETED');
    }
  }, [user, error]);

  if (!lockedState) return null;

  if (lockedState === 'DISABLED') {
    return (
      <div className="fixed inset-0 z-[9999] bg-gray-900/95 flex items-center justify-center backdrop-blur-sm pointer-events-auto">
        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
          <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Ban className="w-8 h-8 text-gray-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">アカウントが無効化されました</h2>
          <p className="text-gray-500 mb-6">
            管理者によってアクセスが制限されています。<br/>
            復旧については管理者にお問い合わせください。
          </p>
        </div>
      </div>
    );
  }

  if (lockedState === 'DELETED') {
    return (
      <div className="fixed inset-0 z-[9999] bg-red-950/95 flex items-center justify-center backdrop-blur-sm pointer-events-auto">
        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center border-4 border-red-500">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">アカウントが削除されました</h2>
          <p className="text-gray-500 mb-6">
            このユーザーアカウントは完全に削除されました。<br/>
            操作を継続することはできません。
          </p>
        </div>
      </div>
    );
  }

  return null;
};
