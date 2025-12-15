import { useState, useRef, useEffect } from 'react';
import { Users2, ChevronDown, Check } from 'lucide-react';

interface User {
  id: number;
  name: string;
  role: 'ADMIN' | 'USER';
}

interface UserMultiSelectDropdownProps {
  users: User[];
  selectedUsers: number[];
  onSelectionChange: (selectedIds: number[]) => void;
  placeholder?: string;
}

export const UserMultiSelectDropdown = ({ 
  users, 
  selectedUsers, 
  onSelectionChange,
  placeholder = "ユーザーを選択"
}: UserMultiSelectDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUserToggle = (userId: number) => {
    const newSelection = selectedUsers.includes(userId)
      ? selectedUsers.filter(id => id !== userId)
      : [...selectedUsers, userId];
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    const allUserIds = users.map(user => user.id);
    onSelectionChange(allUserIds);
    setIsOpen(false);
  };

  const handleClearAll = () => {
    onSelectionChange([]);
    setIsOpen(false);
  };

  const getSelectedUserNames = () => {
    const selected = users.filter(user => selectedUsers.includes(user.id));
    if (selected.length === 0) return placeholder;
    if (selected.length <= 3) {
      return selected.map(u => u.name).join(', ');
    }
    return `${selected.slice(0, 2).map(u => u.name).join(', ')} +${selected.length - 2} others`;
  };

  const isAllSelected = users.length > 0 && selectedUsers.length === users.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-2 mb-2">
        <Users2 size={16} className="text-gray-600" />
        <label className="text-sm font-medium text-gray-700">ユーザー選択</label>
        <span className="text-xs text-gray-400">({selectedUsers.length} selected)</span>
      </div>
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2 text-left bg-white border border-gray-300 rounded-lg shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      >
        <span className="truncate text-sm text-gray-900">
          {getSelectedUserNames()}
        </span>
        <ChevronDown 
          size={16} 
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
          {/* Header with actions */}
          <div className="p-2 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700">
              {selectedUsers.length} / {users.length} selected
            </span>
            <div className="flex gap-1">
              <button
                onClick={handleSelectAll}
                disabled={isAllSelected}
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                全て選択
              </button>
              <button
                onClick={handleClearAll}
                disabled={selectedUsers.length === 0}
                className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                クリア
              </button>
            </div>
          </div>

          {/* User list */}
          <div className="overflow-y-auto max-h-48">
            {users.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                ユーザーがいません
              </div>
            ) : (
              users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleUserToggle(user.id)}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    selectedUsers.includes(user.id)
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300'
                  }`}>
                    {selectedUsers.includes(user.id) && (
                      <Check size={10} className="text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {user.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {user.role}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
