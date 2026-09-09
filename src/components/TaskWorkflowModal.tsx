import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  Copy as CopyIcon,
  Trash2,
  Upload,
  Link2,
  Send,
  Eye,
  Check,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Image as ImageIcon,
  User as UserIcon,
  Clock,
  MessageSquare,
  FileText,
  AlertCircle,
  Download,
  Paperclip,
} from 'lucide-react';
import { useAppStore, useCurrentUser } from '../store';
import { Task, WorkflowStep, FunnelStage, ContentChannel, TaskFile, TaskActivity } from '../types';
import { formatDate } from '../utils/dateUtils';
import { downloadTaskFile } from '../utils/fileDownload';
import { uploadTaskFileToCloud, loadTaskFileDataUrl } from '../services/taskFileCloudSync';
import { getCanonicalFormatKey } from '../utils/badgeStyles';

interface TaskWorkflowModalProps {
  taskId: string | null;
  onClose: () => void;
  onOpenClientPortal?: (clientId: string) => void;
}

const WORKFLOW_STEPS: { key: WorkflowStep; label: string }[] = [
  { key: 'briefing', label: 'Briefing' },
  { key: 'copy', label: 'Copy' },
  { key: 'arte', label: 'Arte' },
  { key: 'conferencia', label: 'Conferência' },
  { key: 'em_aprovacao', label: 'Em aprovação' },
  { key: 'aprovado', label: 'Aprovado' },
];

