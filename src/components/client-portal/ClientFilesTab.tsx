import React, { useRef, useState } from 'react';
import { Upload, Download, FileText, Image as ImageIcon, FileArchive } from 'lucide-react';
import { Client, ClientFile } from '../../types';
import { formatTimestamp } from '../../utils/dateFormatter';
import { downloadTaskFile } from '../../utils/fileDownload';
import { Button, EmptyState, ErrorState } from '../ui';

interface ClientFilesTabProps {
  client: Client;
  onAddFiles: (files: ClientFile[]) => void;
}

const MAX_FILE_BYTES = 8 * 1024 * 1024;

const formatSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const iconFor = (type?: string) => {
  if (!type) return FileText;
  if (type.startsWith('image/')) return ImageIcon;
  if (type.includes('zip') || type.includes('rar')) return FileArchive;
  return FileText;
};

/**
 * Arquivos — o material que circula entre cliente e agência.
 *
 * Ação dominante: enviar arquivo. É a única coisa que o cliente inicia aqui,
 * então é o único botão em tinta cheia; baixar é secundário e vive na linha
 * de cada arquivo.
 */
export const ClientFilesTab: React.FC<ClientFilesTabProps> = ({ client, onAddFiles }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const files = [...(client.files || [])].sort((a, b) =>
    (b.uploadedAt || '').localeCompare(a.uploadedAt || '')
  );

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []) as File[];
    if (picked.length === 0) return;

    setError(null);

    const tooBig = picked.find((f) => f.size > MAX_FILE_BYTES);
    if (tooBig) {
      setError(
        `"${tooBig.name}" tem ${formatSize(tooBig.size)} e o limite por arquivo é 8 MB. Comprima o arquivo ou envie por link.`
      );
      e.target.value = '';
      return;
    }

    setIsReading(true);
    try {
      const read = await Promise.all(
        picked.map(
          (f) =>
            new Promise<ClientFile>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () =>
                resolve({
                  id: `cfile_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                  name: f.name,
                  type: f.type,
                  size: f.size,
                  dataUrl: reader.result as string,
                  uploadedAt: new Date().toISOString(),
                });
              reader.onerror = () => reject(new Error(f.name));
              reader.readAsDataURL(f);
            })
        )
      );
      onAddFiles(read);
    } catch {
      setError('Não foi possível ler os arquivos selecionados. Tente novamente.');
    } finally {
      setIsReading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="portal-enter space-y-8">
      <div className="flex items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h2 className="t-label text-slate-500">
            Arquivos
          </h2>
          <p className="t-meta text-slate-500 dark:text-slate-400 mt-1">
            {files.length === 0
              ? 'Nenhum arquivo trocado ainda'
              : `${files.length} ${files.length === 1 ? 'arquivo' : 'arquivos'} entre você e a Beewave`}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={Upload}
          pending={isReading}
          pendingLabel="Lendo arquivo…"
          onClick={() => inputRef.current?.click()}
        >
          Enviar arquivo
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleUpload}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {error && (
        <ErrorState
          title="Arquivo não enviado"
          hint={error}
          onRetry={() => {
            setError(null);
            inputRef.current?.click();
          }}
        />
      )}

      {!error && files.length === 0 ? (
        <EmptyState
          title="Nenhum arquivo por aqui ainda"
          hint="Use este espaço para enviar logotipos, fotos de produto, tabelas de preço e qualquer material que a equipe precise para produzir."
          action={
            <Button variant="primary" size="sm" icon={Upload} onClick={() => inputRef.current?.click()}>
              Enviar o primeiro arquivo
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {files.map((file) => {
            const Icon = iconFor(file.type);
            return (
              <li key={file.id} className="flex items-center gap-4 py-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <Icon className="h-4 w-4" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block t-lead font-medium text-slate-900 dark:text-white truncate">
                    {file.name}
                  </span>
                  <span className="block t-meta text-slate-500 dark:text-slate-400 mt-0.5">
                    {[formatSize(file.size), file.uploadedAt && formatTimestamp(file.uploadedAt)]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>

                <Button
                  variant="ghost"
                  size="sm"
                  icon={Download}
                  onClick={() => downloadTaskFile(file)}
                >
                  Baixar
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
