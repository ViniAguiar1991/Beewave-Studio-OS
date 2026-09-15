import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { useStatusNuvem } from '../services/statusNuvem';
import { haEnvioDeArteEmAndamento } from '../services/taskFileCloudSync';

/* ============================================================================
 * Atualização automática do app aberto.
 *
 * O app é uma página só: quem deixa a aba aberta o dia inteiro continua com a
 * versão do momento em que abriu. Em 15/09 isso custou caro — abas antigas
 * seguiam gravando cada tecla na nuvem horas depois da correção publicada.
 *
 * A cada publicação o build grava `versao.json`. O app confere esse arquivo
 * a cada 5 minutos e ao voltar para a aba.
 *
 * Com a aba visível, só aparece o aviso com "Atualizar". Recarregar sozinho
 * com a pessoa olhando tirava do lugar quem estava lendo ou apresentando, e
 * "2 minutos sem mexer" não prova que ninguém está usando.
 *
 * Recarrega sozinho só com a aba escondida há pelo menos 3 minutos seguidos,
 * e só se nada puder se perder: nenhuma edição aberta, nenhuma gravação da
 * nuvem pendente, nenhuma arte subindo, com internet (sem ela a recarga cai
 * na página de erro do navegador) e com sessionStorage (é ele que impede o
 * laço de recarga). Se algo impedir, tenta de novo a cada minuto enquanto a
 * aba seguir escondida.
 * ========================================================================== */

declare const __VERSAO_APP__: string;

const INTERVALO_MS = 5 * 60_000;
const OCULTA_MS = 3 * 60_000;
const NOVA_TENTATIVA_MS = 60_000;

interface EstadoDaAtualizacao {
  disponivel: boolean;
  /** Versão publicada, quando já conferida. Nula se só sabemos que os arquivos desta aba sumiram. */
  versaoRemota: string | null;
  /** Versão cujo aviso a pessoa fechou. O aviso volta quando surgir outra. */
  dispensada: string | null;
}

export const useAtualizacao = create<EstadoDaAtualizacao>(() => ({
  disponivel: false,
  versaoRemota: null,
  dispensada: null,
}));

/** Chave do aviso: a versão remota ou, sem ela, o chunk que não carregou. */
export const chaveDoAviso = (versaoRemota: string | null) => versaoRemota ?? 'arquivos-desatualizados';

/** Telas com edição aberta (modal da tarefa, rascunho da estratégia) seguram a recarga. */
let bloqueios = 0;

/* ---------------------------------------------------------------------------
 * sessionStorage: proteção contra laço e tela a restaurar
 * ------------------------------------------------------------------------- */

/**
 * Já recarregamos uma vez para esta versão e ela não veio (cache no meio do
 * caminho, publicação trocando). Não recarrega de novo sozinho: evita laço de
 * recarga, fica só o aviso.
 */
const CHAVE_RECARGA = 'beewave_recarga_para_versao';
const CHAVE_TELA = 'beewave_tela_antes_da_atualizacao';

const sessao = {
  ler(chave: string): string | null {
    try {
      return sessionStorage.getItem(chave);
    } catch {
      return null;
    }
  },
  apagar(chave: string) {
    try {
      sessionStorage.removeItem(chave);
    } catch {
      /* sem sessionStorage: nada guardado para apagar */
    }
  },
  /** Sem conseguir gravar e ler de volta, não há como marcar a tentativa. */
  disponivel(): boolean {
    try {
      sessionStorage.setItem('beewave_sessao_ok', '1');
      const ok = sessionStorage.getItem('beewave_sessao_ok') === '1';
      sessionStorage.removeItem('beewave_sessao_ok');
      return ok;
    } catch {
      return false;
    }
  },
};

// A recarga para esta versão deu certo: a marca da tentativa já cumpriu o
// papel. Se ficasse, uma publicação que voltasse para esta versão depois de
// um rollback nunca mais recarregaria sozinha nesta aba.
if (sessao.ler(CHAVE_RECARGA) === __VERSAO_APP__) sessao.apagar(CHAVE_RECARGA);

const jaTentouEssaVersao = (versao: string) => sessao.ler(CHAVE_RECARGA) === versao;

