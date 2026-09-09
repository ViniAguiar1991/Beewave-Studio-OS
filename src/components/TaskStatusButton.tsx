import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useAppStore } from '../store';
import { getStatusBadgeStyle, getStatusLabel } from '../utils/badgeStyles';

interface TaskStatusButtonProps {
  taskId: string;
  status: string;
  size?: 'sm' | 'xs';
  className?: string;
}

export const TaskStatusButton: React.FC<TaskStatusButtonProps> = ({
  taskId,
  status,
  size = 'xs',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const setTaskStatus = useAppStore((s) => s.setTaskStatus);
  const storeStatuses = useAppStore((s) => s.statuses);

  const badge = getStatusBadgeStyle(status);
  const label = getStatusLabel(status);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectStatus = (e: React.MouseEvent, newStatusKey: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (newStatusKey !== status) {
      setTaskStatus(taskId, newStatusKey);
    }
    setIsOpen(false);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(!isOpen);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        title="Clique para alterar status rapidamente"
        className={`group inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-full border transition-all cursor-pointer hover:shadow-xs active:scale-95 ${
          badge.border
        } ${badge.text} ${
          size === 'sm' ? 'px-2.5 py-1 text-[10px]' : 'px-2 py-0.5 text-[9px]'
        } bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800`}
      >
        <span>{label}</span>
        <ChevronDown
          className={`h-2.5 w-2.5 opacity-60 group-hover:opacity-100 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-full mt-1.5 w-48 rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-64 overflow-y-auto"
        >
          <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/80 mb-1">
            Mudar Status
          </div>

          {storeStatuses.map((st) => {
            const isSelected = st.key === status;
            const itemBadge = getStatusBadgeStyle(st.key);

            return (
              <button
                key={st.key}
                type="button"
                onClick={(e) => handleSelectStatus(e, st.key)}
                className={`w-full text-left px-2.5 py-1.5 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: st.color || '#94a3b8' }}
                  />
                  <span className="truncate text-[11px]">{st.label}</span>
                </div>
                {isSelected && (
                  <Check className="h-3.5 w-3.5 text-amber-500 shrink-0 ml-1.5" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
