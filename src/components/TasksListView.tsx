import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Search,
  Kanban,
  List,
  Calendar,
  CalendarDays,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Eye,
  Edit2,
  Trash2,
  Copy,
  User as UserIcon,
  X,
  AlertCircle,
  Hand,
  Check,
  Move,
  SlidersHorizontal,
  Download,
  Image as ImageIcon,
  Save,
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  parseISO,
  isSameDay,
  isBefore,
  startOfToday,
  endOfWeek as dateEndOfWeek,
  endOfMonth as dateEndOfMonth,
  addDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAppStore, useCurrentUser } from '../store';
import { getStatusBadgeStyle, getStatusLabel, getFormatLabel } from '../utils/badgeStyles';
import { formatFriendlyDate, formatStandardDate, formatFullBadgeDate, getDateDisplayPair, isTaskDelayed, isDateBeforeToday } from '../utils/dateFormatter';
import { TaskStatusKey, TaskStatus, Task, TableViewConfig } from '../types';
import { TaskStatusButton } from './TaskStatusButton';
import { syncTableViewConfigToCloud } from '../services/firestoreSync';

interface TasksListViewProps {
  onSelectTask: (taskId: string) => void;
  onNewTask: () => void;
  onSelectClient?: (clientId: string) => void;
  onOpenTrash?: () => void;
}

export type ColumnId =
  | 'client'
  | 'title'
  | 'attachments'
  | 'category'
  | 'assignee'
  | 'status'
  | 'postDate'
  | 'unifiedDate'
  | 'artDate';

export interface TableColumnDef {
  id: ColumnId;
  label: string;
  minWidth?: string;
}

export const ALL_AVAILABLE_COLUMNS: TableColumnDef[] = [
  { id: 'client', label: 'Cliente', minWidth: '105px' },
  { id: 'title', label: 'Tarefa', minWidth: '120px' },
  { id: 'attachments', label: 'Arte', minWidth: '48px' },
  { id: 'category', label: 'Formato', minWidth: '80px' },
  { id: 'assignee', label: 'Responsável', minWidth: '105px' },
  { id: 'status', label: 'Status', minWidth: '115px' },
  { id: 'postDate', label: 'Data da Publicação', minWidth: '110px' },
];

export const DEFAULT_VISIBLE_COLUMN_IDS: ColumnId[] = [
  'client',
  'title',
  'attachments',
  'category',
  'assignee',
  'status',
  'postDate',
];

export const DEFAULT_COLUMN_WIDTHS: Record<ColumnId, number> = {
  client: 190,
  title: 340,
  attachments: 72,
  category: 125,
  assignee: 165,
  status: 155,
  postDate: 150,
  unifiedDate: 150,
  artDate: 135,
};

export const MIN_COLUMN_WIDTHS: Record<ColumnId, number> = {
  client: 110,
  title: 150,
  attachments: 55,
  category: 85,
  assignee: 110,
  status: 120,
  postDate: 100,
  unifiedDate: 100,
  artDate: 100,
};

const PRESET_COLUMN_COLORS = [
  { hex: '#64748b', name: 'Ardósia' },
  { hex: '#3b82f6', name: 'Azul' },
  { hex: '#0ea5e9', name: 'Ciano / Sky' },
  { hex: '#8b5cf6', name: 'Roxo / Violeta' },
  { hex: '#a855f7', name: 'Púrpura' },
  { hex: '#ec4899', name: 'Rosa' },
  { hex: '#f43f5e', name: 'Rose' },
  { hex: '#ef4444', name: 'Vermelho' },
  { hex: '#f97316', name: 'Laranja' },
  { hex: '#f59e0b', name: 'Âmbar / Amarelo' },
  { hex: '#10b981', name: 'Esmeralda' },
  { hex: '#06b6d4', name: 'Turquesa' },
  { hex: '#14b8a6', name: 'Teal' },
  { hex: '#6366f1', name: 'Índigo' },
];

