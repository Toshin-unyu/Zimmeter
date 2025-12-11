import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Maximize2, Download, Loader2 } from 'lucide-react';
import { ChartPreviewModal } from './ChartPreviewModal';

interface ChartWrapperProps {
  title: string | ReactNode;
  children: ReactNode;
  className?: string;
  isLoading?: boolean;
  headerContent?: ReactNode;
  previewTitle?: string;
}

export const ChartWrapper = ({ title, children, className = '', isLoading = false, headerContent, previewTitle }: ChartWrapperProps) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!chartRef.current) return;
    
    try {
      setIsDownloading(true);

      // Attempt to find SVG
      const svgElement = chartRef.current.querySelector('svg');
      
      if (!svgElement) {
         throw new Error('SVG Element not found');
      }

      // Serialize SVG
      const serializer = new XMLSerializer();
      let source = serializer.serializeToString(svgElement);

      // Ensure namespace
      if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
         source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      
      // Load into Image
      const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
         const canvas = document.createElement('canvas');
         // Scale for better quality (Retina etc)
         const scale = 2; 
         const width = svgElement.clientWidth || svgElement.getBoundingClientRect().width;
         const height = svgElement.clientHeight || svgElement.getBoundingClientRect().height;

         canvas.width = width * scale;
         canvas.height = height * scale;
         
         const ctx = canvas.getContext('2d');
         if (ctx) {
            // Fill White Background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Draw Image
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Download
            const titleStr = (typeof previewTitle === 'string' ? previewTitle : (typeof title === 'string' ? title : 'chart'));
            const pngUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = pngUrl;
            link.download = `${titleStr.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
         }
         
         URL.revokeObjectURL(url);
         setIsDownloading(false);
      };

      img.onerror = (e) => {
         console.error('SVG Image load failed', e);
         alert('画像の生成に失敗しました (SVG Load Error)');
         URL.revokeObjectURL(url);
         setIsDownloading(false);
      };

      img.src = url;
    } catch (error) {
      console.error('Failed to download chart:', error);
      alert('画像の保存に失敗しました。');
      setIsDownloading(false);
    }
  };

  return (
    <>
      <div className={`bg-white rounded-lg border border-slate-100 p-3 overflow-hidden flex flex-col shadow-sm ${className}`}>
        <div className="flex items-center justify-between mb-2 shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
             {typeof title === 'string' ? <h4 className="text-sm font-semibold text-slate-700 truncate">{title}</h4> : title}
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {headerContent}
            <div className="flex items-center gap-1 border-l border-gray-100 pl-2">
              <button
                onClick={() => setIsPreviewOpen(true)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="拡大表示"
                disabled={isLoading}
              >
                <Maximize2 size={16} />
              </button>
              <button
                onClick={handleDownload}
                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                title="画像として保存"
                disabled={isLoading || isDownloading}
              >
                {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 min-h-0 relative" ref={chartRef}>
           <div className="w-full h-full bg-white">
            {children}
           </div>
        </div>
      </div>

      <ChartPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={previewTitle || (typeof title === 'string' ? title : 'Chart Preview')}
      >
        {children}
      </ChartPreviewModal>
    </>
  );
};