/* ---------------------------------------------------------------------------
 * Tela atual
 *
 * A recarga levava todo mundo de volta ao Início (e o cliente ao Resumo).
 * App e portal registram aqui uma função que devolve onde a pessoa está; na
 * recarga feita pela atualização isso vai para o sessionStorage e é lido uma
 * vez na volta. Abrir o app normalmente continua abrindo no Início.
 * ------------------------------------------------------------------------- */
const fornecedoresDeTela = new Map<string, () => unknown>();

export function registrarTela(nome: string, obter: () => unknown): () => void {
  fornecedoresDeTela.set(nome, obter);
  return () => {
    if (fornecedoresDeTela.get(nome) === obter) fornecedoresDeTela.delete(nome);
  };
}

// Lida e apagada já no carregamento: um F5 logo depois não restaura nada.
const telaGuardada: Record<string, unknown> | null = (() => {
  const texto = sessao.ler(CHAVE_TELA);
  if (!texto) return null;
  sessao.apagar(CHAVE_TELA);
  try {
    const dados = JSON.parse(texto);
    return dados && typeof dados === 'object' ? dados : null;
  } catch {
    return null;
  }
})();

/**
 * Onde a pessoa estava antes da recarga da atualização, para esta parte da
 * tela. Vale só na primeira montagem: quem abrir o portal de novo mais tarde
 * cai no Resumo, como sempre.
 */
export function useTelaRestaurada<T>(nome: string): T | null {
  const [valor] = useState(() => (telaGuardada?.[nome] as T | undefined) ?? null);
  useEffect(() => {
    if (telaGuardada) delete telaGuardada[nome];
  }, [nome]);
  return valor;
}

const guardarTela = () => {
  const tela: Record<string, unknown> = {};
  for (const [nome, obter] of fornecedoresDeTela) {
    try {
      tela[nome] = obter();
    } catch {
      /* uma parte que falha não impede as outras */
    }
  }
  sessionStorage.setItem(CHAVE_TELA, JSON.stringify(tela));
};

/* ---------------------------------------------------------------------------
 * Edição aberta
 * ------------------------------------------------------------------------- */

const TIPOS_DE_TEXTO = new Set(['text', 'search', 'email', 'url', 'tel', 'password', 'number']);

/**
 * Há algo sendo editado na tela? Detecção genérica, para não depender de cada
 * formulário lembrar de travar a recarga: diálogo aberto, texto digitado em
 * textarea, cursor num campo de texto ou rascunho marcado com
 * data-rascunho="true".
 */
export function haEdicaoAberta(): boolean {
  if (typeof document === 'undefined') return false;
  if (document.querySelector('[role="dialog"], [aria-modal="true"], [data-rascunho="true"]')) return true;
  for (const campo of Array.from(document.querySelectorAll('textarea'))) {
    if (campo.value !== '') return true;
  }
  const ativo = document.activeElement as HTMLElement | null;
  if (!ativo) return false;
  if (ativo.isContentEditable || ativo.tagName === 'TEXTAREA') return true;
  return ativo.tagName === 'INPUT' && TIPOS_DE_TEXTO.has((ativo as HTMLInputElement).type);
}

/** Segura a recarga automática enquanto a edição estiver aberta. Devolve a função que solta. */
export function impedirRecarga(): () => void {
  bloqueios++;
  let solto = false;
  return () => {
    if (solto) return;
    solto = true;
    bloqueios = Math.max(0, bloqueios - 1);
  };
}

/** Versão em hook, para formulários: segura enquanto `ativo` for verdadeiro. */
export function useImpedirRecarga(ativo: boolean) {
  useEffect(() => (ativo ? impedirRecarga() : undefined), [ativo]);
}

/* ---------------------------------------------------------------------------
 * Recarga
 * ------------------------------------------------------------------------- */

let ocultaDesde: number | null = null;
let relogioDaAbaOculta: ReturnType<typeof setTimeout> | null = null;

const podeRecarregarSozinho = (): boolean => {
  const { disponivel, versaoRemota } = useAtualizacao.getState();
  return (
    document.visibilityState === 'hidden' &&
    ocultaDesde !== null &&
    Date.now() - ocultaDesde >= OCULTA_MS &&
    disponivel &&
    !!versaoRemota &&
    versaoRemota !== __VERSAO_APP__ &&
    // Sem sessionStorage não há como lembrar que já tentamos: nunca sozinho.
    sessao.disponivel() &&
    !jaTentouEssaVersao(versaoRemota) &&
    bloqueios === 0 &&
    !haEdicaoAberta() &&
    useStatusNuvem.getState().pendentes === 0 &&
    !haEnvioDeArteEmAndamento() &&
    navigator.onLine
  );
};

