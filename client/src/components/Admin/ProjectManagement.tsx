import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import { Plus, Pencil, Trash2, FolderOpen, Folder } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface Project {
  id: number;
  name: string;
  type: 'SYSTEM';
  priority: number;
  defaultList: 'PRIMARY' | 'SECONDARY' | 'HIDDEN';
  bgColor: string;
  borderColor: string;
  createdById: number;
}

const COLOR_PRESETS = [
  { name: '青', color: 'blue', bg: 'bg-blue-100', border: 'border-blue-300' },
  { name: '緑', color: 'green', bg: 'bg-green-100', border: 'border-green-300' },
  { name: '黄', color: 'yellow', bg: 'bg-yellow-100', border: 'border-yellow-300' },
  { name: '赤', color: 'red', bg: 'bg-red-100', border: 'border-red-300' },
  { name: '紫', color: 'purple', bg: 'bg-purple-100', border: 'border-purple-300' },
  { name: 'ピンク', color: 'pink', bg: 'bg-pink-100', border: 'border-pink-300' },
  { name: '橙', color: 'orange', bg: 'bg-orange-100', border: 'border-orange-300' },
  { name: '灰', color: 'gray', bg: 'bg-gray-100', border: 'border-gray-300' },
];

export const ProjectManagement = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
  const [targetList, setTargetList] = useState<'primary' | 'secondary'>('secondary');

  const { data: projects, isLoading } = useQuery({
    queryKey: ['admin-projects'],
    queryFn: async () => {
      const res = await api.get<Project[]>('/categories');
      return res.data.filter(p => p.type === 'SYSTEM');
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { 
      name: string; 
      type: 'SYSTEM';
      priority: number; 
      defaultList: string;
      bgColor: string;
      borderColor: string;
    }) => {
      return api.post('/categories', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setNewProjectName('');
      setSelectedColor(COLOR_PRESETS[0]);
      showToast('プロジェクトを作成しました', 'success');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.details || error.response?.data?.error || 'プロジェクトの作成に失敗しました';
      showToast(msg, 'error');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { 
      id: number; 
      name: string; 
      bgColor: string; 
      borderColor: string;
      defaultList: string;
    }) => {
      return api.put(`/categories/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setEditingProject(null);
      showToast('プロジェクトを更新しました', 'success');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.details || error.response?.data?.error || 'プロジェクトの更新に失敗しました';
      showToast(msg, 'error');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      showToast('プロジェクトを削除しました', 'success');
    },
    onError: () => {
      showToast('プロジェクトの削除に失敗しました', 'error');
    }
  });

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    
    const maxPriority = projects?.length ? Math.max(...projects.map(p => p.priority || 0)) : 0;
    const defaultList = targetList === 'primary' ? 'PRIMARY' : 'SECONDARY';
    
    createMutation.mutate({
      name: newProjectName.trim(),
      type: 'SYSTEM',
      priority: maxPriority + 10,
      defaultList,
      bgColor: selectedColor.bg,
      borderColor: selectedColor.border
    });
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setNewProjectName(project.name);
    setSelectedColor(COLOR_PRESETS.find(p => p.bg === project.bgColor) || COLOR_PRESETS[0]);
    setTargetList(project.defaultList === 'PRIMARY' ? 'primary' : 'secondary');
  };

  const handleUpdateProject = () => {
    if (!editingProject || !newProjectName.trim()) return;
    
    const defaultList = targetList === 'primary' ? 'PRIMARY' : 'SECONDARY';
    
    updateMutation.mutate({
      id: editingProject.id,
      name: newProjectName.trim(),
      bgColor: selectedColor.bg,
      borderColor: selectedColor.border,
      defaultList
    });
  };

  const handleDeleteProject = (id: number, name: string) => {
    if (window.confirm(`プロジェクト「${name}」を削除してもよろしいですか？\nすべてのユーザーのメイン画面からも削除されます。`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleCancelEdit = () => {
    setEditingProject(null);
    setNewProjectName('');
    setSelectedColor(COLOR_PRESETS[0]);
    setTargetList('secondary');
  };

  if (isLoading) return <div className="p-4">Loading projects...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
        <h3 className="font-bold text-gray-700 flex items-center gap-2">
          <FolderOpen size={20} />
          プロジェクト管理
        </h3>
        <span className="text-xs text-gray-400">{projects?.length} projects</span>
      </div>
      
      {/* Create/Edit Form */}
      <div className="p-4 border-b border-gray-100 bg-gray-50/50">
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder={editingProject ? "プロジェクト名を編集" : "新しいプロジェクト名"}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
            <select
              value={targetList}
              onChange={(e) => setTargetList(e.target.value as 'primary' | 'secondary')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            >
              <option value="primary">主要ボタン</option>
              <option value="secondary">副ボタン</option>
            </select>
          </div>
          
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-600">色:</span>
            <div className="flex gap-1">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.color}
                  onClick={() => setSelectedColor(preset)}
                  className={`w-6 h-6 rounded-full border-2 ${preset.bg} ${preset.border} ${
                    selectedColor.color === preset.color ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                  }`}
                  title={preset.name}
                />
              ))}
            </div>
          </div>
          
          <div className="flex gap-2">
            {editingProject ? (
              <>
                <button
                  onClick={handleUpdateProject}
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {updateMutation.isPending ? '更新中...' : '更新'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm"
                >
                  キャンセル
                </button>
              </>
            ) : (
              <button
                onClick={handleCreateProject}
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center gap-2"
              >
                <Plus size={16} />
                {createMutation.isPending ? '作成中...' : '作成'}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Project List */}
      <div className="flex-1 overflow-auto min-h-0">
        <div className="p-4 space-y-2">
          {projects?.map((project) => (
            <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${project.bgColor} ${project.borderColor} border-2`}></div>
                <div>
                  <div className="font-medium text-gray-900">{project.name}</div>
                  <div className="text-xs text-gray-400">
                    {project.defaultList === 'PRIMARY' ? '主要' : '副ボタン'} • 優先度: {project.priority}
                  </div>
                </div>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">ADMIN</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleEditProject(project)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="編集"
                >
                  <Pencil size={16} />
                </button>
                <button 
                  onClick={() => handleDeleteProject(project.id, project.name)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="削除"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          
          {projects?.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Folder size={48} className="mx-auto mb-2 text-gray-300" />
              <p>プロジェクトがありません</p>
              <p className="text-sm">新しいプロジェクトを作成してください</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
