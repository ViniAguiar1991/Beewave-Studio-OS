import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle, Copy, Check } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  /** Cadeia de componentes React até o que quebrou. */
  componentStack: string;
  copied: boolean;
}

/**
 * Rede de proteção contra tela branca.
 *
 * A tela mostra a cadeia de componentes até o que quebrou e oferece um botão
 * de copiar. Antes só aparecia a mensagem minificada do React — que em
 * produção vira um código ("erro #300") sem dizer onde, e diagnosticar virava
 * adivinhação.
 */
export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    componentStack: '',
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Erro capturado pelo ErrorBoundary:', error, errorInfo);
    this.setState({ componentStack: errorInfo.componentStack || '' });
  }

  /** Primeiros componentes da cadeia — onde o problema realmente está. */
  private get culprits(): string[] {
    return this.state.componentStack
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 4);
  }

  private handleReload = () => window.location.reload();

  private handleResetCache = () => {
    try {
      localStorage.removeItem('beewave-studio-v2');
    } catch {
      /* armazenamento bloqueado; recarregar mesmo assim */
    }
    window.location.reload();
  };

  private handleCopy = async () => {
    const texto = [
      `Erro: ${this.state.error?.message || '(sem mensagem)'}`,
      `Endereço: ${window.location.href}`,
      `Quando: ${new Date().toLocaleString('pt-BR')}`,
      '',
      'Componentes:',
      this.state.componentStack || '(não informado)',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(texto);
      this.setState({ copied: true });
      window.setTimeout(() => this.setState({ copied: false }), 3000);
    } catch {
      /* clipboard bloqueado — o texto segue visível na tela */
    }
  };

  public override render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-white dark:bg-[#0a0b0d] text-slate-900 dark:text-slate-100 grid place-items-center p-6">
        <div className="max-w-lg w-full space-y-6">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-display text-[22px] font-semibold tracking-tight">
                Algo inesperado aconteceu
              </h1>
              <p className="text-[15px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Seus dados estão salvos na nuvem e não foram perdidos. Copie os detalhes
                abaixo e mande para o suporte — eles dizem exatamente onde o erro ocorreu.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
            <div className="p-3.5">
              <span className="text-[13px] font-semibold uppercase tracking-[0.09em] text-slate-500">
                Mensagem
              </span>
              <p className="mt-1.5 text-[13.5px] font-mono text-slate-800 dark:text-slate-200 break-words">
                {this.state.error?.message || '(sem mensagem)'}
              </p>
            </div>

            {this.culprits.length > 0 && (
              <div className="p-3.5">
                <span className="text-[13px] font-semibold uppercase tracking-[0.09em] text-slate-500">
                  Onde quebrou
                </span>
                <ul className="mt-1.5 space-y-0.5">
                  {this.culprits.map((linha, i) => (
                    <li
                      key={i}
                      className={`text-[13.5px] font-mono break-words ${
                        i === 0
                          ? 'text-rose-700 dark:text-rose-400 font-semibold'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {linha}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-[15px] font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              Recarregar
            </button>

            <button
              type="button"
              onClick={this.handleCopy}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-[15px] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {this.state.copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar detalhes
                </>
              )}
            </button>

            <button
              type="button"
              onClick={this.handleResetCache}
              className="h-10 px-3 rounded-lg text-[15px] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer ml-auto"
            >
              Limpar dados locais e reiniciar
            </button>
          </div>
        </div>
      </div>
    );
  }
}