async function tentarRecarregarComAbaOculta() {
  relogioDaAbaOculta = null;
  if (document.visibilityState !== 'hidden') return;

  if (podeRecarregarSozinho()) {
    // Confere de novo logo antes: a versão guardada pode ter até 5 minutos e
    // a publicação pode ter voltado atrás nesse meio tempo.
    await conferirVersao();
    const { versaoRemota } = useAtualizacao.getState();
    if (podeRecarregarSozinho() && versaoRemota) {
      try {
        sessionStorage.setItem(CHAVE_RECARGA, versaoRemota);
        guardarTela();
      } catch {
        // Sem conseguir marcar a tentativa, recarregar arriscaria um laço.
        agendarTentativa(NOVA_TENTATIVA_MS);
        return;
      }
      window.location.reload();
      return;
    }
  }
  // A aba pode ter voltado a ficar visível durante a conferência.
  if (document.visibilityState === 'hidden') agendarTentativa(NOVA_TENTATIVA_MS);
}

function agendarTentativa(atrasoMs: number) {
  if (relogioDaAbaOculta) clearTimeout(relogioDaAbaOculta);
  relogioDaAbaOculta = setTimeout(() => void tentarRecarregarComAbaOculta(), atrasoMs);
}

const aoEsconderAba = () => {
  ocultaDesde = Date.now();
  agendarTentativa(OCULTA_MS);
};

const aoMostrarAba = () => {
  ocultaDesde = null;
  if (relogioDaAbaOculta) clearTimeout(relogioDaAbaOculta);
  relogioDaAbaOculta = null;
};

/** Botão "Atualizar" do aviso. Com algo em edição, pergunta antes. */
export function atualizarAgora() {
  if (
    (bloqueios > 0 || haEdicaoAberta()) &&
    !window.confirm('Há algo sendo editado nesta tela. Atualizar agora e perder o que não foi salvo?')
  ) {
    return;
  }
  try {
    guardarTela();
  } catch {
    /* sem sessionStorage: recarrega e volta ao início */
  }
  window.location.reload();
}

export function dispensarAviso() {
  const { versaoRemota } = useAtualizacao.getState();
  useAtualizacao.setState({ dispensada: chaveDoAviso(versaoRemota) });
}

/**
 * Confere sempre, mesmo com versão nova já encontrada: se a publicação voltar
 * atrás (rollback) para a versão desta aba, o aviso some.
 */
async function conferirVersao() {
  try {
    const resposta = await fetch(`/versao.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!resposta.ok) return;
    const { versao } = (await resposta.json()) as { versao?: string };
    if (!versao) return;
    if (versao === __VERSAO_APP__) {
      useAtualizacao.setState({ disponivel: false, versaoRemota: null });
    } else {
      useAtualizacao.setState({ disponivel: true, versaoRemota: versao });
    }
  } catch {
    /* sem internet: confere na próxima */
  }
}

let iniciado = false;

export function iniciarAtualizacaoAutomatica() {
  // No desenvolvimento não existe versao.json e o Vite já recarrega sozinho.
  if (iniciado || import.meta.env.DEV) return;
  iniciado = true;

  // Aba velha pedindo um pedaço do app (import dinâmico) que a publicação
  // nova já apagou do servidor: em vez de estourar erro, avisa que há versão
  // nova. A recarga segue as regras de sempre ou vem pelo botão. O aviso volta
  // mesmo que tenha sido dispensado: agora a aba velha já quebrou de fato.
  window.addEventListener('vite:preloadError', (evento) => {
    evento.preventDefault();
    useAtualizacao.setState({ disponivel: true, dispensada: null });
    void conferirVersao();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      aoMostrarAba();
      void conferirVersao();
    } else {
      aoEsconderAba();
    }
  });
  // Aberta direto em segundo plano: o relógio começa agora.
  if (document.visibilityState === 'hidden') aoEsconderAba();

  setInterval(() => void conferirVersao(), INTERVALO_MS);
  setTimeout(() => void conferirVersao(), 30_000);
}
