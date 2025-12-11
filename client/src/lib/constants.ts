// client/src/lib/constants.ts

export type CategoryId = number;

export interface Category {
  id: CategoryId;
  name: string;
  type: 'SYSTEM' | 'CUSTOM';
  priority: number;
  defaultList?: 'PRIMARY' | 'SECONDARY' | 'HIDDEN';
  // UI helper props
  color?: string;
  borderColor?: string;
}

// UI Color Mapping Helper
export const getCategoryColor = (name: string): { color: string, borderColor?: string } => {
  if (name.includes('メール') || name.includes('チャット')) return { color: 'bg-blue-100 border-blue-300' };
  if (name.includes('実装') || name.includes('検証'))       return { color: 'bg-slate-800 text-white' };
  if (name.includes('会議'))       return { color: 'bg-orange-100 border-orange-300' };
  if (name.includes('資料'))       return { color: 'bg-green-100 border-green-300' };
  if (name.includes('商談') || name.includes('外出'))       return { color: 'bg-purple-100 border-purple-300' };
  if (name.includes('電話'))       return { color: 'bg-pink-100 border-pink-300' };
  if (name.includes('事務'))       return { color: 'bg-gray-100 border-gray-300' };
  if (name.includes('休憩'))       return { color: 'bg-teal-50 border-teal-200' };
  if (name.includes('離席') || name.includes('移動'))       return { color: 'bg-gray-300 border-gray-400' };
  
  return { color: 'bg-white border-gray-200' }; // Default
};

// Role Presets (UI display priority)
// DBのUserSettingがない場合のデフォルト表示順序として使用
export const DEFAULT_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9];

