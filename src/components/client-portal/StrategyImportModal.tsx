import React, { useState } from 'react';
import { ClientStrategyDocument } from '../../types';
import { EMELY_STRATEGY_DOCUMENT } from '../../data/emelyStrategy';
import { parseStrategyDocument } from '../../utils/strategyDocumentParser';
import {
  X,
  Sparkles,
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  Copy,
  BookOpen,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface StrategyImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  onSaveStrategy: (strategy: ClientStrategyDocument) => void;
}

export const StrategyImportModal: React.FC<StrategyImportModalProps> = ({
  isOpen,
  onClose,
  clientName,
  onSaveStrategy,
}) => {
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<ClientStrategyDocument | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setErrorNotice(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
      }
    };
    reader.onerror = () => {
      setErrorNotice('Não foi possível ler o arquivo. Você pode colar o texto diretamente abaixo.');
    };
    reader.readAsText(file);
  };

  const handleLoadEmelyTemplate = () => {
    setParsedPreview(EMELY_STRATEGY_DOCUMENT);
    setFileName('Estratégia_Emely_Moda_Festa.pdf');
    setRawText(
      `PLANO DE MARCA, CONTEÚDO E AQUISIÇÃO • SETEMBRO 2026\n\n` +
      `Emely Moda Festa\n` +
      `Estratégia para ampliar a presença e transformar procura em vendas.\n\n` +
      `01 · MARCA E PÚBLICOS - Marca e proposta de valor\n` +
      `02 · OFERTA E DEMANDA - Portfólio e públicos\n` +
      `03 · DA OCASIÃO AO PÓS-EVENTO - Jornada e atendimento\n` +
      `04 · CONTEÚDO E LINGUAGEM - Linhas editoriais\n` +
      `05 · PRESENÇA E AQUISIÇÃO - Meta Ads e Google\n` +
      `06 · MERCADO E SWOT - Forças e Fraquezas\n` +
      `07 · KPIS E MENSURAÇÃO - Metas do trimestre\n` +
      `08 · PLANO DE 90 DIAS - Cronograma de aceleração\n` +
      `09 · ESCOPO E RESPONSABILIDADES - Divisão de tarefas\n` +
      `10 · GLOSSÁRIO E FONTES - Termos técnicos`
    );
  };

  const handleProcessDocument = async () => {
    if (!rawText.trim()) {
      setErrorNotice('Por favor, cole o texto do documento ou faça upload de um arquivo.');
      return;
    }

    setIsProcessing(true);
    setErrorNotice(null);

    try {
      const result = await parseStrategyDocument(rawText, clientName);
      setParsedPreview(result);
    } catch (err: any) {
      setErrorNotice('Ocorreu um erro ao interpretar o documento. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmApply = () => {
    if (!parsedPreview) return;
    onSaveStrategy(parsedPreview);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Interpretar Documento de Estratégia
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Envie o documento da marca (como o plano da Emely Noivas) para estruturar as abas no sistema
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Preset Helper Button */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-emerald-600" />
                <span>Exemplo Pronto: Plano Completo Emely Noivas (10 Capítulos)</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Carregue instantaneamente a estrutura idêntica aos prints (Noivas, Portfólio, Jornada e Gargalos).
              </p>
            </div>
            <button
              type="button"
              onClick={handleLoadEmelyTemplate}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors shrink-0 cursor-pointer"
            >
              Carregar Modelo Emely
            </button>
          </div>

          {/* Upload Area */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              1. Selecionar Arquivo (.txt, .md, .doc ou texto)
            </label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-white dark:bg-slate-900/40 group">
              <Upload className="h-6 w-6 text-slate-400 group-hover:text-emerald-500 transition-colors mb-2" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {fileName ? (
                  <span className="text-emerald-600 font-bold">{fileName}</span>
                ) : (
                  'Clique para escolher ou arraste o arquivo aqui'
                )}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Suporta documentos de texto, notas do Notion ou relatórios em texto
              </p>
              <input
                type="file"
                accept=".txt,.md,.json,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                2. Ou cole o conteúdo do documento aqui:
              </label>
              {rawText && (
                <span className="text-[10px] text-slate-400">
                  {rawText.length} caracteres
                </span>
              )}
            </div>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Cole aqui o sumário executivo, capítulos ou texto da estratégia da marca..."
              rows={7}
              className="w-full text-xs p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-mono"
            />
          </div>

          {errorNotice && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400">
              {errorNotice}
            </div>
          )}

          {/* Parse Button */}
          {!parsedPreview && (
            <button
              onClick={handleProcessDocument}
              disabled={isProcessing || !rawText.trim()}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Interpretando capítulos e decisões da marca...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-emerald-400 dark:text-emerald-600" />
                  <span>Interpretar Documento & Estruturar no Sistema</span>
                </>
              )}
            </button>
          )}

          {/* Parsed Preview Section */}
          {parsedPreview && (
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle className="h-4 w-4" />
                  Documento Estruturado com Sucesso!
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {parsedPreview.chapters.length} Capítulos Identificados
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {parsedPreview.title}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {parsedPreview.subtitle}
                </p>
              </div>

              {parsedPreview.keyDecisions && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-emerald-600 block text-[10px] uppercase">Decisão Central</span>
                    <span className="text-slate-700 dark:text-slate-300 line-clamp-2">{parsedPreview.keyDecisions.centralDecision}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-emerald-600 block text-[10px] uppercase">Posicionamento</span>
                    <span className="text-slate-700 dark:text-slate-300 line-clamp-2">{parsedPreview.keyDecisions.positioning}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-emerald-600 block text-[10px] uppercase">Prioridade</span>
                    <span className="text-slate-700 dark:text-slate-300 line-clamp-2">{parsedPreview.keyDecisions.cyclePriority}</span>
                  </div>
                </div>
              )}

              <div className="pt-2 flex flex-wrap gap-1.5">
                {parsedPreview.chapters.map((ch) => (
                  <span
                    key={ch.id || ch.number}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    {ch.number} {ch.title}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-950/40">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          {parsedPreview && (
            <button
              onClick={handleConfirmApply}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Aplicar Estratégia ao Cliente</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
