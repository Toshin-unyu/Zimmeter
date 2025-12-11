import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface ChartPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export const ChartPreviewModal = ({ isOpen, onClose, title, children }: ChartPreviewModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-100 shrink-0">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 p-6 min-h-0 bg-gray-50">
           {/* Re-render the chart here. Ensure parent provides a container that allows the chart to fill space */}
           <div className="w-full h-full bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
             {children}
           </div>
        </div>
      </div>
    </div>
  );
};
