import { Activity, Download } from 'lucide-react';

export const AdminWorkLogCharts = ({ 
  selectedUsers = [], 
  timeRange = 'daily',
  chartType = 'bar'
}: {
  selectedUsers?: number[];
  timeRange?: 'daily' | 'weekly' | 'monthly';
  chartType?: 'bar' | 'pie';
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-gray-700 flex items-center gap-2">
            <Activity size={20} />
            {chartType === 'bar' ? '棒グラフ' : '円グラフ'}
          </h3>
          <span className="text-xs text-gray-400">
            {selectedUsers.length > 0 ? `${selectedUsers.length} users` : 'No users selected'}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <Activity size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-sm">グラフ準備中...</p>
            <p className="text-xs mt-2">Chart Type: {chartType}</p>
            <p className="text-xs">Time Range: {timeRange}</p>
            <p className="text-xs">Selected Users: {selectedUsers.join(', ')}</p>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0">
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">CSVダウンロード</h4>
          <div className="flex items-center gap-2">
            <button
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
};
