import { UserList } from '../components/Admin/UserList';
import { MonitorTable } from '../components/Admin/MonitorTable';
import { ArrowLeft, LayoutDashboard, Settings } from 'lucide-react';

interface AdminPageProps {
  onBack: () => void;
}

export const AdminPage = ({ onBack }: AdminPageProps) => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-slate-900 text-white shadow-lg px-6 py-4 sticky top-0 z-20">
        <div className="flex justify-between items-center container mx-auto">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-300 hover:text-white"
              title="戻る"
            >
              <ArrowLeft />
            </button>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <LayoutDashboard className="text-blue-400" />
              Zimmeter Admin
            </h1>
          </div>
          <div className="flex items-center gap-4">
             {/* Admin specific header actions */}
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-120px)]">
          <div className="h-full overflow-hidden flex flex-col">
            <UserList />
          </div>
          <div className="h-full overflow-hidden flex flex-col">
            <MonitorTable />
          </div>
        </div>
      </main>
    </div>
  );
};
