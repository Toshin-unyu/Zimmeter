import type { Category } from '../lib/constants';
import clsx from 'clsx';
import { getCategoryStyle } from '../lib/utils';

interface TaskButtonProps {
  category: Category;
  isActive: boolean;
  onClick: () => void;
  onDoubleClick?: () => void;
  className?: string;
}

export const TaskButton = ({ category, isActive, onClick, onDoubleClick, className }: TaskButtonProps) => {
  const { className: colorClass, style } = getCategoryStyle(category);

  return (
    <button
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={style}
      className={clsx(
        "flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all w-full h-16 sm:h-24 shadow-sm hover:shadow-md cursor-pointer hover:brightness-95",
        colorClass,
        isActive ? "ring-4 ring-offset-2 ring-blue-500 scale-105 font-bold z-10 brightness-100" : "opacity-90 hover:opacity-100",
        className
      )}
    >
      <span className="text-lg">{category.name}</span>
    </button>
  );
};
