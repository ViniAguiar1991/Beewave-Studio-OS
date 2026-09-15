import { create } from 'zustand';

/* ============================================================================
 * Atualização automática do app aberto.
 *
 * O app é uma página só: quem deixa a aba aberta o dia inteiro continua com a
 * versão do momento em que abriu. Em 15/09 isso custou caro — abas antigas
 * seguiam gravando cada tecla na nuvem horas depois da correção publicada.
 *
 * A cada publicação o build grava `versao.json`. O app confere esse arquivo
 * a cada 5 minutos e ao voltar para a aba. Havendo versão nova, recarrega
 * sozinho quando ninguém está no meio de uma edição (aba em segundo plano ou
 * 2 minutos sem mexer). Enquanto isso, mostra o aviso com "Atualizar".
 * ========================================================================== */

declare const __VERSAO_APP__: string;

const INTERVALO_MS = 5 * 60_000;
const OCIOSO_MS = 2 * 60_000;

export const useAtualizacao = create<{ disponivel: boolean }>(() => ({ disponivel: false }));

/** Telas com edição aberta (modal da tarefa, rascunho da estratégia) seguram a recarga. */
let bloqueios = 0;
let ultimaAtividade = Date.now();
let versaoRemota: string | null = null;

/**
 * Já recarregamos uma vez para esta versão e ela não veio (cache no meio do
 * caminho, publicação trocando). Não recarrega de novo sozinho: evita laço de
 * recarga, fica só o aviso.
 */
const CHAVE_RECARGA = 'beewave_recarga_para_versao';
const jaTentouEssaVersao = (versao: string) => {
  try {
    return sessionStorage.getItem(CHAVE_RECARGA) === versao;
  } catch {
    return false;
  }
};

const podeRecarregarSozinho = () =>
  useAtualizacao.getState().disponivel &&
  !!versaoRemota &&
  !jaTentouEssaVersao(versaoRemota) &&
  bloqueios === 0 &&
  (document.visibilityState === 'hidden' || Date.now() - ultimaAtividade > OCIOSO_MS);

const tentarRecarregar = () => {
  if (!podeRecarregarSozinho()) return;
  try {
    sessionStorage.setItem(CHAVE_RECARGA, versaoRemota!);
  } catch {
    /* sem sessionStorage: recarrega mesmo assim */
  }
  window.location.reload();
};

/** Segura a recarga automática enquanto a edição estiver aberta. Devolve a função que solta. */
export function impedirRecarga(): () => void {
  bloqueios++;
  let solto = false;
  return () => {
    if (solto) return;
    solto = true;
    bloqueios = Math.max(0, bloqueios - 1);
    tentarRecarregar();
  };
}

async function conferirVersao() {
  if (useAtualizacao.getState().disponivel) return;
  try {
    const resposta = await fetch(`/versao.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!resposta.ok) return;
    const { versao } = (await resposta.json()) as { versao?: string };
    if (versao && versao !== __VERSAO_APP__) {
      versaoRemota = versao;
      useAtualizacao.setState({ disponivel: true });
      tentarRecarregar();
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

  const marcarAtividade = () => {
    ultimaAtividade = Date.now();
  };
  for (const evento of ['pointerdown', 'keydown', 'wheel', 'touchstart']) {
    window.addEventListener(evento, marcarAtividade, { passive: true });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void conferirVersao();
    else tentarRecarregar();
  });

  setInterval(() => {
    void conferirVersao();
    tentarRecarregar();
  }, INTERVALO_MS);

  setTimeout(() => void conferirVersao(), 30_000);
}
