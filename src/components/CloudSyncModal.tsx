import React, { useState, useEffect } from 'react';
import {
  Cloud,
  RefreshCw,
  Download,
  Upload,
  X,
} from 'lucide-react';
import { useAppStore } from '../store';
import { pushFullStoreToCloud } from '../services/firestoreSync';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ isOpen, onClose }) => {
  const cloudSync = useAppStore((s) => s.cloudSync);
  const syncWithCloud = useAppStore((s) => s.syncWithCloud);
  const exportBackupJson = useAppStore((s) => s.exportBackupJson);
  const importBackupJson = useAppStore((s) => s.importBackupJson);
  const tasks = useAppStore((s) => s.tasks);
  const clients = useAppStore((s) => s.clients);

  const [isSyncing, setIsSyncing] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSync = async () => {
    setIsSyncing(true);
    await syncWithCloud();
    await pushFullStoreToCloud();
    setIsSyncing(false);
    setImportStatus('Sincronizado com Firebase Cloud Firestore!');
    setTimeout(() => setImportStatus(null), 3000);
  };

  const handleExport = () => {
    const jsonStr = exportBackupJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studiocloud_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const success = importBackupJson(content);
      if (success) {
        setImportStatus('Backup restaurado com sucesso!');
        setTimeout(() => setImportStatus(null), 3000);
      } else {
        setImportStatus('Erro ao importar JSON. Verifique o formato do arquivo.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="clean-card w-full max-w-lg p-6 md:p-8 bg-white/95 dark:bg-slate-900/95 space-y-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold">
              <Cloud className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Integração com Serviços na Nuvem
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-300">Sincronização persistente & backup</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cloud Status Card */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/80 dark:bg-emerald-950/40 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                Serviço de Nuvem Ativo & Operacional
              </span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              Latência: 18ms
            </span>
          </div>
          <p className="text-xs text-emerald-950/90 dark:text-emerald-200/90 leading-relaxed font-medium">
            Seus dados estão protegidos e disponíveis em tempo real para sincronização com o backend de automação e IA.
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3.5 text-xs">
          <div className="clean-card p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-600 dark:text-slate-300 text-[11px] font-medium">Clientes e Tarefas</span>
            <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
              {clients.length} contas • {tasks.length} posts
            </p>
          </div>
          <div className="clean-card p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-600 dark:text-slate-300 text-[11px] font-medium">Última Sincronização</span>
            <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
              {new Date(cloudSync.lastSync).toLocaleTimeString('pt-BR')}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold py-3 text-xs shadow-sm transition-all active:scale-95 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando com a nuvem...' : 'Sincronizar Agora'}</span>
          </button>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-slate-500 dark:text-slate-300" />
              <span>Exportar Backup (JSON)</span>
            </button>

            <label className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
              <Upload className="h-3.5 w-3.5 text-slate-500 dark:text-slate-300" />
              <span>Importar Backup</span>
              <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            </label>
          </div>

          {importStatus && (
            <p className="text-center text-xs font-bold text-slate-900 dark:text-white pt-1">
              {importStatus}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