export const TaskWorkflowModal: React.FC<TaskWorkflowModalProps> = ({
  taskId,
  onClose,
  onOpenClientPortal,
}) => {
  const tasks = useAppStore((s) => s.tasks);
  const clients = useAppStore((s) => s.clients);
  const users = useAppStore((s) => s.users);
  const statuses = useAppStore((s) => s.statuses);
  const categories = useAppStore((s) => s.categories);
  const currentUser = useCurrentUser();
  const updateTask = useAppStore((s) => s.updateTask);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const duplicateTask = useAppStore((s) => s.duplicateTask);
  const setTaskStatus = useAppStore((s) => s.setTaskStatus);
  const setTaskWorkflowStep = useAppStore((s) => s.setTaskWorkflowStep);
  const startTimer = useAppStore((s) => s.startTimer);
  const stopTimer = useAppStore((s) => s.stopTimer);
  const addTaskFiles = useAppStore((s) => s.addTaskFiles);
  const removeTaskFile = useAppStore((s) => s.removeTaskFile);
  const clientApprove = useAppStore((s) => s.clientApprove);
  const addTaskComment = useAppStore((s) => s.addTaskComment);
  const adminPrompts = useAppStore((s) => s.adminPrompts);
  const setTaskLiveEditing = useAppStore((s) => s.setTaskLiveEditing);
  const clearTaskLiveEditing = useAppStore((s) => s.clearTaskLiveEditing);

  const task = tasks.find((t) => t.id === taskId);
  const selectedClient = clients.find((c) => c.id === task?.clientId) || clients[0];
  const staffUsers = users.filter((u) => u.role !== 'cliente');

  // Step resolution: map legacy 'headline' to 'copy'
  const currentStepKey: WorkflowStep =
    task?.currentStep === 'headline' ? 'copy' : task?.currentStep || 'briefing';

  // Live editing presence effect
  useEffect(() => {
    if (!taskId || !currentUser) return;
    const userPayload = {
      id: currentUser.id,
      name: currentUser.name,
      color: currentUser.color || '#10b981',
    };
    // Announce editing
    setTaskLiveEditing(taskId, userPayload);

    // Heartbeat every 20 seconds
    const interval = setInterval(() => {
      setTaskLiveEditing(taskId, userPayload);
    }, 20000);

    return () => {
      clearInterval(interval);
      clearTaskLiveEditing(taskId);
    };
  }, [taskId, currentUser?.id]);

  // Local states
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [selectedCopyOption, setSelectedCopyOption] = useState<'headline' | 'legenda' | 'carrossel' | 'roteiro' | null>('headline');
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const [customLinkInput, setCustomLinkInput] = useState('');
  const [observationInput, setObservationInput] = useState('');
  const [selectedMediaPreview, setSelectedMediaPreview] = useState<string | null>(null);
  const [selectedMediaFile, setSelectedMediaFile] = useState<TaskFile | null>(null);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);

  // Auto-close assignee dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        assigneeDropdownRef.current &&
        !assigneeDropdownRef.current.contains(event.target as Node)
      ) {
        setShowAssigneeDropdown(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowAssigneeDropdown(false);
      }
    };

    if (showAssigneeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showAssigneeDropdown]);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  // Local draft state initialized with current task
  const [draft, setDraft] = useState<Task | null>(() => task ? { ...task } : null);

  // When task id changes, re-initialize draft
  useEffect(() => {
    if (task) {
      setDraft({ ...task });
      setHasUnsavedChanges(false);
      const initialFormat = getCanonicalFormatKey(task);
      if (initialFormat === 'roteiro') {
        setSelectedCopyOption('roteiro');
      }
    }
  }, [taskId]);

  // Auto-load original uncompressed files from IndexedDB / Firestore cloud
  useEffect(() => {
    if (!task) return;
    let isCancelled = false;

    if (task.files && task.files.length > 0) {
      task.files.forEach(async (f) => {
        // If dataUrl is not present or truncated, fetch the original uncompressed dataUrl
        if (!f.dataUrl && (!f.type || f.type.startsWith('image/'))) {
          const loadedDataUrl = await loadTaskFileDataUrl(f);
          if (loadedDataUrl && !isCancelled) {
            setDraft((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                files: (prev.files || []).map((fileItem) =>
                  fileItem.id === f.id ? { ...fileItem, dataUrl: loadedDataUrl } : fileItem
                ),
              };
            });
          }
        }
      });
    }

    if (task.briefingFiles && task.briefingFiles.length > 0) {
      task.briefingFiles.forEach(async (f) => {
        if (!f.dataUrl && (!f.type || f.type.startsWith('image/'))) {
          const loadedDataUrl = await loadTaskFileDataUrl(f);
          if (loadedDataUrl && !isCancelled) {
            setDraft((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                briefingFiles: (prev.briefingFiles || []).map((fileItem) =>
                  fileItem.id === f.id ? { ...fileItem, dataUrl: loadedDataUrl } : fileItem
                ),
              };
            });
          }
        }
      });
    }

    return () => {
      isCancelled = true;
    };
  }, [task?.id, task?.files?.length, task?.briefingFiles?.length]);

  // Handler to mutate draft locally
  const updateDraft = (fields: Partial<Task>) => {
    setDraft((prev) => {
      if (!prev) return null;
      return { ...prev, ...fields };
    });
    setHasUnsavedChanges(true);
  };

  // Explicit Save function to commit draft to store and Firestore cloud
  const handleSaveTask = async () => {
    if (!draft || !task) return;
    setIsSaving(true);
    try {
      updateTask(task.id, {
        title: draft.title,
        clientId: draft.clientId,
        categoryId: draft.categoryId,
        status: draft.status,
        assigneeId: draft.assigneeId,
        assigneeIds: draft.assigneeIds,
        channel: draft.channel,
        copyMode: draft.copyMode,
        funnelStage: draft.funnelStage,
        artDate: draft.artDate,
        postDate: draft.postDate,
        briefingText: draft.briefingText,
        briefingFiles: draft.briefingFiles,
        selectedHeadline: draft.selectedHeadline,
        caption: draft.caption,
        scriptText: draft.scriptText,
        files: draft.files,
        aiChatHistory: draft.aiChatHistory,
      });
      setHasUnsavedChanges(false);
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2500);
    } catch (err) {
      console.error('Error saving task:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const briefingFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingBriefingFiles, setIsUploadingBriefingFiles] = useState(false);

  // Sync Timer live tick
  useEffect(() => {
    if (!task?.timerStartedAt) {
      setTimerSeconds(0);
      return;
    }
    const update = () => {
      const elapsed = Math.floor((Date.now() - task.timerStartedAt!) / 1000);
      setTimerSeconds(elapsed);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [task?.timerStartedAt]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [task?.aiChatHistory, isChatLoading]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedMediaPreview) {
          setSelectedMediaPreview(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, selectedMediaPreview]);

  if (!task) return null;

  // Format timer
  const totalSeconds = (task.timeSpent || 0) + (task.timerStartedAt ? timerSeconds : 0);
  const formatTimerDisplay = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    const h = Math.floor(m / 60);
    if (h > 0) {
      const remM = m % 60;
      return `${String(h).padStart(2, '0')}:${String(remM).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Active item to display (draft if available, fallback to task)
  const currentItem = draft || task;

  // Stepper navigation
  const currentStepIndex = Math.max(
    0,
    WORKFLOW_STEPS.findIndex((s) => s.key === currentStepKey)
  );

  const goToStep = (stepKey: WorkflowStep) => {
    setTaskWorkflowStep(task.id, stepKey);
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      goToStep(WORKFLOW_STEPS[currentStepIndex - 1].key);
    }
  };

  const handleNextStep = () => {
    if (currentStepIndex < WORKFLOW_STEPS.length - 1) {
      const nextStep = WORKFLOW_STEPS[currentStepIndex + 1].key;
      goToStep(nextStep);
    }
  };

  // AI Chat execution
  const handleSendChatMessage = async (
    promptOptionOverride?: 'headline' | 'legenda' | 'carrossel' | 'roteiro',
    customText?: string
  ) => {
    const textToSend = customText !== undefined ? customText : chatInput.trim();
    const promptTypeToUse = promptOptionOverride || (textToSend ? 'custom' : selectedCopyOption || 'headline');

    if (!promptOptionOverride && !textToSend) return;

    // Prepare user message
    let userDisplayContent = textToSend;
    if (promptOptionOverride) {
      if (promptOptionOverride === 'headline') userDisplayContent = 'Gerar opções de Headlines';
      else if (promptOptionOverride === 'legenda') userDisplayContent = 'Escrever Legenda';
      else if (promptOptionOverride === 'carrossel') userDisplayContent = 'Criar estrutura de Carrossel';
      else if (promptOptionOverride === 'roteiro') userDisplayContent = 'Criar Roteiro de Vídeo';
    }

    const currentHistory = currentItem.aiChatHistory || [];
    const newUserMessage = {
      id: 'msg-' + Date.now(),
      role: 'user' as const,
      content: userDisplayContent,
      timestamp: new Date().toISOString(),
    };

    const updatedHistoryWithUser = [...currentHistory, newUserMessage];

    // Update in draft
    updateDraft({
      aiChatHistory: updatedHistoryWithUser,
    });

    setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/ai/task-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedHistoryWithUser.map((m) => ({ role: m.role, content: m.content })),
          promptType: promptTypeToUse,
          customMessage: textToSend,
          taskContext: {
            title: currentItem.title,
            briefing: currentItem.briefingText || currentItem.title,
            clientName: selectedClient?.company || 'Geral',
            niche: selectedClient?.niche || 'Negócios e Serviços',
            audience: selectedClient?.targetAudience || 'Público Geral',
            persona: selectedClient?.persona || 'Consumidor Qualificado',
            tone: Array.isArray(selectedClient?.toneOfVoice) ? selectedClient.toneOfVoice.join(', ') : 'Profissional e acolhedor',
            format: currentItem.channel || 'Instagram Post',
            channel: currentItem.channel || 'instagram',
            recommendedWords: Array.isArray(selectedClient?.recommendedWords) ? selectedClient.recommendedWords.join(', ') : '',
            forbiddenWords: Array.isArray(selectedClient?.forbiddenWords) ? selectedClient.forbiddenWords.join(', ') : '',
          },
          systemPrompt:
            promptTypeToUse === 'headline'
              ? adminPrompts?.headlinePrompt
              : promptTypeToUse === 'legenda'
              ? adminPrompts?.copyCaptionPrompt
              : promptTypeToUse === 'carrossel'
              ? adminPrompts?.copyCarouselPrompt
              : promptTypeToUse === 'roteiro'
              ? adminPrompts?.copyScriptPrompt
              : adminPrompts?.chatRefinePrompt,
          adminPrompts: adminPrompts,
        }),
      });

      const data = await res.json();
      const assistantReply = data.reply || 'Conteúdo gerado com sucesso!';

      const newAssistantMessage = {
        id: 'msg-' + (Date.now() + 1),
        role: 'assistant' as const,
        content: assistantReply,
        timestamp: new Date().toISOString(),
      };

      // Auto-extract and synchronize to conference fields if appropriate
      let updatedCaption = currentItem.caption;
      let updatedScript = currentItem.scriptText;
      let updatedHeadline = currentItem.selectedHeadline;

      if (promptTypeToUse === 'legenda' && !currentItem.caption) {
        updatedCaption = assistantReply;
      } else if (promptTypeToUse === 'roteiro' && !currentItem.scriptText) {
        updatedScript = assistantReply;
      } else if (promptTypeToUse === 'headline' && !currentItem.selectedHeadline) {
        const match = assistantReply.match(/1\.\s*\*?\*?([^\n\*\r]+)/);
        if (match && match[1]) {
          updatedHeadline = match[1].trim();
        }
      }

      updateDraft({
        aiChatHistory: [...updatedHistoryWithUser, newAssistantMessage],
        caption: updatedCaption,
        scriptText: updatedScript,
        selectedHeadline: updatedHeadline,
      });
    } catch (err) {
      console.error('Error generating AI chat response:', err);
      const fallbackAssistantMessage = {
        id: 'msg-' + (Date.now() + 1),
        role: 'assistant' as const,
        content: 'Aqui está uma sugestão inicial de copy para o post:\n\n' +
          'Você sabia que pequenas mudanças diárias geram grandes transformações? 🚀\n\n' +
          'Para alcançar os melhores resultados, o segredo é consistência e método. Salve este post e compartilhe nos comentários a sua opinião! 👇\n\n' +
          '#marketing #estrategia #crescimento',
        timestamp: new Date().toISOString(),
      };
      updateDraft({
        aiChatHistory: [...updatedHistoryWithUser, fallbackAssistantMessage],
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleCopyMessage = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageIndex(index);
    setTimeout(() => setCopiedMessageIndex(null), 2000);
  };

  // Upload handling - 100% UNCOMPRESSED ORIGINAL QUALITY
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingFiles(true);
    const newFiles: TaskFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // Read file directly with NO compression - preserve 100% original quality
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string) || '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });

        const newFileItem: TaskFile = {
          id: 'file-' + Date.now() + '-' + i + '-' + Math.random().toString(36).substring(2, 7),
          name: file.name, // Keep exact original filename
          type: file.type || 'image/jpeg',
          size: file.size,
          dataUrl,
          uploadedAt: new Date().toISOString(),
        };
        newFiles.push(newFileItem);

        // Upload chunked uncompressed file to cloud in the background
        if (task) {
          uploadTaskFileToCloud(task.id, newFileItem).catch((err) =>
            console.warn('Background upload chunk error:', err)
          );
        }
      } catch (err) {
        console.error('Error processing file:', err);
      }
    }

    if (newFiles.length > 0) {
      const updatedList = [...(currentItem.files || []), ...newFiles];
      updateDraft({ files: updatedList });
      addTaskFiles(task.id, newFiles);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsUploadingFiles(false);
  };

  const handleAddDriveLink = () => {
    if (!customLinkInput.trim()) return;
    const linkFile: TaskFile = {
      id: 'link-' + Date.now(),
      name: customLinkInput.trim(),
      url: customLinkInput.trim(),
      type: 'link',
    };
    const updatedList = [...(currentItem.files || []), linkFile];
    updateDraft({ files: updatedList });
    addTaskFiles(task.id, [linkFile]);
    setCustomLinkInput('');
  };

  const handleRemoveFile = (fileId: string) => {
    const updatedList = (currentItem.files || []).filter((f) => f.id !== fileId);
    updateDraft({ files: updatedList });
    removeTaskFile(task.id, fileId);
  };

  const handleBriefingFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !task) return;
    setIsUploadingBriefingFiles(true);
    const newFiles: TaskFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string) || '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });

        const newFileItem: TaskFile = {
          id: 'bfile-' + Date.now() + '-' + i + '-' + Math.random().toString(36).substring(2, 7),
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          dataUrl,
          uploadedAt: new Date().toISOString(),
        };
        newFiles.push(newFileItem);

        uploadTaskFileToCloud(task.id, newFileItem).catch((err) =>
          console.warn('Background briefing upload chunk error:', err)
        );
      } catch (err) {
        console.error('Error processing briefing file:', err);
      }
    }

    if (newFiles.length > 0) {
      const updatedList = [...(currentItem.briefingFiles || []), ...newFiles];
      updateDraft({ briefingFiles: updatedList });
      updateTask(task.id, { briefingFiles: updatedList });
    }
    if (briefingFileInputRef.current) {
      briefingFileInputRef.current.value = '';
    }
    setIsUploadingBriefingFiles(false);
  };

  const handleRemoveBriefingFile = (fileId: string) => {
    if (!task) return;
    const updatedList = (currentItem.briefingFiles || []).filter((f) => f.id !== fileId);
    updateDraft({ briefingFiles: updatedList });
    updateTask(task.id, { briefingFiles: updatedList });
  };

  // Observation registration
  const handleAddObservation = () => {
    if (!observationInput.trim()) return;
    addTaskComment(task.id, observationInput.trim(), 'comment');
    setObservationInput('');
  };

  // Client approve action
  const handleApprove = () => {
    clientApprove(task.id, currentUser?.name || 'Cliente');
    goToStep('aprovado');
  };

  const assigneesList = (currentItem.assigneeIds && currentItem.assigneeIds.length > 0
    ? currentItem.assigneeIds
    : currentItem.assigneeId
    ? [currentItem.assigneeId]
    : []
  )
    .map((id) => users.find((u) => u.id === id))
    .filter(Boolean);

  return (
    <div
      id="task-workflow-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
    >
      <div
        id="task-workflow-modal-container"
        className="relative w-full max-w-5xl h-[88vh] max-h-[820px] min-h-[620px] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* ================= TOP ACTION BAR & HEADER ================= */}
        <div className="px-6 sm:px-8 md:px-10 pt-6 sm:pt-8 shrink-0">
          {/* Action pills row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Timer Start / Stop */}
              <button
                id="task-timer-toggle-btn"
                onClick={() => {
                  if (task.timerStartedAt) {
                    stopTimer(task.id);
                  } else {
                    startTimer(task.id);
                  }
                }}
                className="px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-all cursor-pointer shadow-xs"
              >
                {task.timerStartedAt ? (
                  <>
                    <Pause className="h-3.5 w-3.5 fill-current animate-pulse text-amber-400" />
                    Pausar tempo
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Iniciar tempo
                  </>
                )}
              </button>

              {/* Timer Badge */}
              <div
                id="task-timer-badge"
                className="px-3.5 py-1.5 rounded-full text-xs font-mono font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50"
              >
                TEMPO: {formatTimerDisplay(totalSeconds)}
              </div>

              {/* Duplicate Button */}
              <button
                id="task-duplicate-btn"
                onClick={() => {
                  duplicateTask(task.id);
                  onClose();
                }}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <CopyIcon className="h-3.5 w-3.5" />
                Duplicar
              </button>

              {/* Delete Button */}
              {showDeleteConfirm ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      deleteTask(task.id);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-full text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 cursor-pointer transition-colors"
                  >
                    Confirmar exclusão
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-2.5 py-1.5 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  id="task-delete-btn"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir
                </button>
              )}

              {/* Explicit Save Button */}
              <button
                id="task-save-btn"
                type="button"
                onClick={handleSaveTask}
                disabled={isSaving}
                className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                  hasUnsavedChanges
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse ring-2 ring-emerald-400/50'
                    : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-100'
                }`}
                title="Salvar alterações na tarefa"
              >
                {isSaving ? (
                  <>
                    <Sparkles className="h-3.5 w-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : saveToast ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-white" />
                    <span>Salvo!</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>{hasUnsavedChanges ? 'Salvar Tarefa' : 'Salvo'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Close 'X' Button */}
            <button
              id="task-modal-close-btn"
              onClick={() => {
                if (hasUnsavedChanges) {
                  handleSaveTask();
                }
                onClose();
              }}
              className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fechar (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Toast Notification when saved */}
          {saveToast && (
            <div className="mt-3 px-3.5 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md animate-in fade-in slide-in-from-top-2 duration-200 w-fit">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Tarefa e briefing salvos com sucesso!</span>
            </div>
          )}

          {/* Collaborative Live Editing Banner */}
          {task.editingBy && task.editingBy.userId !== currentUser?.id && (
            <div className="mt-4 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in duration-300">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span>
                  <strong>{task.editingBy.userName}</strong> está editando esta tarefa simultaneamente.
                </span>
              </div>
            </div>
          )}

          {/* Large auto-wrap Task Title */}
          <div className="mt-5 mb-4">
            <textarea
              id="task-title-input"
              value={currentItem.title}
              onChange={(e) => updateDraft({ title: e.target.value })}
              placeholder="Digite o título da tarefa..."
              rows={1}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = target.scrollHeight + 'px';
              }}
              className="w-full text-2xl sm:text-3xl font-extrabold font-display text-slate-900 dark:text-white tracking-tight leading-tight bg-transparent border-none outline-none resize-none p-0 focus:ring-0 placeholder:text-slate-300 dark:placeholder:text-slate-600"
            />
          </div>

          {/* Clean Divider Line */}
          <div className="border-b border-slate-200 dark:border-slate-800" />
        </div>

        {/* ================= MAIN SCROLLABLE CONTENT BODY ================= */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 md:px-10 py-6 custom-scrollbar">
          {/* STEP 1: BRIEFING */}
          {currentStepKey === 'briefing' && (
            <div id="step-briefing-view" className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start animate-in fade-in duration-150">
              {/* Left Column: Form Fields Grid */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Cliente */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Cliente
                    </label>
                    <select
                      id="task-client-select"
                      value={currentItem.clientId}
                      onChange={(e) => updateDraft({ clientId: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10"
                    >
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.company || c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Status
                    </label>
                    <select
                      id="task-status-select"
                      value={currentItem.status}
                      onChange={(e) => {
                        updateDraft({ status: e.target.value as any });
                        setTaskStatus(task.id, e.target.value as any);
                      }}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10"
                    >
                      {statuses.map((st) => (
                        <option key={st.key} value={st.key}>
                          {st.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Responsáveis (Multi-assignees) */}
                  <div className="relative" ref={assigneeDropdownRef}>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Responsáveis
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                      className="w-full flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none text-left cursor-pointer min-h-[38px] hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        {assigneesList.length > 0 ? (
                          <div className="flex -space-x-1.5 overflow-hidden items-center">
                            {assigneesList.slice(0, 3).map((u: any) => (
                              <span
                                key={u.id}
                                className="inline-flex h-5 w-5 rounded-full ring-2 ring-white dark:ring-slate-900 items-center justify-center text-[10px] font-bold text-white uppercase shrink-0"
                                style={{ backgroundColor: u.color || '#3b82f6' }}
                                title={u.name}
                              >
                                {u.name?.slice(0, 1) || 'U'}
                              </span>
                            ))}
                            {assigneesList.length > 3 && (
                              <span className="inline-flex h-5 w-5 rounded-full ring-2 ring-white dark:ring-slate-900 items-center justify-center text-[9px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 shrink-0">
                                +{assigneesList.length - 3}
                              </span>
                            )}
                            <span className="ml-1.5 text-xs text-slate-700 dark:text-slate-300 truncate">
                              {assigneesList.map((u: any) => u.name).join(', ')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Selecionar responsáveis...</span>
                        )}
                      </div>
                      <ChevronRight className={`h-3.5 w-3.5 text-slate-400 transition-transform ${showAssigneeDropdown ? 'rotate-90' : ''}`} />
                    </button>

                    {/* Dropdown popup with auto-close */}
                    {showAssigneeDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-2 z-30 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-2 py-1 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 mb-1">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Equipe
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowAssigneeDropdown(false)}
                            className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer px-1.5 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            Fechar
                          </button>
                        </div>
                        <div className="max-h-52 overflow-y-auto space-y-1 custom-scrollbar">
                          {staffUsers.map((u) => {
                            const isSelected = currentItem.assigneeIds?.includes(u.id) || currentItem.assigneeId === u.id;
                            return (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => {
                                  const currentIds = currentItem.assigneeIds || (currentItem.assigneeId ? [currentItem.assigneeId] : []);
                                  const newIds = isSelected
                                    ? currentIds.filter((id) => id !== u.id)
                                    : [...currentIds, u.id];
                                  updateDraft({
                                    assigneeIds: newIds,
                                    assigneeId: newIds[0] || undefined,
                                  });
                                }}
                                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase"
                                    style={{ backgroundColor: u.color || '#3b82f6' }}
                                  >
                                    {u.name?.slice(0, 1) || 'U'}
                                  </span>
                                  <span>{u.name}</span>
                                </div>
                                {isSelected && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                              </button>
                            );
                          })}
                        </div>
                        <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setShowAssigneeDropdown(false)}
                            className="w-full py-1 text-center text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                          >
                            Concluir seleção
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Canal */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Canal
                    </label>
                    <select
                      id="task-channel-select"
                      value={currentItem.channel || 'instagram'}
                      onChange={(e) => updateDraft({ channel: e.target.value as ContentChannel })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 capitalize"
                    >
                      <option value="instagram">Instagram</option>
                      <option value="tiktok">TikTok</option>
                      <option value="youtube">YouTube</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="facebook">Facebook</option>
                      <option value="blog">Blog</option>
                    </select>
                  </div>

                  {/* Formato */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Formato
                    </label>
                    <select
                      id="task-format-select"
                      value={
                        categories.some((c) => c.id === currentItem.categoryId)
                          ? currentItem.categoryId
                          : categories.find((c) => {
                              const n = (c.name || '').toLowerCase();
                              if (currentItem.copyMode === 'roteiro' && (n.includes('reels') || n.includes('vídeo') || n.includes('video'))) return true;
                              if (currentItem.copyMode === 'carrossel' && n.includes('carrossel')) return true;
                              if (currentItem.copyMode === 'none' && n.includes('stories')) return true;
                              if (currentItem.copyMode === 'legenda' && (n.includes('post') || n.includes('legenda') || n.includes('estático'))) return true;
                              return false;
                            })?.id || categories[0]?.id || ''
                      }
                      onChange={(e) => {
                        const selectedCatId = e.target.value;
                        const foundCat = categories.find((c) => c.id === selectedCatId);
                        const catNameLower = (foundCat?.name || '').toLowerCase();

                        let selectedMode: 'roteiro' | 'carrossel' | 'legenda' | 'none' = 'carrossel';
                        if (
                          catNameLower.includes('reels') ||
                          catNameLower.includes('vídeo') ||
                          catNameLower.includes('video') ||
                          selectedCatId === 'cat_reels'
                        ) {
                          selectedMode = 'roteiro';
                        } else if (
                          catNameLower.includes('carrossel') ||
                          selectedCatId === 'cat_carrossel'
                        ) {
                          selectedMode = 'carrossel';
                        } else if (
                          catNameLower.includes('stories') ||
                          selectedCatId === 'cat_stories'
                        ) {
                          selectedMode = 'none';
                        } else {
                          selectedMode = 'legenda';
                        }

                        updateDraft({
                          categoryId: selectedCatId,
                          copyMode: selectedMode,
                        });

                        if (selectedMode === 'roteiro') {
                          setSelectedCopyOption('roteiro');
                        } else if (selectedMode === 'carrossel') {
                          setSelectedCopyOption('carrossel');
                        } else if (selectedMode === 'legenda') {
                          setSelectedCopyOption('legenda');
                        }
                      }}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10"
                    >
                      {categories && categories.length > 0 ? (
                        categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="cat_reels">Reels / Vídeo</option>
                          <option value="cat_carrossel">Carrossel</option>
                          <option value="cat_post">Post Único / Legenda</option>
                          <option value="cat_stories">Stories / Geral</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Funil */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Funil
                    </label>
                    <select
                      id="task-funnel-select"
                      value={currentItem.funnelStage || 'topo'}
                      onChange={(e) => updateDraft({ funnelStage: e.target.value as FunnelStage })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10"
                    >
                      <option value="topo">Topo de Funil (Atração)</option>
                      <option value="meio">Meio de Funil (Nutrição)</option>
                      <option value="fundo">Fundo de Funil (Conversão)</option>
                      <option value="geral">Geral</option>
                    </select>
                  </div>

                  {/* Data de layout */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Data de layout
                    </label>
                    <input
                      id="task-art-date-input"
                      type="date"
                      value={currentItem.artDate ? currentItem.artDate.slice(0, 10) : ''}
                      onChange={(e) => updateDraft({ artDate: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10"
                    />
                  </div>

                  {/* Data de Publicação */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Data de Publicação
                    </label>
                    <input
                      id="task-post-date-input"
                      type="date"
                      value={currentItem.postDate ? currentItem.postDate.slice(0, 10) : ''}
                      onChange={(e) => updateDraft({ postDate: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Briefing Textarea & Anexos */}
              <div className="flex flex-col h-full space-y-4">
                <div className="flex flex-col flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                      Briefing & Direcionamento
                    </label>
                    <button
                      type="button"
                      onClick={() => briefingFileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      <span>Anexar ao briefing</span>
                    </button>
                  </div>
                  <textarea
                    id="task-briefing-textarea"
                    value={currentItem.briefingText || ''}
                    onChange={(e) => updateDraft({ briefingText: e.target.value })}
                    placeholder="Escreva a ideia central, objetivo, tópicos principais e direcionamento do post..."
                    className="w-full min-h-[200px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-xs sm:text-sm text-slate-900 dark:text-white resize-y outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 placeholder:text-slate-400"
                  />
                </div>

                {/* Briefing Attachments Section */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-slate-500" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Anexos do Briefing
                      </h4>
                      {currentItem.briefingFiles && currentItem.briefingFiles.length > 0 && (
                        <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-2 py-0.5 rounded-full">
                          {currentItem.briefingFiles.length}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => briefingFileInputRef.current?.click()}
                      disabled={isUploadingBriefingFiles}
                      className="inline-flex items-center gap-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white px-3 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>{isUploadingBriefingFiles ? 'Enviando...' : 'Adicionar Anexo'}</span>
                    </button>
                  </div>

                  {/* Hidden file input */}
                  <input
                    type="file"
                    multiple
                    ref={briefingFileInputRef}
                    onChange={(e) => handleBriefingFileUpload(e.target.files)}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.zip"
                  />

                  {/* Files list / empty state */}
                  {currentItem.briefingFiles && currentItem.briefingFiles.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                      {currentItem.briefingFiles.map((file) => (
                        <div
                          key={file.id}
                          className="group relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all"
                        >
                          {file.dataUrl ? (
                            <div
                              className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 cursor-pointer mb-2"
                              onClick={() => {
                                setSelectedMediaPreview(file.dataUrl || null);
                                setSelectedMediaFile(file);
                              }}
                            >
                              <img
                                src={file.dataUrl}
                                alt={file.name}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="h-5 w-5 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="aspect-video rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center mb-2">
                              <FileText className="h-8 w-8 text-slate-400" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate" title={file.name}>
                              {file.name}
                            </p>
                            {file.size && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {(file.size / 1024).toFixed(0)} KB
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-end gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                            <button
                              type="button"
                              onClick={() => downloadTaskFile(file)}
                              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                              title={`Baixar ${file.name}`}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveBriefingFile(file.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                              title="Remover anexo"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      onClick={() => briefingFileInputRef.current?.click()}
                      className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-center cursor-pointer hover:border-slate-400 dark:hover:border-slate-600 transition-colors"
                    >
                      <Paperclip className="h-5 w-5 text-slate-400 mx-auto mb-1.5" />
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Nenhum anexo no briefing
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Clique para anexar imagens de referência, PDFs, documentos ou arquivos de apoio.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: COPY (AI CHAT ESTILO CHATGPT / GEMINI) */}
          {currentStepKey === 'copy' && (
            <div id="step-copy-view" className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start animate-in fade-in duration-150">
              {/* Left Column: Preset Options (Headline, Legenda, Carrossel, Roteiro) */}
              <div className="md:col-span-4 lg:col-span-3 space-y-4">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  O que vamos escrever?
                </h4>

                <div className="space-y-2">
                  {[
                    { key: 'headline', label: 'Headline' },
                    { key: 'legenda', label: 'Legenda' },
                    { key: 'carrossel', label: 'Carrossel' },
                    { key: 'roteiro', label: 'Roteiro de Vídeo' },
                  ].map((opt) => {
                    const isSelected = selectedCopyOption === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        id={`copy-option-${opt.key}`}
                        onClick={() => setSelectedCopyOption(opt.key as any)}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {/* Escrever Button */}
                <button
                  type="button"
                  id="copy-action-escrever-btn"
                  disabled={!selectedCopyOption || isChatLoading}
                  onClick={() => {
                    if (selectedCopyOption) {
                      handleSendChatMessage(selectedCopyOption);
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#10b981] hover:bg-[#059669] shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isChatLoading ? (
                    <>
                      <Sparkles className="h-3.5 w-3.5 animate-spin" />
                      Escrevendo...
                    </>
                  ) : (
                    'Escrever'
                  )}
                </button>
              </div>

              {/* Right Column: Conversational AI Chat Interface */}
              <div className="md:col-span-8 lg:col-span-9 flex flex-col h-[500px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 p-4">
                {/* Chat Messages Stream */}
                <div
                  ref={chatScrollRef}
                  id="task-ai-chat-messages"
                  className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar flex flex-col"
                >
                  {(!currentItem.aiChatHistory || currentItem.aiChatHistory.length === 0) ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                      <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mb-3 shadow-xs">
                        <Sparkles className="h-6 w-6 text-emerald-500" />
                      </div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Copiloto de Conteúdo com IA
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-sm mt-1">
                        Selecione uma das opções à esquerda e clique em <b>"Escrever"</b> ou digite sua solicitação diretamente na caixa abaixo para iniciar.
                      </p>
                    </div>
                  ) : (
                    currentItem.aiChatHistory.map((msg, idx) => {
                      const isUser = msg.role === 'user';
                      return (
                        <div
                          key={msg.id || idx}
                          className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                              isUser
                                ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white rounded-br-xs'
                                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-xs shadow-xs'
                            }`}
                          >
                            <div className="whitespace-pre-wrap font-sans break-words">
                              {msg.content}
                            </div>

                            {/* Actions for Assistant Message: Copy & Refazer */}
                            {!isUser && (
                              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleCopyMessage(msg.content, idx)}
                                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  {copiedMessageIndex === idx ? (
                                    <>
                                      <Check className="h-3 w-3 text-emerald-500" />
                                      Copiado!
                                    </>
                                  ) : (
                                    <>
                                      <CopyIcon className="h-3 w-3" />
                                      Copiar
                                    </>
                                  )}
                                </button>
                                <span className="text-slate-300 dark:text-slate-700">•</span>
                                <button
                                  type="button"
                                  onClick={() => handleSendChatMessage(undefined, 'Refaça a última resposta com um tom ainda mais atrativo e dinâmico')}
                                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  Refazer
                                </button>
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 px-1 font-mono">
                            {formatDate(msg.timestamp || new Date().toISOString())}
                          </span>
                        </div>
                      );
                    })
                  )}

                  {/* Thinking Indicator */}
                  {isChatLoading && (
                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit">
                      <Sparkles className="h-4 w-4 text-emerald-500 animate-spin" />
                      <span className="text-xs text-slate-500 dark:text-slate-400 animate-pulse font-medium">
                        Gerando conteúdo inteligente...
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom Message Input Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendChatMessage();
                  }}
                  className="mt-3 flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2 shadow-xs focus-within:ring-2 focus-within:ring-slate-900/10 dark:focus-within:ring-white/10"
                >
                  <input
                    id="task-chat-text-input"
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Escreva uma mensagem..."
                    className="flex-1 bg-transparent border-none outline-none text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                  <button
                    type="submit"
                    id="task-chat-send-btn"
                    disabled={!chatInput.trim() || isChatLoading}
                    className="p-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* STEP 3: ARTE */}
          {currentStepKey === 'arte' && (
            <div id="step-arte-view" className="space-y-6 animate-in fade-in duration-150">
              {/* Drive / Figma / Canva link input */}
              <div>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 shadow-xs focus-within:ring-2 focus-within:ring-slate-900/10">
                  <Link2 className="h-4 w-4 text-slate-400 shrink-0" />
                  <input
                    id="task-drive-link-input"
                    type="text"
                    value={customLinkInput}
                    onChange={(e) => setCustomLinkInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddDriveLink();
                      }
                    }}
                    placeholder="Link do Drive, Figma, Canva..."
                    className="flex-1 bg-transparent border-none outline-none text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                  {customLinkInput.trim() && (
                    <button
                      type="button"
                      onClick={handleAddDriveLink}
                      className="px-3 py-1 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Salvar
                    </button>
                  )}
                </div>
              </div>

              {/* Upload Dropzone & Files Gallery */}
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                {/* Upload Trigger Dropzone */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                />

                <div
                  id="task-upload-dropzone"
                  onClick={() => !isUploadingFiles && fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!isUploadingFiles) {
                      handleFileUpload(e.dataTransfer.files);
                    }
                  }}
                  className={`w-48 h-48 sm:w-56 sm:h-56 shrink-0 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-500 dark:hover:border-slate-500 bg-slate-50/70 dark:bg-slate-900/40 flex flex-col items-center justify-center text-center p-4 cursor-pointer transition-all hover:scale-[1.01] ${
                    isUploadingFiles ? 'opacity-60 pointer-events-none' : ''
                  }`}
                >
                  {isUploadingFiles ? (
                    <>
                      <Sparkles className="h-7 w-7 text-emerald-500 mb-2 animate-spin" />
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                        Otimizando arquivos...
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5">
                        Salvando na tarefa
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-7 w-7 text-slate-400 mb-2" />
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                        Enviar Arquivos
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5">
                        Imagens ou vídeos
                      </span>
                    </>
                  )}
                </div>

                {/* Uploaded assets grid */}
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full">
                  {currentItem.files && currentItem.files.length > 0 ? (
                    currentItem.files.map((file) => (
                      <div
                        key={file.id}
                        className="group relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 aspect-square flex flex-col items-center justify-center shadow-xs hover:shadow-md transition-shadow"
                      >
                        {file.dataUrl ? (
                          <div
                            className="w-full h-full relative cursor-pointer"
                            onClick={() => {
                              setSelectedMediaPreview(file.dataUrl || null);
                              setSelectedMediaFile(file);
                            }}
                          >
                            <img
                              src={file.dataUrl}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                            {/* Gradient overlay with original filename */}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2 pt-5 pointer-events-none">
                              <p className="text-[11px] font-semibold text-white truncate text-left drop-shadow-xs" title={file.name}>
                                {file.name}
                              </p>
                            </div>
                          </div>
                        ) : file.url ? (
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex flex-col items-center justify-center p-3 text-center w-full h-full"
                          >
                            <ExternalLink className="h-6 w-6 text-slate-500 mb-1" />
                            <span className="text-[10px] text-slate-700 dark:text-slate-300 line-clamp-2 underline font-medium">
                              {file.name}
                            </span>
                          </a>
                        ) : (
                          <div className="p-3 text-center w-full h-full flex flex-col items-center justify-center">
                            <FileText className="h-6 w-6 text-slate-400 mx-auto mb-1" />
                            <span className="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-2 font-medium">
                              {file.name}
                            </span>
                          </div>
                        )}

                        {/* Action buttons (Download & Delete) */}
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          {/* Single-file Download button (original uncompressed quality) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadTaskFile(file);
                            }}
                            className="p-1.5 rounded-full bg-black/70 hover:bg-emerald-600 text-white shadow-md transition-colors cursor-pointer"
                            title={`Baixar ${file.name} (qualidade original)`}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>

                          {/* Remove File Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFile(file.id);
                            }}
                            className="p-1.5 rounded-full bg-black/70 hover:bg-rose-600 text-white shadow-md transition-colors cursor-pointer"
                            title="Remover arquivo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full h-48 sm:h-56 flex flex-col items-center justify-center text-center p-6 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
                      <ImageIcon className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
                      <p className="text-xs text-slate-400 font-medium">
                        Nenhum arquivo enviado ainda. Arraste ou selecione imagens/vídeos.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: CONFERÊNCIA */}
          {currentStepKey === 'conferencia' && (
            <div id="step-conferencia-view" className="space-y-6 animate-in fade-in duration-150">
              {/* Top 2 columns: Headline/Legenda on Left, Carrossel/Roteiro on Right */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Headline
                    </label>
                    <input
                      id="conf-headline-input"
                      type="text"
                      value={currentItem.selectedHeadline || ''}
                      onChange={(e) => updateDraft({ selectedHeadline: e.target.value })}
                      placeholder="Título ou gancho principal da publicação..."
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Legenda
                    </label>
                    <textarea
                      id="conf-caption-textarea"
                      value={currentItem.caption || ''}
                      onChange={(e) => updateDraft({ caption: e.target.value })}
                      placeholder="Legenda completa do post..."
                      className="w-full h-44 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5 text-xs sm:text-sm text-slate-900 dark:text-white resize-none outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Right Column: Carrossel, Roteiro ou observações */}
                <div className="flex flex-col h-full">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                    Carrossel, Roteiro ou observações
                  </label>
                  <textarea
                    id="conf-script-textarea"
                    value={currentItem.scriptText || ''}
                    onChange={(e) => updateDraft({ scriptText: e.target.value })}
                    placeholder="Conteúdo das lâminas do carrossel, roteiro de vídeo ou observações para o cliente..."
                    className="w-full flex-1 min-h-[245px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5 text-xs sm:text-sm text-slate-900 dark:text-white resize-none outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Bottom: Criativos Row */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                  Criativos
                </label>
                <div className="flex flex-wrap gap-3">
                  {currentItem.files && currentItem.files.length > 0 ? (
                    currentItem.files.map((file) => (
                      <div
                        key={file.id}
                        onClick={() => {
                          if (file.dataUrl) {
                            setSelectedMediaPreview(file.dataUrl);
                            setSelectedMediaFile(file);
                          }
                        }}
                        className="group w-28 h-36 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 relative cursor-pointer hover:opacity-95 transition-all shadow-xs"
                      >
                        {file.dataUrl ? (
                          <>
                            <img
                              src={file.dataUrl}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                            {/* Filename overlay */}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-1.5 pt-4">
                              <span className="text-[9px] font-semibold text-white truncate block text-center" title={file.name}>
                                {file.name}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-slate-400">
                            <ImageIcon className="h-6 w-6 mb-1" />
                            <span className="text-[10px] line-clamp-2 font-medium">{file.name}</span>
                          </div>
                        )}

                        {/* Direct Download Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadTaskFile(file);
                          }}
                          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 hover:bg-emerald-600 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                          title={`Baixar ${file.name}`}
                        >
                          <Download className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="w-28 h-36 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-400">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: EM APROVAÇÃO */}
          {currentStepKey === 'em_aprovacao' && (
            <div id="step-em-aprovacao-view" className="space-y-6 animate-in fade-in duration-150">
              {/* Top Status Card */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-500">
                    <Eye className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      Aguardando Aprovação
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Disponível no Portal do Cliente ({selectedClient?.company || selectedClient?.name}).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="task-approve-action-btn"
                  onClick={handleApprove}
                  className="bg-[#10b981] hover:bg-[#059669] text-white font-bold py-2 px-5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  Aprovar
                </button>
              </div>

              {/* Feedbacks & History Container */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-xs">
                <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Histórico & Feedbacks
                </h5>

                {/* Activity Feed */}
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                  {task.activity && task.activity.length > 0 ? (
                    task.activity.map((act, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-3 flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {act.by}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {formatDate(act.ts)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                          {act.text}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400">
                      Nenhum feedback ou observação registrada ainda.
                    </div>
                  )}
                </div>

                {/* Add observation row */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <input
                    id="task-observation-input"
                    type="text"
                    value={observationInput}
                    onChange={(e) => setObservationInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddObservation();
                      }
                    }}
                    placeholder="Adicionar observação..."
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    id="task-register-obs-btn"
                    onClick={handleAddObservation}
                    disabled={!observationInput.trim()}
                    className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold px-5 py-2.5 rounded-xl text-xs hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                  >
                    Registrar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: APROVADO */}
          {currentStepKey === 'aprovado' && (
            <div id="step-aprovado-view" className="space-y-6 animate-in fade-in duration-150">
              {/* Top Status Card */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      Conteúdo Aprovado
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                      Pronto para publicação no {task.channel || 'instagram'}.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="task-open-portal-btn"
                  onClick={() => {
                    if (onOpenClientPortal && task.clientId) {
                      onClose();
                      onOpenClientPortal(task.clientId);
                    }
                  }}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Portal
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ================= STEPPER FOOTER (ALL STEPS) ================= */}
        <div
          id="task-workflow-modal-footer"
          className="border-t border-slate-200 dark:border-slate-800 px-6 sm:px-8 md:px-10 py-5 bg-white dark:bg-slate-900 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          {/* Left: Anterior button */}
          <button
            type="button"
            id="task-stepper-prev-btn"
            disabled={currentStepIndex === 0}
            onClick={handlePrevStep}
            className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>

          {/* Center: Stepper track */}
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto py-1">
            {WORKFLOW_STEPS.map((s, idx) => {
              const isActive = s.key === currentStepKey;
              const isPast = idx < currentStepIndex;
              const isDone = isPast || isActive;

              return (
                <div key={s.key} className="flex items-center">
                  <div
                    onClick={() => goToStep(s.key)}
                    className="flex flex-col items-center gap-1.5 cursor-pointer group"
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                        isDone
                          ? 'bg-[#10b981] scale-110 shadow-xs'
                          : 'bg-slate-200 dark:bg-slate-700 group-hover:bg-slate-300'
                      }`}
                    />
                    <span
                      className={`text-[11px] font-semibold transition-colors ${
                        isActive
                          ? 'text-slate-900 dark:text-white font-bold'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>

                  {idx < WORKFLOW_STEPS.length - 1 && (
                    <div
                      className={`h-0.5 w-6 sm:w-10 mx-1 sm:mx-2 -mt-4 transition-colors ${
                        idx < currentStepIndex
                          ? 'bg-[#10b981]'
                          : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Right: Step Action Button + Save Button */}
          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <button
                type="button"
                id="task-footer-save-btn"
                onClick={handleSaveTask}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer animate-pulse"
              >
                <Check className="h-3.5 w-3.5" />
                Salvar alterações
              </button>
            )}

            {currentStepKey === 'conferencia' ? (
              <button
                type="button"
                id="task-send-to-approval-btn"
                onClick={() => {
                  if (hasUnsavedChanges) {
                    handleSaveTask();
                  }
                  setTaskWorkflowStep(task.id, 'em_aprovacao');
                  setTaskStatus(task.id, 'em_aprovacao');
                }}
                className="bg-[#10b981] hover:bg-[#059669] text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-sm transition-all cursor-pointer"
              >
                Enviar para aprovação
              </button>
            ) : currentStepKey === 'aprovado' ? (
              <button
                type="button"
                id="task-finalize-btn"
                onClick={() => {
                  if (hasUnsavedChanges) {
                    handleSaveTask();
                  }
                  onClose();
                }}
                className="bg-[#10b981] hover:bg-[#059669] text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-sm transition-all cursor-pointer"
              >
                Finalizar
              </button>
            ) : (
              <button
                type="button"
                id="task-stepper-next-btn"
                onClick={() => {
                  if (hasUnsavedChanges) {
                    handleSaveTask();
                  }
                  handleNextStep();
                }}
                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold px-5 py-2.5 rounded-xl text-xs shadow-sm hover:opacity-90 transition-all flex items-center gap-1 cursor-pointer"
              >
                Próximo
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Media Preview Modal */}
        {selectedMediaPreview && (
          <div
            className="fixed inset-0 z-60 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => {
              setSelectedMediaPreview(null);
              setSelectedMediaFile(null);
            }}
          >
            {/* Header bar with filename and download option */}
            <div
              className="w-full max-w-4xl flex items-center justify-between gap-3 mb-3 px-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-semibold text-white/90 truncate bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl">
                  {selectedMediaFile?.name || 'Arquivo'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {selectedMediaFile && (
                  <button
                    type="button"
                    onClick={() => downloadTaskFile(selectedMediaFile)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg cursor-pointer"
                    title={`Baixar ${selectedMediaFile.name} em resolução original`}
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Baixar Original</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedMediaPreview(null);
                    setSelectedMediaFile(null);
                  }}
                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div
              className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-2xl flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedMediaPreview}
                alt={selectedMediaFile?.name || 'Preview'}
                className="w-auto h-auto max-w-full max-h-[80vh] object-contain rounded-xl"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