export const TasksListView: React.FC<TasksListViewProps> = ({
  onSelectTask,
  onNewTask,
  onOpenTrash,
}) => {
  const tasks = useAppStore((s) => s.tasks);
  const clients = useAppStore((s) => s.clients);
  const categories = useAppStore((s) => s.categories);
  const users = useAppStore((s) => s.users);
  const statuses = useAppStore((s) => s.statuses);
  const trash = useAppStore((s) => s.trash || []);
  const restoreFromTrash = useAppStore((s) => s.restoreFromTrash);
  const currentUser = useCurrentUser();
  const setTaskStatus = useAppStore((s) => s.setTaskStatus);
  const updateTask = useAppStore((s) => s.updateTask);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const duplicateTask = useAppStore((s) => s.duplicateTask);
  const stopTimer = useAppStore((s) => s.stopTimer);
  const setDockedTimerTaskId = useAppStore((s) => s.setDockedTimerTaskId);
  const reorderStatuses = useAppStore((s) => s.reorderStatuses);
  const addStatus = useAppStore((s) => s.addStatus);
  const updateStatus = useAppStore((s) => s.updateStatus);
  const deleteStatus = useAppStore((s) => s.deleteStatus);
  const taskFilters = useAppStore((s) => s.taskFilters);
  const setTaskFilters = useAppStore((s) => s.setTaskFilters);
  const resetTaskFilters = useAppStore((s) => s.resetTaskFilters);

  // Undo / Info Toast state
  const [trashToast, setTrashToast] = useState<{ id: string; title: string; trashId?: string; isDuplicated?: boolean } | null>(null);

  const handleDeleteTask = (task: Task) => {
    if (task.timerStartedAt) stopTimer(task.id);
    setDockedTimerTaskId(null);
    deleteTask(task.id);
    // Find the latest trash item created
    const latestTrash = useAppStore.getState().trash[0];
    setTrashToast({
      id: task.id,
      title: task.title,
      trashId: latestTrash?.id || '',
    });
  };

  const handleDuplicateTask = (task: Task) => {
    const duplicated = duplicateTask(task.id);
    if (duplicated) {
      setTrashToast({
        id: duplicated.id,
        title: duplicated.title,
        isDuplicated: true,
      });
    }
  };

  useEffect(() => {
    if (!trashToast) return;
    const timer = setTimeout(() => {
      setTrashToast(null);
    }, 5000); // 5 seconds auto-dismiss
    return () => clearTimeout(timer);
  }, [trashToast]);

  const handleUndoDelete = (trashId: string) => {
    if (trashId) {
      restoreFromTrash(trashId);
    }
    setTrashToast(null);
  };

  // Filter out client users so only actual staff/colaboradores are shown in "Responsáveis"
  const staffUsers = users.filter((u) => u.role !== 'cliente');

  // View mode: persisted in localStorage
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'calendar'>(() => {
    try {
      const saved = localStorage.getItem('beewave_tasks_view_mode');
      if (saved && ['list', 'kanban', 'calendar'].includes(saved)) {
        return saved as any;
      }
    } catch {}
    return 'list';
  });

  useEffect(() => {
    try {
      localStorage.setItem('beewave_tasks_view_mode', viewMode);
    } catch {}
  }, [viewMode]);

  // Persisted Filters
  const onlyMyTasks = taskFilters?.onlyMyTasks ?? false;
  const selectedStatusKeys = taskFilters?.selectedStatusKeys ?? [];
  const searchQuery = taskFilters?.searchQuery ?? '';
  const selectedClientId = taskFilters?.selectedClientId ?? 'all';
  const selectedAssigneeId = taskFilters?.selectedAssigneeId ?? 'all';
  const selectedStatusDropdown = taskFilters?.selectedStatusDropdown ?? 'all';
  const selectedDateFilter = taskFilters?.selectedDateFilter ?? 'all';
  const customDateFrom = taskFilters?.customDateFrom ?? '';
  const customDateTo = taskFilters?.customDateTo ?? '';
  const dateSortType = taskFilters?.dateSortType ?? 'postDate';

  // Table Columns Drag & Drop Order & Customization
  const [tableColumns, setTableColumns] = useState<TableColumnDef[]>(() => {
    try {
      const savedOrder = localStorage.getItem('beewave_table_columns_order');
      if (savedOrder) {
        const parsedRaw: ColumnId[] = JSON.parse(savedOrder);
        const parsed = Array.from(
          new Set(parsedRaw.map((id) => (id === 'unifiedDate' || id === 'artDate' ? 'postDate' : id)))
        ) as ColumnId[];
        const map = new Map(ALL_AVAILABLE_COLUMNS.map((c) => [c.id, c]));
        const ordered = parsed.map((id) => map.get(id)).filter(Boolean) as TableColumnDef[];
        ALL_AVAILABLE_COLUMNS.forEach((c) => {
          if (!ordered.some((o) => o.id === c.id)) {
            if (c.id === 'attachments') {
              const tIdx = ordered.findIndex((o) => o.id === 'title');
              if (tIdx >= 0) ordered.splice(tIdx + 1, 0, c);
              else ordered.push(c);
            } else {
              ordered.push(c);
            }
          }
        });
        return ordered;
      }
    } catch {}
    return ALL_AVAILABLE_COLUMNS;
  });

  const [visibleColumnIds, setVisibleColumnIds] = useState<ColumnId[]>(() => {
    try {
      const saved = localStorage.getItem('beewave_visible_columns_v4');
      if (saved) {
        const parsedRaw = JSON.parse(saved);
        if (Array.isArray(parsedRaw) && parsedRaw.length > 0) {
          const parsed = Array.from(
            new Set(parsedRaw.map((id) => (id === 'unifiedDate' || id === 'artDate' ? 'postDate' : id)))
          ) as ColumnId[];
          if (!parsed.includes('attachments')) {
            const tIdx = parsed.indexOf('title');
            if (tIdx >= 0) parsed.splice(tIdx + 1, 0, 'attachments');
            else parsed.push('attachments');
          }
          if (!parsed.includes('postDate')) {
            parsed.push('postDate');
          }
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_VISIBLE_COLUMN_IDS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('beewave_visible_columns_v4', JSON.stringify(visibleColumnIds));
    } catch {}
  }, [visibleColumnIds]);

  useEffect(() => {
    try {
      localStorage.setItem('beewave_table_columns_order', JSON.stringify(tableColumns.map((c) => c.id)));
    } catch {}
  }, [tableColumns]);

  // Shared Cloud Table View Configuration (Admin custom layout for everyone)
  const tableViewConfig = useAppStore((s) => s.tableViewConfig);

  // Column widths state (Excel / Notion style resizable columns)
  const [columnWidths, setColumnWidths] = useState<Record<ColumnId, number>>(() => {
    try {
      const saved = localStorage.getItem('beewave_table_column_widths_v2');
      if (saved) {
        return { ...DEFAULT_COLUMN_WIDTHS, ...JSON.parse(saved) };
      }
    } catch {}
    return DEFAULT_COLUMN_WIDTHS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('beewave_table_column_widths_v2', JSON.stringify(columnWidths));
    } catch {}
  }, [columnWidths]);

  // Automatically sync table layout when received from Firestore
  useEffect(() => {
    if (!tableViewConfig) return;
    if (tableViewConfig.columnWidths && typeof tableViewConfig.columnWidths === 'object') {
      setColumnWidths((prev) => ({ ...prev, ...tableViewConfig.columnWidths }));
    }
    if (Array.isArray(tableViewConfig.visibleColumnIds) && tableViewConfig.visibleColumnIds.length > 0) {
      const sanitized = Array.from(
        new Set(
          (tableViewConfig.visibleColumnIds as string[]).map((id) =>
            id === 'unifiedDate' || id === 'artDate' ? 'postDate' : id
          )
        )
      ) as ColumnId[];
      setVisibleColumnIds(sanitized);
    }
    if (Array.isArray(tableViewConfig.columnOrder) && tableViewConfig.columnOrder.length > 0) {
      const sanitizedOrder = Array.from(
        new Set(
          (tableViewConfig.columnOrder as string[]).map((id) =>
            id === 'unifiedDate' || id === 'artDate' ? 'postDate' : id
          )
        )
      ) as ColumnId[];
      const map = new Map(ALL_AVAILABLE_COLUMNS.map((c) => [c.id, c]));
      const ordered = sanitizedOrder
        .map((id) => map.get(id))
        .filter(Boolean) as TableColumnDef[];
      ALL_AVAILABLE_COLUMNS.forEach((c) => {
        if (!ordered.some((o) => o.id === c.id)) ordered.push(c);
      });
      setTableColumns(ordered);
    }
  }, [tableViewConfig]);

  // Notion / Excel column resize handler
  const resizingColRef = useRef<{ colId: ColumnId; startX: number; startWidth: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [activeResizeColId, setActiveResizeColId] = useState<ColumnId | null>(null);

  const handleResizeStart = (colId: ColumnId, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const currentWidth = columnWidths[colId] || DEFAULT_COLUMN_WIDTHS[colId] || 150;
    resizingColRef.current = {
      colId,
      startX: e.clientX,
      startWidth: currentWidth,
    };
    setIsResizing(true);
    setActiveResizeColId(colId);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingColRef.current) return;
      const { colId, startX, startWidth } = resizingColRef.current;
      const minW = MIN_COLUMN_WIDTHS[colId] || 70;
      const delta = e.clientX - startX;
      const newWidth = Math.max(minW, Math.min(1000, startWidth + delta));
      setColumnWidths((prev) => ({
        ...prev,
        [colId]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      resizingColRef.current = null;
      setIsResizing(false);
      setActiveResizeColId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Check if admin has unsaved changes compared to cloud configuration
  const isViewModified = React.useMemo(() => {
    if (!tableViewConfig) {
      const isDefaultCols =
        visibleColumnIds.length === DEFAULT_VISIBLE_COLUMN_IDS.length &&
        visibleColumnIds.every((id, idx) => id === DEFAULT_VISIBLE_COLUMN_IDS[idx]);
      const isDefaultWidths = Object.entries(columnWidths).every(([k, v]) => {
        return Math.abs((DEFAULT_COLUMN_WIDTHS[k as ColumnId] || 150) - v) < 2;
      });
      return !isDefaultCols || !isDefaultWidths;
    }
    const colsChanged =
      JSON.stringify(visibleColumnIds) !== JSON.stringify(tableViewConfig.visibleColumnIds);
    const orderChanged =
      JSON.stringify(tableColumns.map((c) => c.id)) !== JSON.stringify(tableViewConfig.columnOrder);
    const widthsChanged = Object.entries(columnWidths).some(([k, v]) => {
      const cloudW = tableViewConfig.columnWidths?.[k] ?? DEFAULT_COLUMN_WIDTHS[k as ColumnId] ?? 150;
      return Math.abs(cloudW - v) > 5;
    });
    return colsChanged || orderChanged || widthsChanged;
  }, [visibleColumnIds, tableColumns, columnWidths, tableViewConfig]);

  // Admin Save View for All state & handler
  const [isSavingView, setIsSavingView] = useState(false);
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);

  const handleSaveViewForAll = async () => {
    if (currentUser?.role !== 'admin') return;
    setIsSavingView(true);
    const config: TableViewConfig = {
      visibleColumnIds,
      columnOrder: tableColumns.map((c) => c.id),
      columnWidths,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.name || 'Administrador',
    };
    const success = await syncTableViewConfigToCloud(config);
    setIsSavingView(false);
    if (success) {
      setSaveSuccessToast(true);
      setTimeout(() => setSaveSuccessToast(false), 4500);
    }
  };

  // Preview & Download Modal State for Art Attachments
  const [previewModalData, setPreviewModalData] = useState<{ task: Task; fileIndex: number } | null>(null);

  const handleDownloadFile = (file?: { name?: string; dataUrl?: string; url?: string }) => {
    if (!file) return;
    const targetUrl = file.dataUrl || file.url;
    if (!targetUrl) return;
    const a = document.createElement('a');
    a.href = targetUrl;
    a.download = file.name || 'arte-publicacao.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  useEffect(() => {
    if (!previewModalData) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewModalData(null);
      } else if (e.key === 'ArrowLeft') {
        setPreviewModalData((prev) => {
          if (!prev) return null;
          const imgs = (prev.task.files || []).filter((f) => f.dataUrl || f.url);
          if (imgs.length <= 1) return prev;
          return {
            ...prev,
            fileIndex: (prev.fileIndex - 1 + imgs.length) % imgs.length,
          };
        });
      } else if (e.key === 'ArrowRight') {
        setPreviewModalData((prev) => {
          if (!prev) return null;
          const imgs = (prev.task.files || []).filter((f) => f.dataUrl || f.url);
          if (imgs.length <= 1) return prev;
          return {
            ...prev,
            fileIndex: (prev.fileIndex + 1) % imgs.length,
          };
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewModalData]);

  const [showViewMenu, setShowViewMenu] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) {
        setShowViewMenu(false);
      }
    };
    if (showViewMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showViewMenu]);

  const handleToggleColumn = (colId: ColumnId) => {
    if (visibleColumnIds.includes(colId)) {
      if (visibleColumnIds.length <= 1) return; // Keep at least 1 column
      setVisibleColumnIds(visibleColumnIds.filter((id) => id !== colId));
    } else {
      setVisibleColumnIds([...visibleColumnIds, colId]);
    }
  };

  const handleResetColumns = () => {
    if (tableViewConfig) {
      if (Array.isArray(tableViewConfig.visibleColumnIds) && tableViewConfig.visibleColumnIds.length > 0) {
        setVisibleColumnIds(tableViewConfig.visibleColumnIds as ColumnId[]);
      } else {
        setVisibleColumnIds(DEFAULT_VISIBLE_COLUMN_IDS);
      }
      if (Array.isArray(tableViewConfig.columnOrder) && tableViewConfig.columnOrder.length > 0) {
        const map = new Map(ALL_AVAILABLE_COLUMNS.map((c) => [c.id, c]));
        const ordered = (tableViewConfig.columnOrder as ColumnId[])
          .map((id) => map.get(id))
          .filter(Boolean) as TableColumnDef[];
        ALL_AVAILABLE_COLUMNS.forEach((c) => {
          if (!ordered.some((o) => o.id === c.id)) ordered.push(c);
        });
        setTableColumns(ordered);
      } else {
        setTableColumns(ALL_AVAILABLE_COLUMNS);
      }
      if (tableViewConfig.columnWidths && typeof tableViewConfig.columnWidths === 'object') {
        setColumnWidths({ ...DEFAULT_COLUMN_WIDTHS, ...tableViewConfig.columnWidths });
      } else {
        setColumnWidths(DEFAULT_COLUMN_WIDTHS);
      }
    } else {
      setVisibleColumnIds(DEFAULT_VISIBLE_COLUMN_IDS);
      setTableColumns(ALL_AVAILABLE_COLUMNS);
      setColumnWidths(DEFAULT_COLUMN_WIDTHS);
    }
  };

  const [draggedColId, setDraggedColId] = useState<ColumnId | null>(null);

  // Kanban Drag & Drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumnKey, setDragOverColumnKey] = useState<string | null>(null);
  const [draggedKanbanColKey, setDraggedKanbanColKey] = useState<string | null>(null);

  // Kanban Hand / Pan Tool State (Photoshop Spacebar / Hand Tool)
  const [isHandToolActive, setIsHandToolActive] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const kanbanScrollRef = useRef<HTMLDivElement | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const scrollTopRef = useRef(0);
  const isMouseDownRef = useRef(false);

  // Calendar Drag & Drop state
  const [calendarDragOverDate, setCalendarDragOverDate] = useState<string | null>(null);

  // Column Add & Edit modals
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('#3b82f6');

  const [editingColumn, setEditingColumn] = useState<TaskStatus | null>(null);
  const [editColumnName, setEditColumnName] = useState('');
  const [editColumnColor, setEditColumnColor] = useState('');

  // Calendar Date Navigation
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  // Listen to Global Spacebar for Photoshop-like Pan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space' || e.key === ' ') {
        if (viewMode === 'kanban') {
          e.preventDefault();
          setIsSpacePressed(true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [viewMode]);

  // Handle Quick Status Pill Click (toggle or clear)
  const handleAllClick = () => {
    setTaskFilters({
      selectedStatusKeys: [],
      onlyMyTasks: false,
      selectedStatusDropdown: 'all',
    });
  };

  const handleMyTasksToggle = () => {
    setTaskFilters({ onlyMyTasks: !onlyMyTasks });
  };

  const handleStatusPillToggle = (key: string) => {
    if (selectedStatusKeys.includes(key)) {
      setTaskFilters({ selectedStatusKeys: selectedStatusKeys.filter((k) => k !== key) });
    } else {
      setTaskFilters({ selectedStatusKeys: [...selectedStatusKeys, key] });
    }
  };

  // Filter & automatically sort tasks by artDate from oldest to newest
  const filteredTasks = tasks
    .filter((t) => {
      const taskAssignees = t.assigneeIds && t.assigneeIds.length > 0
        ? t.assigneeIds
        : t.assigneeId
        ? [t.assigneeId]
        : [];

      // 1. My tasks filter
      if (onlyMyTasks && currentUser) {
        if (!taskAssignees.includes(currentUser.id) && currentUser.role !== 'admin') {
          return false;
        }
        if (!taskAssignees.includes(currentUser.id) && onlyMyTasks) {
          return false;
        }
      }

      // 2. Status Pill Filters (Multi-selection combinations)
      if (selectedStatusKeys.length > 0) {
        if (!selectedStatusKeys.includes(t.status)) {
          return false;
        }
      }

      // 3. Dropdown Status Filter
      if (selectedStatusDropdown !== 'all' && t.status !== selectedStatusDropdown) {
        return false;
      }

      // 4. Dropdown Client Filter
      if (selectedClientId !== 'all' && t.clientId !== selectedClientId) {
        return false;
      }

      // 5. Dropdown Assignee Filter
      if (selectedAssigneeId !== 'all' && !taskAssignees.includes(selectedAssigneeId)) {
        return false;
      }

      // 6. Date Filter (based on postDate)
      if (selectedDateFilter !== 'all') {
        const today = startOfToday();
        const effectiveDateStr = t.postDate;
        const taskDate = effectiveDateStr ? parseISO(effectiveDateStr) : null;

        if (!taskDate) {
          if (selectedDateFilter === 'sem_data') return true;
          return false;
        }

        if (selectedDateFilter === 'hoje' && !isSameDay(taskDate, today)) {
          return false;
        } else if (selectedDateFilter === 'amanha' && !isSameDay(taskDate, addDays(today, 1))) {
          return false;
        } else if (selectedDateFilter === 'esta_semana') {
          const weekEnd = dateEndOfWeek(today, { weekStartsOn: 0 });
          if (isBefore(taskDate, today) || taskDate > weekEnd) return false;
        } else if (selectedDateFilter === 'este_mes') {
          const monthEnd = dateEndOfMonth(today);
          if (isBefore(taskDate, today) || taskDate > monthEnd) return false;
        } else if (selectedDateFilter === 'atrasados') {
          if (!isBefore(taskDate, today) || t.status === 'aprovado' || t.status === 'postado') {
            return false;
          }
        } else if (selectedDateFilter === 'personalizado') {
          if (customDateFrom) {
            const fromDate = parseISO(customDateFrom);
            fromDate.setHours(0, 0, 0, 0);
            if (taskDate < fromDate) return false;
          }
          if (customDateTo) {
            const toDate = parseISO(customDateTo);
            toDate.setHours(23, 59, 59, 999);
            if (taskDate > toDate) return false;
          }
        }
      }

      // 7. Search query
      if (searchQuery.trim()) {
        const client = clients.find((c) => c.id === t.clientId);
        const assigneeNames = taskAssignees
          .map((uid) => users.find((u) => u.id === uid)?.name || '')
          .join(' ');
        const combined = `${t.title} ${t.briefingText || ''} ${client?.company || ''} ${assigneeNames}`.toLowerCase();
        if (!combined.includes(searchQuery.toLowerCase())) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      const dateA = a.postDate;
      const dateB = b.postDate;

      // Tasks without date always stay at the end of the queue, but remain visible
      if (!dateA && !dateB) {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA.localeCompare(dateB);
    });

  // Table Column Drag Handlers
  const handleColDragStart = (colId: ColumnId) => {
    setDraggedColId(colId);
  };

  const handleColDragOver = (e: React.DragEvent, targetColId: ColumnId) => {
    e.preventDefault();
    if (!draggedColId || draggedColId === targetColId) return;

    const sourceIdx = tableColumns.findIndex((c) => c.id === draggedColId);
    const targetIdx = tableColumns.findIndex((c) => c.id === targetColId);
    if (sourceIdx < 0 || targetIdx < 0) return;

    const updated = [...tableColumns];
    const [moved] = updated.splice(sourceIdx, 1);
    updated.splice(targetIdx, 0, moved);
    setTableColumns(updated);
  };

  // Kanban Card Drag Handlers (Task drag & drop to change status)
  const handleTaskDragStart = (e: React.DragEvent, taskId: string) => {
    if (isHandToolActive || isSpacePressed) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.setData('task-id', taskId);
    setDraggedTaskId(taskId);
  };

  const handleKanbanColumnDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    if (draggedTaskId && dragOverColumnKey !== columnKey) {
      setDragOverColumnKey(columnKey);
    }
  };

  const handleKanbanColumnDrop = (e: React.DragEvent, targetColumnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverColumnKey(null);
    const taskId = e.dataTransfer.getData('task-id') || e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId && !draggedKanbanColKey) {
      setTaskStatus(taskId, targetColumnKey as TaskStatusKey);
    }
    setDraggedTaskId(null);
  };

  // Kanban Column Drag Handlers (Reorder column using handle button ONLY)
  const handleKanbanColDragStart = (e: React.DragEvent, colKey: string) => {
    if (isHandToolActive || isSpacePressed) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    e.dataTransfer.setData('column-key', colKey);
    setDraggedKanbanColKey(colKey);
  };

  const handleKanbanColDragOver = (e: React.DragEvent, targetColKey: string) => {
    e.preventDefault();
    if (!draggedKanbanColKey || draggedKanbanColKey === targetColKey) return;

    const sourceIdx = statuses.findIndex((s) => s.key === draggedKanbanColKey);
    const targetIdx = statuses.findIndex((s) => s.key === targetColKey);
    if (sourceIdx < 0 || targetIdx < 0) return;

    const updated = [...statuses];
    const [moved] = updated.splice(sourceIdx, 1);
    updated.splice(targetIdx, 0, moved);
    reorderStatuses(updated);
  };

  const handleKanbanColDragEnd = () => {
    setDraggedKanbanColKey(null);
  };

  // Kanban Pan Handlers (Mãozinha / Spacebar Pan)
  const handleKanbanMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const isPanTrigger =
      isHandToolActive ||
      isSpacePressed ||
      e.button === 1 || // Middle mouse click
      (e.target as HTMLElement).classList.contains('kanban-canvas-bg') ||
      (e.target as HTMLElement).id === 'kanban-board-container';

    if (isPanTrigger && kanbanScrollRef.current) {
      isMouseDownRef.current = true;
      setIsPanning(true);
      startXRef.current = e.pageX - kanbanScrollRef.current.offsetLeft;
      startYRef.current = e.pageY - kanbanScrollRef.current.offsetTop;
      scrollLeftRef.current = kanbanScrollRef.current.scrollLeft;
      scrollTopRef.current = kanbanScrollRef.current.scrollTop;
    }
  };

  const handleKanbanMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDownRef.current || !kanbanScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - kanbanScrollRef.current.offsetLeft;
    const y = e.pageY - kanbanScrollRef.current.offsetTop;
    const walkX = (x - startXRef.current) * 1.2;
    const walkY = (y - startYRef.current) * 1.2;
    kanbanScrollRef.current.scrollLeft = scrollLeftRef.current - walkX;
    kanbanScrollRef.current.scrollTop = scrollTopRef.current - walkY;
  };

  const handleKanbanMouseUpOrLeave = () => {
    isMouseDownRef.current = false;
    setIsPanning(false);
  };

  // Calendar Task Drag Handlers (Move task to new date)
  const handleCalendarDayDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    if (draggedTaskId && calendarDragOverDate !== dateStr) {
      setCalendarDragOverDate(dateStr);
    }
  };

  const handleCalendarDayDrop = (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    setCalendarDragOverDate(null);
    const taskId = e.dataTransfer.getData('task-id') || e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      updateTask(taskId, { postDate: targetDateStr });
    }
    setDraggedTaskId(null);
  };

  // Add Column Handler
  const handleCreateColumn = () => {
    if (!newColumnName.trim()) return;
    const newKey = `custom_${Date.now()}` as TaskStatusKey;
    addStatus({
      key: newKey,
      label: newColumnName.trim(),
      color: newColumnColor,
      group: 'progress',
      clientVisible: true,
    });
    setNewColumnName('');
    setShowAddColumnModal(false);
  };

  // Edit Column Handlers
  const handleOpenEditColumn = (status: TaskStatus) => {
    setEditingColumn(status);
    setEditColumnName(status.label);
    setEditColumnColor(status.color || '#64748b');
  };

  const handleSaveEditColumnModal = () => {
    if (!editingColumn || !editColumnName.trim()) return;
    updateStatus(editingColumn.key, {
      label: editColumnName.trim(),
      color: editColumnColor,
    });
    setEditingColumn(null);
  };

  // Calendar Helpers
  const monthStart = startOfMonth(calendarDate);
  const monthEnd = endOfMonth(monthStart);
  const calStartDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEndDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calStartDate, end: calEndDate });

  // Popular Status Pills for top bar in requested sequence: não iniciado, em andamento, em aprovação, alterar, aprovado, postado
  const topPillStatuses = [
    { key: 'nao_iniciado', label: 'Não iniciado' },
    { key: 'em_andamento', label: 'Em andamento' },
    { key: 'em_aprovacao', label: 'Em aprovação' },
    { key: 'alterar', label: 'Alterar' },
    { key: 'aprovado', label: 'Aprovado' },
    { key: 'postado', label: 'Postado' },
  ];

  const isAllActive = selectedStatusKeys.length === 0 && !onlyMyTasks;

  // Determine current cursor style for Kanban
  const isHandActive = isHandToolActive || isSpacePressed;
  const kanbanCursorClass = isHandActive
    ? isPanning
      ? 'cursor-grabbing'
      : 'cursor-grab'
    : 'cursor-default';

  return (
    <div id="tasks-list-view" className="mx-auto max-w-7xl space-y-6 pb-20">
      {/* Notion-style Clean Header with Filter Bar (No Heavy Outer Container) */}
      <div className="space-y-5 relative z-20 pb-2">
        {/* Top title and View Mode Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
              Central de Tarefas
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              Gerencie pautas, briefings e aprovações com visualização em Lista, Kanban e Calendário.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Consolidated View Configurations Button (Eye icon) */}
            <div className="relative" ref={viewMenuRef}>
              <button
                id="btn-view-configs-eye"
                type="button"
                onClick={() => setShowViewMenu(!showViewMenu)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  showViewMenu
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
                title="Configurações de visualização (Lista, Kanban, Calendário e Campos)"
              >
                <Eye className="h-4 w-4" />
                <span className="capitalize">{viewMode === 'list' ? 'Lista' : viewMode === 'kanban' ? 'Kanban' : 'Calendário'}</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>

              {showViewMenu && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl z-[100] p-3.5 animate-in fade-in zoom-in-95 duration-100">
                  <div className="pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Modo de Visualização
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    <button
                      id="btn-view-list"
                      onClick={() => {
                        setViewMode('list');
                      }}
                      className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        viewMode === 'list'
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <List className="h-4 w-4" />
                      <span className="text-[11px]">Lista</span>
                    </button>

                    <button
                      id="btn-view-kanban"
                      onClick={() => {
                        setViewMode('kanban');
                      }}
                      className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        viewMode === 'kanban'
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Kanban className="h-4 w-4" />
                      <span className="text-[11px]">Kanban</span>
                    </button>

                    <button
                      id="btn-view-calendar"
                      onClick={() => {
                        setViewMode('calendar');
                      }}
                      className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        viewMode === 'calendar'
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <CalendarDays className="h-4 w-4" />
                      <span className="text-[11px]">Calendário</span>
                    </button>
                  </div>

                  {viewMode === 'list' && (
                    <>
                      <div className="flex items-center justify-between pb-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Campos da Tabela
                        </span>
                        <button
                          type="button"
                          onClick={handleResetColumns}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                        >
                          Padrão
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                        Selecione as colunas visíveis:
                      </p>

                      <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                        {ALL_AVAILABLE_COLUMNS.map((col) => {
                          const isChecked = visibleColumnIds.includes(col.id);
                          return (
                            <label
                              key={col.id}
                              className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-800/70 cursor-pointer text-xs select-none transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleColumn(col.id)}
                                  className="rounded border-slate-300 dark:border-slate-700 text-slate-900 focus:ring-slate-900 dark:focus:ring-white h-3.5 w-3.5 cursor-pointer"
                                />
                                <span className={`text-xs ${isChecked ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                  {col.label}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 1: Quick Actions & Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {/* Nova Tarefa Button (moved to the row before/next to Todas and Minhas tarefas) */}
          <button
            id="btn-add-task-main"
            onClick={onNewTask}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold px-3.5 py-2 text-xs shadow-sm transition-all active:scale-95 whitespace-nowrap cursor-pointer mr-1"
          >
            <Plus className="h-4 w-4" strokeWidth={2.4} />
            <span>Nova Tarefa</span>
          </button>

          {/* Todas Pill */}
          <button
            id="filter-pill-todas"
            onClick={handleAllClick}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              isAllActive
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                : 'bg-slate-100/70 dark:bg-slate-900/70 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            Todas
          </button>

          {/* Minhas tarefas Pill */}
          <button
            id="filter-pill-minhas-tarefas"
            onClick={handleMyTasksToggle}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              onlyMyTasks
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                : 'bg-slate-100/70 dark:bg-slate-900/70 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            Minhas tarefas
          </button>

          {/* Vertical Separator */}
          <div className="h-6 w-px bg-slate-300 dark:bg-slate-800 mx-1 hidden sm:block" />

          {/* Status Pills */}
          {topPillStatuses.map((st) => {
            const isSelected = selectedStatusKeys.includes(st.key);
            return (
              <button
                key={st.key}
                id={`filter-pill-${st.key}`}
                onClick={() => handleStatusPillToggle(st.key)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold border-slate-900 dark:border-white shadow-sm'
                    : 'bg-slate-100/70 dark:bg-slate-900/70 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>

        {/* Row 2: Search Input & Dropdowns (Standard clean dropdown list) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-400" />
            <input
              id="input-search-tasks"
              type="text"
              value={searchQuery}
              onChange={(e) => setTaskFilters({ searchQuery: e.target.value })}
              placeholder="Buscar tarefa..."
              className="clean-input h-11 w-full pl-10 pr-4 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setTaskFilters({ searchQuery: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Todos os clientes Dropdown */}
          <div>
            <select
              id="select-filter-client"
              value={selectedClientId}
              onChange={(e) => setTaskFilters({ selectedClientId: e.target.value })}
              className="clean-input h-11 w-full px-3 text-xs font-medium text-slate-900 dark:text-white cursor-pointer"
            >
              <option value="all">Todos os clientes</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji ? `${c.emoji} ` : ''}{c.company}
                </option>
              ))}
            </select>
          </div>

          {/* Todos os responsáveis Dropdown (Only collaborators/staff) */}
          <div>
            <select
              id="select-filter-assignee"
              value={selectedAssigneeId}
              onChange={(e) => setTaskFilters({ selectedAssigneeId: e.target.value })}
              className="clean-input h-11 w-full px-3 text-xs font-medium text-slate-900 dark:text-white cursor-pointer"
            >
              <option value="all">Todos os responsáveis</option>
              {staffUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role === 'admin' ? 'Gestor' : 'Colaborador'})
                </option>
              ))}
            </select>
          </div>

          {/* Todos os status Dropdown */}
          <div>
            <select
              id="select-filter-status"
              value={selectedStatusDropdown}
              onChange={(e) => setTaskFilters({ selectedStatusDropdown: e.target.value })}
              className="clean-input h-11 w-full px-3 text-xs font-medium text-slate-900 dark:text-white cursor-pointer"
            >
              <option value="all">Todos os status</option>
              {statuses.map((st) => (
                <option key={st.key} value={st.key}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          {/* Período Dropdown */}
          <div>
            <select
              id="select-filter-date"
              value={selectedDateFilter}
              onChange={(e) => setTaskFilters({ selectedDateFilter: e.target.value })}
              className="clean-input h-11 w-full px-3 text-xs font-medium text-slate-900 dark:text-white cursor-pointer"
            >
              <option value="all">Qualquer data</option>
              <option value="hoje">Hoje</option>
              <option value="amanha">Amanhã</option>
              <option value="esta_semana">Esta semana</option>
              <option value="este_mes">Este mês</option>
              <option value="atrasados">Atrasados</option>
              <option value="sem_data">Sem data</option>
              <option value="personalizado">Personalizado (de x a x)</option>
            </select>
          </div>

          {/* Custom Date Range (de x a x) */}
          {selectedDateFilter === 'personalizado' && (
            <div className="col-span-full flex flex-wrap items-center gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 animate-in fade-in duration-150">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Período personalizado:
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">De:</span>
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setTaskFilters({ customDateFrom: e.target.value })}
                  className="clean-input h-9 px-2 text-xs font-medium text-slate-900 dark:text-white cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">Até:</span>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setTaskFilters({ customDateTo: e.target.value })}
                  className="clean-input h-9 px-2 text-xs font-medium text-slate-900 dark:text-white cursor-pointer"
                />
              </div>
              {(customDateFrom || customDateTo) && (
                <button
                  type="button"
                  onClick={() => setTaskFilters({ customDateFrom: '', customDateTo: '' })}
                  className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white underline cursor-pointer"
                >
                  Limpar datas
                </button>
              )}
            </div>
          )}
        </div>

        {/* Counter Info */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-800 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span>
              Exibindo <strong className="text-slate-900 dark:text-white font-bold">{filteredTasks.length}</strong> de {tasks.length} tarefas
            </span>
          </div>

          {(selectedStatusKeys.length > 0 || onlyMyTasks || selectedClientId !== 'all' || selectedAssigneeId !== 'all' || selectedStatusDropdown !== 'all' || selectedDateFilter !== 'all' || customDateFrom || customDateTo || searchQuery) && (
            <button
              onClick={resetTaskFilters}
              className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:underline cursor-pointer"
            >
              Limpar todos os filtros
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. LIST VIEW (Loose Excel / Notion data grid with resizable columns) */}
      {/* ========================================================================= */}
      {viewMode === 'list' && (
        <div className={`w-full overflow-x-auto transition-all ${
          isResizing ? 'select-none cursor-col-resize' : ''
        }`}>
          {(() => {
            const visibleColumns = tableColumns
              .filter((c) => visibleColumnIds.includes(c.id))
              .map((c) => {
                const def = ALL_AVAILABLE_COLUMNS.find((a) => a.id === c.id);
                return def ? { ...c, label: def.label } : c;
              });

            return (
              <table className="w-full text-left text-xs border-collapse table-fixed select-text">
                <colgroup>
                  {visibleColumns.map((col) => (
                    <col
                      key={col.id}
                      style={{
                        width: `${columnWidths[col.id] || DEFAULT_COLUMN_WIDTHS[col.id] || 150}px`,
                      }}
                    />
                  ))}
                  <col style={{ width: '60px' }} />
                  <col className="w-auto" />
                </colgroup>
                <thead className="border-b border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 select-none sticky top-0 z-10 backdrop-blur-xs">
                  <tr>
                    {visibleColumns.map((col) => {
                      let colTitle = col.label;
                      if (col.id === 'postDate' || col.id === 'unifiedDate' || col.id === 'artDate') {
                        colTitle = 'Data da Publicação';
                      }
                      if (col.id === 'attachments') colTitle = 'Arte';
                      const isArteCol = col.id === 'attachments';
                      const currentWidth = columnWidths[col.id] || DEFAULT_COLUMN_WIDTHS[col.id] || 150;

                      return (
                        <th
                          key={col.id}
                          draggable={!isResizing}
                          onDragStart={() => handleColDragStart(col.id)}
                          onDragOver={(e) => handleColDragOver(e, col.id)}
                          className={`relative px-3.5 py-3 cursor-grab active:cursor-grabbing transition-colors group ${
                            isArteCol ? 'text-center' : ''
                          } ${
                            draggedColId === col.id ? 'opacity-40 bg-slate-200 dark:bg-slate-800' : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                          }`}
                          style={{ width: `${currentWidth}px` }}
                          title="Clique e arraste para reorganizar, ou use a borda direita para redimensionar"
                        >
                          <div className={`flex items-center gap-1.5 ${isArteCol ? 'justify-center' : ''} pr-1`}>
                            {!isArteCol && (
                              <GripVertical className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            )}
                            <span className="font-semibold truncate text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400">
                              {colTitle}
                            </span>
                          </div>

                          {/* Notion/Excel Resizer Handle - Invisible at rest, clean hover indicator */}
                          <div
                            role="separator"
                            aria-orientation="vertical"
                            onMouseDown={(e) => handleResizeStart(col.id, e)}
                            onClick={(e) => e.stopPropagation()}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setColumnWidths((prev) => ({
                                ...prev,
                                [col.id]: DEFAULT_COLUMN_WIDTHS[col.id] || 150,
                              }));
                            }}
                            className="absolute -right-1 top-0 bottom-0 w-2.5 cursor-col-resize z-20 select-none flex items-center justify-center hover:bg-amber-500/10 active:bg-amber-500/20 group/resizer"
                            title="Arraste para redimensionar (duplo clique restaura padrão)"
                          >
                            <div
                              className={`w-[1.5px] transition-all ${
                                activeResizeColId === col.id
                                  ? 'h-full bg-amber-500 shadow-xs'
                                  : 'h-0 bg-transparent group-hover/resizer:h-4/5 group-hover/resizer:bg-amber-500/60'
                              }`}
                            />
                          </div>
                        </th>
                      );
                    })}
                    <th className="px-2 py-3 text-right w-[60px] text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Ação
                    </th>
                    <th className="p-0 border-none w-auto" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800">
                  {filteredTasks.map((task) => {
                    const client = clients.find((c) => c.id === task.clientId);
                    const category = categories.find((cat) => cat.id === task.categoryId);
                    const taskAssigneeIds = task.assigneeIds && task.assigneeIds.length > 0
                      ? task.assigneeIds
                      : task.assigneeId
                      ? [task.assigneeId]
                      : [];
                    const assigneeUsers = taskAssigneeIds
                      .map((uid) => users.find((u) => u.id === uid))
                      .filter(Boolean) as typeof users;
                    const badge = getStatusBadgeStyle(task.status);
                    const isAlert = task.status === 'alterar';
                    const isDelayed = isTaskDelayed(task);
                    const isPostDelayed = isDateBeforeToday(task.postDate) && task.status !== 'postado';

                    return (
                      <tr
                        key={task.id}
                        onClick={() => onSelectTask(task.id)}
                        className={`cursor-pointer transition-colors group ${
                          isDelayed
                            ? 'bg-amber-500/[0.04] dark:bg-amber-500/[0.06] hover:bg-amber-500/[0.08] dark:hover:bg-amber-500/[0.10]'
                            : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        {visibleColumns.map((col) => {
                          if (col.id === 'client') {
                            return (
                              <td key={col.id} className="px-3.5 py-3 font-bold text-slate-900 dark:text-white whitespace-nowrap overflow-hidden">
                                <div className="flex items-center gap-2 overflow-hidden w-full" title={client?.company || 'Cliente'}>
                                  <span className="text-base shrink-0">{client?.emoji || '🏢'}</span>
                                  <span className="truncate text-sm font-semibold">{client?.company || 'Cliente'}</span>
                                </div>
                              </td>
                            );
                          }

                          if (col.id === 'title') {
                            const isLiveEditing =
                              task.editingBy &&
                              Date.now() - new Date(task.editingBy.updatedAt).getTime() < 120000;
                            return (
                              <td key={col.id} className="px-3.5 py-3 font-medium text-slate-900 dark:text-white overflow-hidden">
                                <div className="flex flex-col gap-1 w-full overflow-hidden">
                                  <span
                                    className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-2 break-words leading-snug whitespace-normal"
                                    title={task.title}
                                  >
                                    {task.title}
                                  </span>
                                  {(isLiveEditing || isDelayed || isAlert) && (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {isLiveEditing && (
                                        <span
                                          className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 animate-pulse"
                                          title={`${task.editingBy?.userName} está editando agora`}
                                        >
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                          <span>Editando: {task.editingBy?.userName.split(' ')[0]}</span>
                                        </span>
                                      )}
                                      {isDelayed && (
                                        <span
                                          className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                          title="Data anterior a hoje - tarefa atrasada"
                                        >
                                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                          <span>Atrasado</span>
                                        </span>
                                      )}
                                      {isAlert && (
                                        <span className="shrink-0 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 text-[10px] font-bold">
                                          Ajuste
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          }

                          if (col.id === 'attachments') {
                            const imageFiles = (task.files || []).filter((f) => f.dataUrl || f.url);
                            const firstImage = imageFiles[0];

                            return (
                              <td
                                key={col.id}
                                className="px-2 py-3 text-center whitespace-nowrap"
                                onClick={(e) => {
                                  if (imageFiles.length > 0) {
                                    e.stopPropagation();
                                    setPreviewModalData({ task, fileIndex: 0 });
                                  }
                                }}
                              >
                                {imageFiles.length > 0 ? (
                                  <div
                                    className="inline-flex items-center justify-center group/art cursor-pointer"
                                    title={`${imageFiles.length} ${imageFiles.length === 1 ? 'arte anexada' : 'artes anexadas'} • Clique para visualizar e baixar`}
                                  >
                                    <div className="relative h-9 w-9 rounded-lg overflow-hidden border border-slate-200/80 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-2xs group-hover/art:ring-2 group-hover/art:ring-amber-500 group-hover/art:scale-105 transition-all shrink-0">
                                      <img
                                        src={firstImage.dataUrl || firstImage.url}
                                        alt={firstImage.name || 'Arte'}
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                      />
                                      {imageFiles.length > 1 && (
                                        <span className="absolute bottom-0 right-0 bg-slate-900/90 text-white font-extrabold text-[8px] px-1 rounded-tl leading-none">
                                          +{imageFiles.length - 1}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-700 text-sm select-none">—</span>
                                )}
                              </td>
                            );
                          }

                          if (col.id === 'category') {
                            return (
                              <td key={col.id} className="px-3.5 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap overflow-hidden">
                                <span
                                  className="rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 bg-slate-50 dark:bg-slate-950/40 text-xs font-medium truncate inline-block max-w-full"
                                  title={getFormatLabel(task, categories)}
                                >
                                  {getFormatLabel(task, categories)}
                                </span>
                              </td>
                            );
                          }

                          if (col.id === 'assignee') {
                            return (
                              <td key={col.id} className="px-3.5 py-3 text-slate-900 dark:text-white font-medium whitespace-nowrap overflow-hidden">
                                {assigneeUsers.length > 1 ? (
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="flex -space-x-1.5 overflow-hidden shrink-0">
                                      {assigneeUsers.map((u) => (
                                        <div
                                          key={u.id}
                                          className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900 shadow-2xs shrink-0"
                                          style={{ backgroundColor: u.color || '#64748b' }}
                                          title={u.name}
                                        >
                                          {u.name.charAt(0)}
                                        </div>
                                      ))}
                                    </div>
                                    <span
                                      className="text-xs text-slate-700 dark:text-slate-300 truncate max-w-full"
                                      title={assigneeUsers.map((u) => u.name).join(', ')}
                                    >
                                      {assigneeUsers.map((u) => u.name.split(' ')[0]).join(', ')}
                                    </span>
                                  </div>
                                ) : assigneeUsers.length === 1 ? (
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <div
                                      className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white shadow-2xs shrink-0"
                                      style={{ backgroundColor: assigneeUsers[0].color || '#64748b' }}
                                    >
                                      {assigneeUsers[0].name.charAt(0)}
                                    </div>
                                    <span className="truncate text-xs font-medium text-slate-800 dark:text-slate-200 max-w-full" title={assigneeUsers[0].name}>
                                      {assigneeUsers[0].name}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-xs select-none">—</span>
                                )}
                              </td>
                            );
                          }

                          if (col.id === 'status') {
                            return (
                              <td key={col.id} className="px-3.5 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                <TaskStatusButton taskId={task.id} status={task.status} size="sm" />
                              </td>
                            );
                          }

                          if (col.id === 'postDate' || col.id === 'unifiedDate' || col.id === 'artDate') {
                            return (
                              <td key={col.id} className="px-3.5 py-3 whitespace-nowrap text-xs overflow-hidden">
                                {task.postDate ? (
                                  <span
                                    className={`font-semibold text-xs truncate block ${
                                      isPostDelayed ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-900 dark:text-white'
                                    }`}
                                    title={formatFullBadgeDate(task.postDate)}
                                  >
                                    {formatFriendlyDate(task.postDate, false)}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs select-none">—</span>
                                )}
                              </td>
                            );
                          }

                          return null;
                        })}
                        <td className="px-2 py-3 text-right whitespace-nowrap w-[60px]" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateTask(task);
                              }}
                              className="opacity-50 group-hover:opacity-100 hover:opacity-100 text-slate-400 hover:text-sky-600 p-1.5 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-all cursor-pointer"
                              title="Duplicar tarefa"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(task);
                              }}
                              className="opacity-50 group-hover:opacity-100 hover:opacity-100 text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                              title="Excluir tarefa (Lixeira)"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="p-0 border-none w-auto" />
                      </tr>
                    );
                  })}
                  {filteredTasks.length === 0 && (
                    <tr>
                      <td colSpan={visibleColumns.length + 2} className="py-16 text-center text-xs text-slate-400 dark:text-slate-500">
                        Nenhuma tarefa encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            );
          })()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. KANBAN VIEW */}
      {/* ========================================================================= */}
      {viewMode === 'kanban' && (
        <div className="space-y-4">
          {/* Kanban Toolbar with Hand Tool and Column Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-3">
              {/* Hand Tool Toggle Button */}
              <button
                id="btn-hand-tool"
                onClick={() => setIsHandToolActive((prev) => !prev)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  isHandActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm ring-2 ring-slate-900/20 dark:ring-white/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
                title="Mãozinha (Pan): Segure a tecla Espaço ou ative este botão para arrastar e movimentar a tela livremente"
              >
                <Hand className={`h-4 w-4 ${isHandActive ? 'animate-pulse' : ''}`} />
                <span>Mãozinha (Espaço)</span>
                {isHandActive && (
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                )}
              </button>

              <span className="text-xs text-slate-500 dark:text-slate-400 hidden md:inline">
                {isHandActive
                  ? 'Clique e arraste em qualquer lugar para navegar pela tela'
                  : 'Dica: Segure Espaço ou arraste no fundo para mover a tela'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddColumnModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white px-3.5 py-1.5 text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Adicionar Coluna</span>
              </button>
            </div>
          </div>

          {/* Kanban Board Container with visible scrollbar and Pan drag support */}
          <div
            id="kanban-board-container"
            ref={kanbanScrollRef}
            onMouseDown={handleKanbanMouseDown}
            onMouseMove={handleKanbanMouseMove}
            onMouseUp={handleKanbanMouseUpOrLeave}
            onMouseLeave={handleKanbanMouseUpOrLeave}
            className={`flex gap-4 overflow-x-auto pb-6 pt-2 items-start kanban-canvas-bg select-none transition-colors ${kanbanCursorClass}`}
            style={{ minHeight: '620px' }}
          >
            {statuses.map((column) => {
              const colTasks = filteredTasks.filter((t) => t.status === column.key);
              const isDropActive = dragOverColumnKey === column.key;
              const isColumnBeingDragged = draggedKanbanColKey === column.key;
              const colColor = column.color || '#64748b';

              return (
                <div
                  key={column.key}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedKanbanColKey) {
                      handleKanbanColDragOver(e, column.key);
                    } else if (draggedTaskId) {
                      handleKanbanColumnDragOver(e, column.key);
                    }
                  }}
                  onDrop={(e) => {
                    if (draggedTaskId) {
                      handleKanbanColumnDrop(e, column.key);
                    }
                  }}
                  className={`clean-card flex flex-col p-4 w-[310px] shrink-0 min-h-[580px] transition-all rounded-2xl border ${
                    isDropActive
                      ? 'ring-2 ring-slate-900 dark:ring-white scale-[1.01]'
                      : ''
                  } ${isColumnBeingDragged ? 'opacity-30 scale-95' : ''}`}
                  style={{
                    backgroundColor: `${colColor}18`, // Soft tinted background across entire column
                    borderColor: `${colColor}45`,     // Subtle matching border
                  }}
                >
                  {/* Column Header (No top line, clean soft styling) */}
                  <div
                    className="flex items-center justify-between mb-4 pb-3 border-b"
                    style={{ borderColor: `${colColor}35` }}
                  >
                    <div className="flex items-center gap-2">
                      {/* Drag Handle to reorder column order */}
                      <div
                        draggable={!isHandActive}
                        onDragStart={(e) => handleKanbanColDragStart(e, column.key)}
                        onDragEnd={handleKanbanColDragEnd}
                        className="cursor-grab active:cursor-grabbing p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                        title="Arraste para mover esta coluna de lugar"
                      >
                        <GripVertical className="h-4 w-4" />
                      </div>

                      {/* Column Color Pill Indicator & Title */}
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shadow-xs shrink-0"
                          style={{ backgroundColor: colColor }}
                        />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white truncate max-w-[140px]">
                          {column.label}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className="grid h-5 px-1.5 place-items-center rounded-full text-[10px] font-bold text-slate-900 dark:text-white border shadow-xs"
                        style={{
                          backgroundColor: `${colColor}30`,
                          borderColor: `${colColor}60`,
                        }}
                      >
                        {colTasks.length}
                      </span>

                      {/* Edit Column options (Modal to edit name and color) */}
                      <button
                        onClick={() => handleOpenEditColumn(column)}
                        className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer transition-colors"
                        title="Editar nome e cor da coluna"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      {statuses.length > 3 && (
                        <button
                          onClick={() => deleteStatus(column.key)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-500/10 cursor-pointer transition-colors"
                          title="Excluir coluna"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tasks List within column */}
                  <div className="space-y-3 flex-1 overflow-y-auto min-h-[320px]">
                    {colTasks.map((task) => {
                      const client = clients.find((c) => c.id === task.clientId);
                      const category = categories.find((cat) => cat.id === task.categoryId);
                      const taskAssigneeIds = task.assigneeIds && task.assigneeIds.length > 0
                        ? task.assigneeIds
                        : task.assigneeId
                        ? [task.assigneeId]
                        : [];
                      const cardAssigneeUsers = taskAssigneeIds
                        .map((uid) => users.find((u) => u.id === uid))
                        .filter(Boolean) as typeof users;
                      const isAlert = task.status === 'alterar';
                      const isDelayed = isTaskDelayed(task);
                      const isPostDelayed = isDateBeforeToday(task.postDate) && task.status !== 'postado';
                      const badge = getStatusBadgeStyle(task.status);
                      const isBeingDragged = draggedTaskId === task.id;

                      return (
                        <div
                          key={task.id}
                          draggable={!isHandActive}
                          onDragStart={(e) => handleTaskDragStart(e, task.id)}
                          onDragEnd={() => setDraggedTaskId(null)}
                          onClick={() => {
                            if (!isPanning) onSelectTask(task.id);
                          }}
                          className={`clean-card-hover p-4 cursor-grab active:cursor-grabbing transition-all space-y-3 rounded-2xl border shadow-sm ${
                            isBeingDragged ? 'opacity-30 scale-95 border-dashed border-slate-400' : ''
                          } ${
                            isAlert
                              ? 'border-rose-500/50 ring-1 ring-rose-500/30 bg-white/95 dark:bg-slate-900/95'
                              : isDelayed
                              ? 'border-amber-400/70 dark:border-amber-500/50 bg-amber-50/40 dark:bg-amber-950/20'
                              : 'border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white truncate">
                              <span>{client?.emoji || '🏢'}</span>
                              <span className="truncate">{client?.company}</span>
                            </span>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="rounded-md bg-transparent px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-300/80 dark:border-slate-700">
                                {getFormatLabel(task, categories)}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDuplicateTask(task);
                                }}
                                className="p-1 rounded-md text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                title="Duplicar tarefa"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTask(task);
                                }}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                title="Excluir tarefa (Lixeira)"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                            {task.title}
                          </p>

                          {task.editingBy &&
                            Date.now() - new Date(task.editingBy.updatedAt).getTime() < 120000 && (
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold animate-pulse">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="truncate">Editando: {task.editingBy.userName}</span>
                              </div>
                            )}

                          <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 gap-1 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                              {/* Direct Status Button / Dropdown */}
                              <TaskStatusButton taskId={task.id} status={task.status} size="xs" />

                              {isDelayed && (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                  title="Data anterior a hoje - tarefa atrasada"
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                  <span>Atrasado</span>
                                </span>
                              )}
                            </div>

                            {/* Assignee Avatar(s) */}
                            {cardAssigneeUsers.length > 0 && (
                              <div className="flex -space-x-1.5 overflow-hidden">
                                {cardAssigneeUsers.map((u) => (
                                  <div
                                    key={u.id}
                                    className="grid h-5 w-5 place-items-center rounded-full text-[9px] font-bold text-white ring-1.5 ring-white dark:ring-slate-900 shadow-2xs shrink-0"
                                    style={{ backgroundColor: u.color || '#64748b' }}
                                    title={`Responsável: ${u.name}`}
                                  >
                                    {u.name.charAt(0)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {task.postDate ? (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                              <span>Publicação:</span>
                              <strong className={`${
                                isPostDelayed
                                  ? 'text-amber-700 dark:text-amber-400 font-bold'
                                  : 'text-slate-800 dark:text-slate-200'
                              }`}>
                                {formatStandardDate(task.postDate)}
                              </strong>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between italic">
                              <span>Publicação:</span>
                              <span className="font-medium">Sem data</span>
                            </div>
                          )}

                          {isAlert && (
                            <div className="flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 pt-1">
                              <AlertCircle className="h-3.5 w-3.5" />
                              <span>Ajuste solicitado</span>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {colTasks.length === 0 && (
                      <div className="grid place-items-center py-16 text-center text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-300/80 dark:border-slate-800 rounded-xl">
                        Solte uma tarefa aqui
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CALENDAR VIEW (With Drag & Drop tasks between dates) */}
      {/* ========================================================================= */}
      {viewMode === 'calendar' && (
        <div className="space-y-4">
          <div className="clean-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white capitalize">
                {format(calendarDate, 'MMMM yyyy', { locale: ptBR })}
              </h2>

              <div className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 p-1 bg-slate-100/80 dark:bg-slate-900/80">
                <button
                  onClick={() => setCalendarDate(subMonths(calendarDate, 1))}
                  className="p-1 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-lg cursor-pointer"
                  title="Mês anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setCalendarDate(new Date())}
                  className="px-2.5 py-0.5 text-xs font-bold text-slate-800 dark:text-white hover:bg-white dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Hoje
                </button>
                <button
                  onClick={() => setCalendarDate(addMonths(calendarDate, 1))}
                  className="p-1 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-lg cursor-pointer"
                  title="Próximo mês"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              💡 Arraste tarefas de um dia para o outro para alterar a data automaticamente.
            </p>
          </div>

          <div className="clean-card overflow-hidden">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80 text-center text-xs font-bold text-slate-700 dark:text-slate-300 py-3">
              <div>Dom</div>
              <div>Seg</div>
              <div>Ter</div>
              <div>Qua</div>
              <div>Qui</div>
              <div>Sex</div>
              <div>Sáb</div>
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-200/60 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800">
              {calendarDays.map((day, idx) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const isCurrentMonth = isSameMonth(day, calendarDate);
                const isCurrentDay = isToday(day);
                const isCalendarDayDropActive = calendarDragOverDate === dayStr;

                const dayTasks = filteredTasks.filter((t) => t.postDate === dayStr);

                return (
                  <div
                    key={idx}
                    onDragOver={(e) => handleCalendarDayDragOver(e, dayStr)}
                    onDrop={(e) => handleCalendarDayDrop(e, dayStr)}
                    className={`min-h-[120px] p-2 flex flex-col justify-between transition-colors ${
                      isCalendarDayDropActive
                        ? 'bg-slate-900/10 dark:bg-white/10 ring-2 ring-slate-900 dark:ring-white ring-inset'
                        : isCurrentMonth
                        ? 'bg-transparent'
                        : 'bg-slate-50/40 dark:bg-slate-950/40 text-slate-400 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-xs font-bold grid place-items-center h-6 w-6 rounded-full ${
                          isCurrentDay
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {format(day, 'd')}
                      </span>

                      {dayTasks.length > 0 && (
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          {dayTasks.length} {dayTasks.length === 1 ? 'post' : 'posts'}
                        </span>
                      )}
                    </div>

                    {/* Day's Tasks (Draggable) */}
                    <div className="space-y-1.5 flex-1 overflow-y-auto max-h-28">
                      {dayTasks.map((task) => {
                        const client = clients.find((c) => c.id === task.clientId);
                        const isBeingDragged = draggedTaskId === task.id;
                        const isDelayed = isTaskDelayed(task);

                        return (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleTaskDragStart(e, task.id)}
                            onDragEnd={() => setDraggedTaskId(null)}
                            onClick={() => onSelectTask(task.id)}
                            className={`cursor-grab active:cursor-grabbing rounded-lg p-1.5 text-[11px] font-semibold clean-card-hover border shadow-xs space-y-0.5 truncate transition-all ${
                              isBeingDragged ? 'opacity-30 scale-95' : ''
                            } ${
                              isDelayed
                                ? 'border-amber-400/60 dark:border-amber-500/40 bg-amber-50/70 dark:bg-amber-950/40'
                                : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80'
                            }`}
                          >
                            <div className="flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-300 truncate">
                              <span>{client?.emoji || '🏢'}</span>
                              <span className="truncate font-bold">{client?.company}</span>
                              {isDelayed && (
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" title="Tarefa atrasada" />
                              )}
                              {task.editingBy &&
                                Date.now() - new Date(task.editingBy.updatedAt).getTime() < 120000 && (
                                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 animate-ping ml-auto" title={`Editando: ${task.editingBy.userName}`} />
                                )}
                            </div>
                            <p className="text-slate-900 dark:text-white font-medium truncate">
                              {task.title}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Modal: Adicionar Coluna no Kanban */}
      {/* ========================================================================= */}
      {showAddColumnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="clean-card w-full max-w-md p-6 md:p-8 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Adicionar Nova Coluna</h3>
              <button
                onClick={() => setShowAddColumnModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nome da Coluna</label>
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Ex: Em Revisão, Gravação, Agendado..."
                  className="clean-input h-10 w-full px-3 text-xs mt-1 text-slate-900 dark:text-white font-semibold"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Cor de Fundo da Coluna (Tonalidade Suave)
                </label>
                <div className="grid grid-cols-7 gap-2.5 mt-2">
                  {PRESET_COLUMN_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setNewColumnColor(c.hex)}
                      title={c.name}
                      className={`h-8 w-8 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                        newColumnColor === c.hex
                          ? 'ring-2 ring-slate-900 dark:ring-white scale-110 shadow-md'
                          : 'hover:scale-105 opacity-85 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {newColumnColor === c.hex && <Check className="h-4 w-4 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="pt-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Pré-visualização da Coluna
                </label>
                <div
                  className="mt-1.5 p-3 rounded-xl border text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between"
                  style={{
                    backgroundColor: `${newColumnColor}20`,
                    borderColor: `${newColumnColor}50`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: newColumnColor }} />
                    <span>{newColumnName.trim() || 'Nome da Coluna'}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">0 tarefas</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowAddColumnModal(false)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateColumn}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold px-4 py-2 text-xs shadow-sm cursor-pointer"
              >
                Criar Coluna
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Modal: Editar Nome e Cor da Coluna */}
      {/* ========================================================================= */}
      {editingColumn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="clean-card w-full max-w-md p-6 md:p-8 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Editar Coluna</h3>
              <button
                onClick={() => setEditingColumn(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nome da Coluna</label>
                <input
                  type="text"
                  value={editColumnName}
                  onChange={(e) => setEditColumnName(e.target.value)}
                  placeholder="Nome da coluna..."
                  className="clean-input h-10 w-full px-3 text-xs mt-1 text-slate-900 dark:text-white font-semibold"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Cor de Fundo da Coluna (Tonalidade Suave)
                </label>
                <div className="grid grid-cols-7 gap-2.5 mt-2">
                  {PRESET_COLUMN_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setEditColumnColor(c.hex)}
                      title={c.name}
                      className={`h-8 w-8 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                        editColumnColor === c.hex
                          ? 'ring-2 ring-slate-900 dark:ring-white scale-110 shadow-md'
                          : 'hover:scale-105 opacity-85 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {editColumnColor === c.hex && <Check className="h-4 w-4 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="pt-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Pré-visualização da Coluna
                </label>
                <div
                  className="mt-1.5 p-3 rounded-xl border text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between"
                  style={{
                    backgroundColor: `${editColumnColor}20`,
                    borderColor: `${editColumnColor}50`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: editColumnColor }} />
                    <span>{editColumnName.trim() || 'Nome da Coluna'}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Prévia</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setEditingColumn(null)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEditColumnModal}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold px-4 py-2 text-xs shadow-sm cursor-pointer"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. IMAGE PREVIEW & DOWNLOAD MODAL (Opened from table attachment preview) */}
      {/* ========================================================================= */}
      {previewModalData && (() => {
        const { task, fileIndex } = previewModalData;
        const imageFiles = (task.files || []).filter((f) => f.dataUrl || f.url);
        const currentFile = imageFiles[fileIndex] || imageFiles[0];
        const client = clients.find((c) => c.id === task.clientId);

        if (!currentFile) return null;

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150"
            onClick={() => setPreviewModalData(null)}
          >
            <div
              className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-[#121620] rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/80 dark:bg-slate-900/60 backdrop-blur-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/20">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                      {task.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 truncate">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {client?.company || 'Cliente'}
                      </span>
                      <span>•</span>
                      <span className="truncate">{currentFile.name || 'Arte'}</span>
                      {imageFiles.length > 1 && (
                        <>
                          <span>•</span>
                          <span className="font-bold text-sky-600 dark:text-sky-400">
                            Slide {fileIndex + 1} de {imageFiles.length}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Download Button */}
                  <button
                    type="button"
                    onClick={() => handleDownloadFile(currentFile)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                    title="Baixar imagem no seu dispositivo"
                  >
                    <Download className="h-4 w-4" />
                    <span>Baixar Imagem</span>
                  </button>

                  {/* Close button */}
                  <button
                    type="button"
                    onClick={() => setPreviewModalData(null)}
                    className="p-2.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Fechar (Esc)"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Main Image Stage */}
              <div className="flex-1 p-4 sm:p-6 flex items-center justify-center bg-slate-950 relative min-h-[320px] max-h-[66vh] overflow-hidden select-none">
                <img
                  src={currentFile.dataUrl || currentFile.url}
                  alt={currentFile.name || 'Arte'}
                  className="max-h-[62vh] w-auto max-w-full object-contain rounded-lg shadow-2xl"
                />

                {/* Left/Right Navigation for multi-slide posts */}
                {imageFiles.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewModalData({
                          task,
                          fileIndex: (fileIndex - 1 + imageFiles.length) % imageFiles.length,
                        })
                      }
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur shadow-lg transition-all cursor-pointer"
                      title="Slide anterior"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewModalData({
                          task,
                          fileIndex: (fileIndex + 1) % imageFiles.length,
                        })
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur shadow-lg transition-all cursor-pointer"
                      title="Próximo slide"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails strip if multiple */}
              {imageFiles.length > 1 && (
                <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-center gap-2 overflow-x-auto">
                  {imageFiles.map((f, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPreviewModalData({ task, fileIndex: idx })}
                      className={`h-12 w-12 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                        fileIndex === idx
                          ? 'border-sky-500 ring-2 ring-sky-500/40 scale-105'
                          : 'border-slate-700 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={f.dataUrl || f.url} alt={`Slide ${idx + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="p-3.5 px-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-900/40">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {imageFiles.length} {imageFiles.length === 1 ? 'anexo' : 'anexos'}
                  </span>
                  {currentFile.size && (
                    <span className="text-[11px] text-slate-400">
                      ({(currentFile.size / 1024).toFixed(0)} KB)
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const tId = task.id;
                    setPreviewModalData(null);
                    onSelectTask(tId);
                  }}
                  className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                >
                  Abrir fluxo completo da tarefa →
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Save Table View For All Toast */}
      {saveSuccessToast && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 dark:border-slate-300 text-xs font-semibold animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-slate-950 font-bold shrink-0">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold">Visualização salva com sucesso!</span>
            <span className="text-[11px] text-slate-300 dark:text-slate-600 font-normal">
              Esta organização de colunas e larguras agora é o padrão de todos na agência.
            </span>
          </div>
          <button
            onClick={() => setSaveSuccessToast(false)}
            className="p-1 text-slate-400 hover:text-white dark:hover:text-slate-900 cursor-pointer ml-2"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Floating Undo / Duplicate Toast */}
      {trashToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 dark:border-slate-300 text-xs font-semibold animate-in fade-in slide-in-from-bottom-4 duration-200">
          {trashToast.isDuplicated ? (
            <>
              <Copy className="h-4 w-4 text-sky-400 dark:text-sky-600 shrink-0" />
              <span className="max-w-[260px] truncate">
                Tarefa &ldquo;{trashToast.title}&rdquo; duplicada com sucesso!
              </span>
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4 text-rose-400 dark:text-rose-600 shrink-0" />
              <span className="max-w-[260px] truncate">
                Tarefa &ldquo;{trashToast.title}&rdquo; movida para a Lixeira (30 dias)
              </span>
              {trashToast.trashId && (
                <button
                  onClick={() => handleUndoDelete(trashToast.trashId!)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] transition-colors cursor-pointer whitespace-nowrap shadow-xs"
                >
                  Desfazer
                </button>
              )}
            </>
          )}
          <button
            onClick={() => setTrashToast(null)}
            className="p-1 text-slate-400 hover:text-white dark:hover:text-slate-900 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Floating Save View for All Admin Pop-up */}
      {isViewModified && currentUser?.role === 'admin' && viewMode === 'list' && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-3 bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md border border-slate-800 dark:border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-bold">Estrutura da tabela modificada</span>
            </div>
            <button
              id="btn-floating-save-view"
              type="button"
              onClick={handleSaveViewForAll}
              disabled={isSavingView}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isSavingView ? 'Salvando...' : 'Salvar para todos'}</span>
            </button>
            <button
              type="button"
              onClick={handleResetColumns}
              className="text-xs text-slate-400 hover:text-white dark:text-slate-600 dark:hover:text-slate-950 underline cursor-pointer"
            >
              Descartar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
