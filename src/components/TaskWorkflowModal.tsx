import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  Copy,
  Trash2,
  Calendar,
  Link2,
  Upload,
  ExternalLink,
  Eye,
  Check,
  X,
  ChevronRight,
  Download,
  Maximize2,
  RefreshCw,
} from 'lucide-react';
import { useAppStore } from '../store';
import { uploadTaskFileToCloud, loadTaskFileDataUrl, reenviarArte } from '../services/taskFileCloudSync';
import { enviarArteParaStorage } from '../services/storageArtes';
import { esquecerArte } from '../hooks/useTaskFileSrc';
import { impedirRecarga } from '../lib/atualizacao';
import { ArteDaTarefa, ehArteExibivel } from './ArteDaTarefa';
import { Task, TaskFile, FunnelStage } from '../types';

interface TaskWorkflowModalProps {
  taskId: string;
  onClose: () => void;
  onOpenClientPortal?: (clientId: string) => void;
}

export const TaskWorkflowModal: React.FC<TaskWorkflowModalProps> = ({
  taskId,
  onClose,
  onOpenClientPortal,
}) => {
  const {
    tasks,
    clients,
    categories,
    statuses,
    users,
    currentUser,
    updateTask,
    deleteTask,
    duplicateTask,
    startTimer,
    stopTimer,
    addTaskFiles,
    removeTaskFile,
    setTaskLiveEditing,
    clearTaskLiveEditing,
  } = useAppStore();

  const task = tasks.find((t) => t.id === taskId);

  // Local draft state for smooth editing and auto-save
  const [title, setTitle] = useState(task?.title || 'Nova tarefa');

  /**
   * Mantém a altura do título colada ao conteúdo: uma linha quando cabe,
   * duas ou três quando o headline é longo.
   */
  const titleRef = React.useRef<HTMLTextAreaElement>(null);
  React.useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);
  const [clientId, setClientId] = useState(task?.clientId || '');
  const [status, setStatus] = useState(task?.status || 'nao_iniciado');
  const [categoryId, setCategoryId] = useState(task?.categoryId || '');
  const [funnelStage, setFunnelStage] = useState<FunnelStage | ''>(task?.funnelStage || '');
  const [postDate, setPostDate] = useState(task?.postDate || '');
  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    task?.assigneeIds && task?.assigneeIds.length > 0
      ? task.assigneeIds
      : task?.assigneeId
      ? [task.assigneeId]
      : []
  );
  const [briefingText, setBriefingText] = useState(task?.briefingText || '');
  const [caption, setCaption] = useState(task?.caption || '');
  const [driveLink, setDriveLink] = useState(task?.driveLink || '');
  const [files, setFiles] = useState<TaskFile[]>(task?.files || []);

  // UI helpers
  const [hasAlteredAfterApproval, setHasAlteredAfterApproval] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);
  const [previewMediaName, setPreviewMediaName] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Artes que não chegaram inteiras na nuvem e não existem neste navegador. */
  const [artesFaltando, setArtesFaltando] = useState<Set<string>>(new Set());
  const reenvioInputRef = useRef<HTMLInputElement>(null);
  const [reenviandoId, setReenviandoId] = useState<string | null>(null);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef({
    title,
    clientId,
    status,
    categoryId,
    funnelStage,
    postDate,
    assigneeIds,
    briefingText,
    caption,
    driveLink,
    files,
  });

  // Keep draftRef updated
  draftRef.current = {
    title,
    clientId,
    status,
    categoryId,
    funnelStage,
    postDate,
    assigneeIds,
    briefingText,
    caption,
    driveLink,
    files,
  };

  // Sync with incoming task updates from cloud / other users
  useEffect(() => {
    if (!task) return;
    setTitle((prev) => (prev !== task.title ? task.title : prev));
    setClientId((prev) => (prev !== task.clientId ? task.clientId : prev));
    setStatus((prev) => (prev !== task.status ? task.status : prev));
    setCategoryId((prev) => (prev !== task.categoryId ? task.categoryId : prev));
    setFunnelStage((prev) => (prev !== (task.funnelStage || '') ? (task.funnelStage || '') : prev));
    setPostDate((prev) => (prev !== (task.postDate || '') ? (task.postDate || '') : prev));
    const nextAssignees =
      task.assigneeIds && task.assigneeIds.length > 0
        ? task.assigneeIds
        : task.assigneeId
        ? [task.assigneeId]
        : [];
    setAssigneeIds(nextAssignees);
    setBriefingText((prev) => (prev !== (task.briefingText || '') ? (task.briefingText || '') : prev));
    setCaption((prev) => (prev !== (task.caption || '') ? (task.caption || '') : prev));
    setDriveLink((prev) => (prev !== (task.driveLink || '') ? (task.driveLink || '') : prev));
    setFiles(task.files || []);
  }, [task?.id]);

  // Com a tarefa aberta o app não recarrega sozinho para atualizar de versão.
  useEffect(() => impedirRecarga(), []);

  // Tarefa excluída (por um colega, ou em outra aba) com o modal montado:
  // fecha. Sem isso o modal ficava montado sem nada na tela, segurando a trava
  // acima para sempre. A folga cobre o instante em que um snapshot da nuvem
  // anterior à criação chega depois dela e a tarefa nova some e volta.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const tarefaSumiu = !task;
  useEffect(() => {
    if (!tarefaSumiu) return;
    const relogio = window.setTimeout(() => onCloseRef.current(), 1500);
    return () => window.clearTimeout(relogio);
  }, [tarefaSumiu]);

  // Live editing presence lock
  useEffect(() => {
    if (!task) return;
    const me = currentUser();
    if (me) {
      setTaskLiveEditing(task.id, {
        id: me.id,
        name: me.name,
        color: me.color || '#f59e0b',
      });
    }
    return () => {
      clearTaskLiveEditing(task.id);
    };
  }, [task?.id]);

  // Close assignee dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        assigneeDropdownRef.current &&
        !assigneeDropdownRef.current.contains(e.target as Node)
      ) {
        setIsAssigneeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /** Houve edição desde que o modal abriu (ou desde o último salvar). */
  const alterouRef = useRef(false);

  // Flush save on unmount / close
  const flushSave = useCallback(() => {
    if (!task) return;
    // Abrir e fechar sem mexer em nada não grava: cada gravação chega a todos
    // os usuários conectados e conta na cota diária do Firestore.
    if (!alterouRef.current) return;
    alterouRef.current = false;
    const current = draftRef.current;
    updateTask(task.id, {
      title: current.title,
      clientId: current.clientId,
      status: current.status as any,
      categoryId: current.categoryId,
      funnelStage: (current.funnelStage || undefined) as any,
      postDate: current.postDate,
      assigneeId: current.assigneeIds[0] || '',
      assigneeIds: current.assigneeIds,
      briefingText: current.briefingText,
      caption: current.caption,
      driveLink: current.driveLink,
      files: current.files,
      updatedAt: new Date().toISOString(),
    });
  }, [task?.id, updateTask]);

  // A mudança aparece na hora nesta tela e na lista; a nuvem recebe quando a
  // pessoa para de digitar ou fecha o modal (ver agendarEnvioDaTarefa).
  const handleFieldChange = (field: string, value: any) => {
    setHasAlteredAfterApproval(true);
    if (!task) return;
    alterouRef.current = true;
    updateTask(task.id, { [field]: value }, { adiarNuvem: true });
  };

  // Safe close that flushes changes
  const handleCloseModal = useCallback(() => {
    flushSave();
    onClose();
  }, [flushSave, onClose]);

  // Step-by-step Escape key listener
  // 1st Escape closes preview or delete confirmation or dropdown
  // 2nd Escape closes the whole task modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewMediaUrl) {
          e.stopPropagation();
          e.stopImmediatePropagation?.();
          e.preventDefault();
          setPreviewMediaUrl(null);
          setPreviewMediaName('');
          return;
        }
        if (showDeleteConfirm) {
          e.stopPropagation();
          e.stopImmediatePropagation?.();
          e.preventDefault();
          setShowDeleteConfirm(false);
          return;
        }
        if (isAssigneeDropdownOpen) {
          e.stopPropagation();
          e.stopImmediatePropagation?.();
          e.preventDefault();
          setIsAssigneeDropdownOpen(false);
          return;
        }
        // No inner modal is open: close task modal
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        e.preventDefault();
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [previewMediaUrl, showDeleteConfirm, isAssigneeDropdownOpen, handleCloseModal]);

  // Download single file helper
  const downloadSingleFile = async (file: { id?: string; name: string; url?: string; dataUrl?: string; type?: string; size?: number }) => {
    // A cópia da memória pode ter sumido; a arte segue no IndexedDB e na nuvem.
    const recuperada =
      file.id && !(file.dataUrl || '').startsWith('data:')
        ? await loadTaskFileDataUrl(file as any, task?.id)
        : null;
    const fileUrl = recuperada || file.dataUrl || file.url;
    if (!fileUrl) return;
    const filename = file.name || 'arte';
    const link = document.createElement('a');
    link.download = filename;

    if (fileUrl.startsWith('data:') || fileUrl.startsWith('blob:')) {
      link.href = fileUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      fetch(fileUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const blobUrl = URL.createObjectURL(blob);
          link.href = blobUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        })
        .catch(() => {
          link.href = fileUrl;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
    }
  };

  const abrirPreview = async (file: any) => {
    setPreviewMediaName(file.name);
    const url =
      (file.dataUrl || '').startsWith('data:')
        ? file.dataUrl
        : (await loadTaskFileDataUrl(file, task?.id)) || file.url || null;
    setPreviewMediaUrl(url);
  };

  // Download all files individually without zipping
  const handleDownloadAllFiles = () => {
    if (!files || files.length === 0) return;
    const downloadableFiles = files.filter((f) => f.id || f.url);
    if (downloadableFiles.length === 0) return;

    downloadableFiles.forEach((file, index) => {
      setTimeout(() => {
        downloadSingleFile(file);
      }, index * 250);
    });
  };

  // Timer live counter
  const [timerSeconds, setTimerSeconds] = useState(0);
  const isTimerActive = Boolean(task?.timerStartedAt);

  useEffect(() => {
    if (!task) return;
    const calculateSeconds = () => {
      let total = task.timeSpent || 0;
      if (task.timerStartedAt) {
        total += Math.max(0, Math.floor((Date.now() - task.timerStartedAt) / 1000));
      }
      return total;
    };
    setTimerSeconds(calculateSeconds());

    if (!isTimerActive) return;
    const interval = setInterval(() => {
      setTimerSeconds(calculateSeconds());
    }, 1000);
    return () => clearInterval(interval);
  }, [task?.timeSpent, task?.timerStartedAt, isTimerActive]);

  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (h > 0) {
      return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }
    return `${pad(m)}:${pad(s)}`;
  };

  const handleToggleTimer = () => {
    if (!task) return;
    if (isTimerActive) {
      stopTimer(task.id);
    } else {
      startTimer(task.id);
    }
  };

  // Duplicate task
  const handleDuplicate = () => {
    if (!task) return;
    flushSave();
    const dup = duplicateTask(task.id);
    if (dup) {
      handleCloseModal();
    }
  };

  // Delete task handlers
  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (!task) return;
    deleteTask(task.id);
    setShowDeleteConfirm(false);
    onClose();
  };

  // Enviar para aprovação
  const handleSendForApproval = () => {
    if (!task) return;
    setStatus('em_aprovacao');
    setHasAlteredAfterApproval(false);
    updateTask(task.id, {
      status: 'em_aprovacao',
      currentStep: 'em_aprovacao',
      updatedAt: new Date().toISOString(),
      activity: [
        ...task.activity,
        {
          ts: new Date().toISOString(),
          type: 'status_change',
          by: currentUser()?.name || 'Equipe',
          text: 'Enviou a tarefa para aprovação do cliente',
        },
      ],
    });
  };

  // Copy caption
  const handleCopyCaption = () => {
    if (!caption) return;
    navigator.clipboard.writeText(caption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  /**
   * O que o cliente pediu na última recusa.
   *
   * O texto já era gravado na atividade da tarefa e aparecia só no portal: aqui
   * dentro via-se "alterar" sem dizer o quê. Some assim que uma nova versão é
   * enviada — aí o pedido já foi respondido.
   */
  const pedidoDoCliente = React.useMemo(() => {
    const atividade = task?.activity || [];
    const pedido = [...atividade].reverse().find((a) => a.type === 'client_change');
    if (!pedido) return null;
    const reenvio = [...atividade].reverse().find((a) => a.type === 'resubmit');
    if (reenvio && (reenvio.ts || '') > (pedido.ts || '')) return null;
    return pedido;
  }, [task?.activity]);

  /**
   * A arte chegou ao Storage: guarda o endereço na tarefa.
   *
   * A partir daqui a arte existe para todo mundo — a gravação leva só o link,
   * não a imagem, então chega na hora para quem está com a tarefa aberta.
   */
  const aplicarEnderecoDaArte = (fileId: string, url: string, storagePath: string) => {
    if (!task) return;
    setFiles((atuais) => {
      const proximos = atuais.map((f) => (f.id === fileId ? { ...f, url, storagePath } : f));
      // Fora do fluxo de renderização: alterar a store aqui dentro avisaria o
      // React no meio da atualização do estado deste componente.
      queueMicrotask(() => updateTask(task.id, { files: proximos }));
      return proximos;
    });
  };

  // File Upload (Preserves 100% original uncompressed quality)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !task) return;
    setIsUploading(true);

    const newFiles: TaskFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      try {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string) || '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });

        const newFileItem: TaskFile = {
          id: 'file-' + Date.now() + '-' + i + '-' + Math.random().toString(36).substring(2, 7),
          name: file.name,
          type: file.type || 'image/jpeg',
          size: file.size,
          dataUrl,
          uploadedAt: new Date().toISOString(),
        };
        newFiles.push(newFileItem);

        // A arte sobe inteira para o Storage e, quando chega, o endereço dela
        // entra na tarefa — é isso que os colegas recebem, na hora.
        enviarArteParaStorage(task.id, newFileItem, file)
          .then(({ url, storagePath }) => aplicarEnderecoDaArte(newFileItem.id, url, storagePath))
          .catch((err) => {
            console.warn('Envio da arte para o Storage:', err);
            // Sem Storage, o caminho antigo ainda guarda a arte.
            uploadTaskFileToCloud(task.id, newFileItem).catch(() => {});
          });
      } catch (err) {
        console.error('Error reading file:', err);
      }
    }

    if (newFiles.length > 0) {
      const nextFiles = [...files, ...newFiles];
      setFiles(nextFiles);
      addTaskFiles(task.id, newFiles);
      setHasAlteredAfterApproval(true);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsUploading(false);
  };

  /**
   * Enviar de novo uma arte que não chegou, no mesmo lugar. Mantém o id: a
   * ordem do carrossel, o preview do cliente e quem estiver com a tarefa
   * aberta recebem a arte nova sem ninguém excluir e adicionar.
   */
  const handleReenviarArte = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const escolhido = e.target.files?.[0];
    const alvo = files.find((f) => f.id === reenviandoId);
    if (reenvioInputRef.current) reenvioInputRef.current.value = '';
    if (!escolhido || !alvo || !task) return;

    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(escolhido);
    });
    if (!dataUrl) return;

    const nova: TaskFile = {
      ...alvo,
      name: escolhido.name,
      type: escolhido.type || alvo.type,
      size: escolhido.size,
      dataUrl,
      uploadedAt: new Date().toISOString(),
    };
    enviarArteParaStorage(task.id, nova, escolhido)
      .then(({ url, storagePath }) => aplicarEnderecoDaArte(nova.id, url, storagePath))
      .catch((err) => {
        console.warn('Reenvio da arte para o Storage:', err);
        reenviarArte(task.id, nova).catch(() => {});
      });
    esquecerArte(alvo.id);
    const nextFiles = files.map((f) => (f.id === alvo.id ? nova : f));
    setFiles(nextFiles);
    updateTask(task.id, { files: nextFiles });
    setArtesFaltando((atual) => {
      const proximo = new Set(atual);
      proximo.delete(alvo.id);
      return proximo;
    });
    setReenviandoId(null);
  };

  const handleRemoveFile = (fileId: string) => {
    if (!task) return;
    const nextFiles = files.filter((f) => f.id !== fileId);
    setFiles(nextFiles);
    removeTaskFile(task.id, fileId);
    setHasAlteredAfterApproval(true);
  };

  if (!task) return null;

  const currentClient = clients.find((c) => c.id === clientId);
  const clientCompany = currentClient?.company || currentClient?.name;

  // Selected assignees objects
  const selectedUsers = users.filter((u) => assigneeIds.includes(u.id));

  // Determine whether to show "Aguardando Aprovação" badge or "Enviar para aprovação" button
  const isAwaitingApproval = status === 'em_aprovacao' && !hasAlteredAfterApproval;

  return (
    <div
      id="task-modal-backdrop"
      onClick={handleCloseModal}
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6 bg-slate-950/55 overflow-y-auto"
    >
      {/* Modal Container */}
      <div
        id="task-modal-card"
        onClick={(e) => e.stopPropagation()}
        data-surface="app"
        className="relative w-full max-w-7xl bg-white dark:bg-[#0f1114] sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col my-auto h-fit max-h-[96vh] overflow-hidden"
      >
        {/* TOP BAR / HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-7 h-16 border-b border-slate-200 dark:border-slate-800 shrink-0">
          {/* Left Actions */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Iniciar / Pausar Tempo Button */}
            <button
              id="btn-task-timer-toggle"
              type="button"
              onClick={handleToggleTimer}
              className={`h-8 px-3 rounded-lg t-ui font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                isTimerActive
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                  : 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {isTimerActive ? (
                <>
                  <Pause className="h-3.5 w-3.5 fill-current" />
                  <span>Pausar tempo</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Iniciar tempo</span>
                </>
              )}
            </button>

            {/* Tempo Display Badge */}
            <div
              id="badge-task-time-spent"
              className="t-meta text-slate-500 dark:text-slate-400 tabular-nums select-none"
            >
              <span>{formatTimer(timerSeconds)}</span>
            </div>

            {/* Duplicar Button */}
            <button
              id="btn-task-duplicate"
              type="button"
              onClick={handleDuplicate}
              className="h-8 px-3 rounded-lg t-ui text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Criar uma cópia desta tarefa"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Duplicar</span>
            </button>

            {/* Excluir Button */}
            <button
              id="btn-task-delete"
              type="button"
              onClick={handleDeleteClick}
              className="h-8 px-3 rounded-lg t-ui text-slate-600 dark:text-slate-300 hover:text-rose-700 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-950/40 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Mover para a lixeira"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Excluir</span>
            </button>

            {/* Status / Enviar para aprovação button OU Aguardando Aprovação card */}
            {isAwaitingApproval ? (
              <div
                id="badge-awaiting-approval"
                className="flex items-center gap-2 t-ui text-sky-700 dark:text-sky-400"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" aria-hidden="true" />
                <span className="font-medium">Aguardando aprovação</span>
                <span className="t-meta text-slate-500 dark:text-slate-400">
                  no portal{clientCompany ? ` de ${clientCompany}` : ''}
                </span>
              </div>
            ) : (
              <button
                id="btn-send-for-approval"
                type="button"
                onClick={handleSendForApproval}
                className="h-8 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 t-ui font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                title="Submeter para aprovação no portal do cliente"
              >
                <span>Enviar para aprovação</span>
              </button>
            )}
          </div>

          {/* Right Action: Salvar e fechar */}
          <div className="flex items-center gap-3">
            <button
              id="btn-save-and-close"
              type="button"
              onClick={handleCloseModal}
              className="h-9 px-4 rounded-lg bg-slate-950 dark:bg-white text-white dark:text-slate-950 t-ui font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Salvar e fechar
            </button>
          </div>
        </div>

        {/* MODAL BODY (Scrollable with generous breathing space) */}
        <div className="min-h-0 overflow-y-auto px-5 sm:px-7 pt-6 pb-7 space-y-6">
          {/* Título. Textarea e não input: título longo precisa quebrar linha em
              vez de rolar na horizontal, e a altura acompanha o texto. */}
          <div className="w-full">
            <textarea
              id="input-task-title"
              ref={titleRef}
              rows={1}
              value={title}
              onChange={(e) => {
                const val = e.target.value;
                setTitle(val);
                handleFieldChange('title', val);
              }}
              onKeyDown={(e) => {
                // Enter confirma; quebra de linha real não faz sentido num título.
                if (e.key === 'Enter') {
                  e.preventDefault();
                  (e.target as HTMLTextAreaElement).blur();
                }
              }}
              placeholder="Nova tarefa"
              className="font-display text-[26px] sm:text-[30px] font-semibold tracking-[-0.02em] leading-tight text-slate-950 dark:text-white bg-transparent border-none outline-none w-full resize-none overflow-hidden placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:ring-0"
            />
          </div>

          {/* 3-COLUMN SPACIOUS GRID LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* COLUMN 1: METADATA & BRIEFING (Span 4) */}
            <div className="lg:col-span-4 flex flex-col gap-5">
              {/* Selectors 2-Column Subgrid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Cliente */}
                <div>
                  <label
                    htmlFor="select-task-client"
                    className="block t-label text-slate-500 mb-1.5"
                  >
                    Cliente
                  </label>
                  <select
                    id="select-task-client"
                    value={clientId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setClientId(val);
                      handleFieldChange('clientId', val);
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent t-ui text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors cursor-pointer"
                  >
                    <option value="">Selecione o cliente</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company || c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label
                    htmlFor="select-task-status"
                    className="block t-label text-slate-500 mb-1.5"
                  >
                    Status
                  </label>
                  <select
                    id="select-task-status"
                    value={status}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setStatus(val);
                      handleFieldChange('status', val);
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent t-ui text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors cursor-pointer"
                  >
                    {statuses.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Responsáveis */}
                <div className="relative" ref={assigneeDropdownRef}>
                  <label className="block t-label text-slate-500 mb-1.5">
                    Responsáveis
                  </label>
                  <button
                    id="btn-assignee-dropdown-toggle"
                    type="button"
                    onClick={() => setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent t-ui text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors flex items-center justify-between gap-1.5 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {selectedUsers.length > 0 ? (
                        <>
                          <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                            {selectedUsers[0].name.charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate text-xs font-semibold">
                            {selectedUsers.length === 1
                              ? selectedUsers[0].name
                              : `${selectedUsers[0].name} +${selectedUsers.length - 1}`}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400 text-xs font-normal">Selecionar...</span>
                      )}
                    </div>
                    <ChevronRight
                      className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${
                        isAssigneeDropdownOpen ? 'rotate-90' : ''
                      }`}
                    />
                  </button>

                  {/* Assignee Selection Popover */}
                  {isAssigneeDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1.5 w-64 bg-white dark:bg-[#15181c] rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-1.5 z-50">
                      <div className="t-label text-slate-500 px-2 py-1.5">
                        Membros da equipe
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1 mt-1">
                        {/* A lista de usuários também guarda os logins de portal
                            dos clientes — é assim que eles entram. Pauta se atribui
                            a quem produz, então só a equipe aparece aqui. */}
                        {users.filter((u) => u.role !== 'cliente').map((u) => {
                          const isSelected = assigneeIds.includes(u.id);
                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                let next: string[];
                                if (isSelected) {
                                  next = assigneeIds.filter((id) => id !== u.id);
                                } else {
                                  next = [...assigneeIds, u.id];
                                }
                                setAssigneeIds(next);
                                handleFieldChange('assigneeIds', next);
                                handleFieldChange('assigneeId', next[0] || '');
                              }}
                              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 t-ui text-slate-900 dark:text-white cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <div
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                                  style={{ backgroundColor: u.color || '#f59e0b' }}
                                >
                                  {u.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="truncate">{u.name}</span>
                              </div>
                              {isSelected && <Check className="h-4 w-4 text-emerald-500 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Data de Publicação */}
                <div>
                  <label
                    htmlFor="input-task-postdate"
                    className="block t-label text-slate-500 mb-1.5"
                  >
                    Data de Publicação
                  </label>
                  <div className="relative">
                    <input
                      id="input-task-postdate"
                      type="date"
                      value={postDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPostDate(val);
                        handleFieldChange('postDate', val);
                      }}
                      className="w-full h-10 px-3 pr-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent t-ui text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors cursor-pointer"
                    />
                    <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Formato */}
                <div>
                  <label
                    htmlFor="select-task-category"
                    className="block t-label text-slate-500 mb-1.5"
                  >
                    Formato
                  </label>
                  <select
                    id="select-task-category"
                    value={categoryId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCategoryId(val);
                      handleFieldChange('categoryId', val);
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent t-ui text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors cursor-pointer"
                  >
                    <option value="">Selecione o formato</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Funil */}
                <div>
                  <label
                    htmlFor="select-task-funnel"
                    className="block t-label text-slate-500 mb-1.5"
                  >
                    Funil
                  </label>
                  <select
                    id="select-task-funnel"
                    value={funnelStage}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setFunnelStage(val);
                      handleFieldChange('funnelStage', val);
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent t-ui text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors cursor-pointer"
                  >
                    <option value="">Selecione o funil</option>
                    <option value="topo">Topo de Funil (Atração)</option>
                    <option value="meio">Meio de Funil (Nutrição)</option>
                    <option value="fundo">Fundo de Funil (Conversão)</option>
                    <option value="geral">Geral</option>
                  </select>
                </div>
              </div>

              {pedidoDoCliente && (
                <div className="rounded-lg border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 p-3.5">
                  <p className="t-label text-amber-800 dark:text-amber-300">
                    O cliente pediu alteração
                  </p>
                  <p className="t-body text-slate-800 dark:text-slate-100 mt-1.5 leading-relaxed whitespace-pre-wrap">
                    {pedidoDoCliente.text}
                  </p>
                  <p className="t-meta text-slate-500 dark:text-slate-400 mt-1.5">
                    {pedidoDoCliente.by}
                    {pedidoDoCliente.ts
                      ? ` · ${new Date(pedidoDoCliente.ts).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`
                      : ''}
                  </p>
                </div>
              )}

              {/* Briefing & Direcionamento Box (Stretches to fill height) */}
              <div className="flex-1 flex flex-col">
                <label
                  htmlFor="textarea-task-briefing"
                  className="block t-label text-slate-500 mb-2"
                >
                  Briefing & Direcionamento
                </label>
                <div className="rounded-lg border border-slate-300 dark:border-slate-700 p-3.5 focus-within:border-slate-900 dark:focus-within:border-white transition-colors flex-1 flex flex-col min-h-[180px]">
                  <textarea
                    id="textarea-task-briefing"
                    value={briefingText}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBriefingText(val);
                      handleFieldChange('briefingText', val);
                    }}
                    placeholder="Instruções, referências, direcionamento do cliente..."
                    className="w-full flex-1 min-h-[150px] bg-transparent border-none outline-none resize-none t-body text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* COLUMN 2: LEGENDA (Span 5 - Perfectly aligned with Column 1) */}
            <div className="lg:col-span-5 flex flex-col h-full">
              <label
                htmlFor="textarea-task-caption"
                className="block t-label text-slate-500 mb-2"
              >
                Legenda
              </label>
              <div className="rounded-lg border border-slate-300 dark:border-slate-700 p-3.5 sm:p-4 focus-within:border-slate-900 dark:focus-within:border-white transition-colors flex-1 flex flex-col min-h-[280px]">
                <textarea
                  id="textarea-task-caption"
                  value={caption}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCaption(val);
                    handleFieldChange('caption', val);
                  }}
                  placeholder="Escreva ou cole a legenda do post aqui..."
                  className="w-full flex-1 min-h-[240px] bg-transparent border-none outline-none resize-none t-body text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                />

                {/* Copiar Legenda Button & Length Counter */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between mt-auto">
                  <button
                    id="btn-copy-caption"
                    type="button"
                    onClick={handleCopyCaption}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    {copiedCaption ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          Legenda copiada!
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copiar legenda</span>
                      </>
                    )}
                  </button>
                  <span className="text-[11px] text-slate-400">
                    {caption ? `${caption.length} caracteres` : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* COLUMN 3: ARTE (Span 3) */}
            <div className="lg:col-span-3 flex flex-col">
              <label className="block t-label text-slate-500 mb-2">
                Arte
              </label>

              {/* Link do Drive, Figma, Canva... */}
              <div className="flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3 h-10 mb-3 focus-within:border-slate-900 dark:focus-within:border-white transition-colors">
                <Link2 className="h-4 w-4 text-slate-400 shrink-0" />
                <input
                  id="input-task-drivelink"
                  type="text"
                  value={driveLink}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDriveLink(val);
                    handleFieldChange('driveLink', val);
                  }}
                  placeholder="Link do Drive, Figma, Canva..."
                  className="flex-1 bg-transparent border-none outline-none t-ui text-slate-900 dark:text-white placeholder:text-slate-400"
                />
                {driveLink && (
                  <a
                    href={driveLink.startsWith('http') ? driveLink : 'https://' + driveLink}
                    target="_blank"
                    rel="noreferrer"
                    title="Abrir link externo"
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>

              {/* Enviar arquivos button / Trigger + Baixar todas */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <input
                ref={reenvioInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleReenviarArte}
                className="hidden"
              />
              <div className="flex items-center gap-2 mb-3">
                <button
                  id="btn-upload-files"
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 h-10 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-3 flex items-center justify-center gap-2 t-ui font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-45"
                >
                  <Upload className="h-4 w-4 text-slate-500" />
                  <span>{isUploading ? 'Enviando...' : 'Enviar arquivos'}</span>
                </button>
                {files && files.length > 0 && (
                  <button
                    id="btn-download-all-files"
                    type="button"
                    onClick={handleDownloadAllFiles}
                    className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 flex items-center justify-center gap-1.5 t-ui font-medium transition-colors cursor-pointer shrink-0"
                    title="Baixar todas as imagens individualmente (sem zipar)"
                  >
                    <Download className="h-4 w-4 text-slate-500" />
                    <span className="hidden sm:inline">Baixar todas</span>
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {files.length}
                    </span>
                  </button>
                )}
              </div>

              {/* Grid de Miniaturas de Imagem (3 columns matching mockup) */}
              <div
                id="grid-art-thumbnails"
                className="grid grid-cols-3 gap-2.5 max-h-[460px] overflow-y-auto pr-1"
              >
                {files && files.length > 0 ? (
                  files.map((file) => (
                    <div
                      key={file.id}
                      className="group relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 aspect-square flex flex-col justify-end transition-colors hover:border-slate-400 dark:hover:border-slate-600 cursor-pointer"
                      onClick={() => abrirPreview(file)}
                    >
                      {ehArteExibivel(file) ? (
                        <ArteDaTarefa
                          file={file}
                          taskId={task?.id}
                          alt={file.name}
                          className="w-full h-full object-cover absolute inset-0"
                          onLoadSrc={(src) =>
                            setArtesFaltando((atual) => {
                              if (!src === atual.has(file.id)) return atual;
                              const proximo = new Set(atual);
                              if (src) proximo.delete(file.id);
                              else proximo.add(file.id);
                              return proximo;
                            })
                          }
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                          Arquivo
                        </div>
                      )}

                      {artesFaltando.has(file.id) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReenviandoId(file.id);
                            reenvioInputRef.current?.click();
                          }}
                          className="absolute top-1.5 inset-x-1.5 z-30 inline-flex items-center justify-center gap-1 rounded-md bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 px-1.5 py-1 text-[10px] font-semibold text-slate-800 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-900 cursor-pointer"
                          title="Esta arte não chegou inteira na nuvem. Escolha o arquivo de novo para substituir no mesmo lugar."
                        >
                          <RefreshCw className="h-3 w-3" />
                          Enviar de novo
                        </button>
                      )}

                      {/* Dark gradient with filename overlay + download button */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-1.5 pt-4 z-10 flex items-center justify-between gap-1">
                        <p
                          className="text-[10px] font-semibold text-white truncate drop-shadow-xs flex-1"
                          title={file.name}
                        >
                          {file.name}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadSingleFile(file);
                          }}
                          className="p-1 rounded bg-black/40 hover:bg-black/80 text-white shrink-0 transition-colors"
                          title="Baixar esta imagem"
                        >
                          <Download className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Hover action overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 z-20">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirPreview(file);
                          }}
                          className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-900 transition-transform hover:scale-110"
                          title="Ampliar imagem"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadSingleFile(file);
                          }}
                          className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-900 transition-transform hover:scale-110"
                          title="Baixar imagem"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile(file.id);
                          }}
                          className="p-1.5 rounded-lg bg-rose-500/90 hover:bg-rose-500 text-white transition-transform hover:scale-110"
                          title="Excluir arte"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    Nenhuma arte enviada ainda
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FULL-SIZE MEDIA PREVIEW MODAL */}
      {previewMediaUrl && (
        <div
          className="fixed inset-0 z-60 bg-black/90 flex flex-col items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => {
            setPreviewMediaUrl(null);
            setPreviewMediaName('');
          }}
        >
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                downloadSingleFile({ id: '', name: previewMediaName, url: previewMediaUrl });
              }}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Baixar arte original"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setPreviewMediaUrl(null);
                setPreviewMediaName('');
              }}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Fechar (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div
            className="max-w-4xl max-h-[85vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewMediaUrl}
              alt={previewMediaName}
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
            />
            {previewMediaName && (
              <p className="text-white text-xs font-medium mt-3 opacity-80">{previewMediaName}</p>
            )}
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG FOR DELETE */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-70 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Excluir tarefa?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Esta tarefa será enviada para a lixeira.
                </p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Tem certeza que deseja excluir <strong>"{title || 'esta tarefa'}"</strong>? Você poderá restaurá-la a qualquer momento pela lixeira.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-delete-task"
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                <span>Sim, excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
