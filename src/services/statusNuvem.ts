import { create } from 'zustand';

/* ============================================================================
 * Estado real da sincronização com a nuvem.
 *
 * O ponto verde de "Nuvem" era fixo: ficava verde mesmo com o Firestore
 * recusando tudo por cota estourada. A equipe achava que estava sincronizado
 * e a tarefa criada num computador simplesmente não chegava nos outros.
 *
 * Aqui contamos gravações que saíram e ainda não voltaram confirmadas. Com a
 * cota esgotada ou sem internet, o Firestore guarda a gravação no navegador
 * e fica tentando — a promessa não falha, só não termina. Por isso o sinal é
 * o tempo: gravação esperando há mais de alguns segundos vira aviso.
 *
 * Store separada e sem persistência de propósito: a store principal grava o
 * estado inteiro no localStorage a cada mudança, e isto muda a cada envio.
 * ========================================================================== */

const ATRASO_PARA_AVISAR_MS = 10_000;

interface StatusNuvem {
  /** Gravações enviadas (ou agendadas) que a nuvem ainda não confirmou. */
  pendentes: number;
  /** Há gravação esperando há mais de 10 s. */
  atrasado: boolean;
  /** O Firestore recusou por limite diário. */
  cotaEsgotada: boolean;
  /** Algum listener caiu e está tentando voltar. */
  reconectando: boolean;
}

export const useStatusNuvem = create<StatusNuvem>(() => ({
  pendentes: 0,
  atrasado: false,
  cotaEsgotada: false,
  reconectando: false,
}));

let relogioDoAtraso: ReturnType<typeof setTimeout> | null = null;

export const inicioDeEnvio = () => {
  const { pendentes } = useStatusNuvem.getState();
  useStatusNuvem.setState({ pendentes: pendentes + 1 });
  if (pendentes === 0 && !relogioDoAtraso) {
    relogioDoAtraso = setTimeout(() => {
      relogioDoAtraso = null;
      if (useStatusNuvem.getState().pendentes > 0) useStatusNuvem.setState({ atrasado: true });
    }, ATRASO_PARA_AVISAR_MS);
  }
};

export const fimDeEnvio = () => {
  const pendentes = Math.max(0, useStatusNuvem.getState().pendentes - 1);
  if (pendentes > 0) {
    useStatusNuvem.setState({ pendentes });
    return;
  }
  if (relogioDoAtraso) {
    clearTimeout(relogioDoAtraso);
    relogioDoAtraso = null;
  }
  useStatusNuvem.setState({ pendentes: 0, atrasado: false });
};

/** Conta a gravação como pendente até a nuvem confirmar. */
export const rastrearEnvio = <T,>(envio: Promise<T>): Promise<T> => {
  inicioDeEnvio();
  return envio.finally(fimDeEnvio);
};

const ehCota = (erro: unknown) => {
  const e = erro as { code?: string; message?: string } | undefined;
  return e?.code === 'resource-exhausted' || /quota|resource.exhausted/i.test(e?.message || '');
};

export const registrarFalhaDaNuvem = (erro: unknown) => {
  useStatusNuvem.setState({
    reconectando: true,
    ...(ehCota(erro) ? { cotaEsgotada: true } : {}),
  });
};

export const registrarNuvemRespondendo = () => {
  const s = useStatusNuvem.getState();
  // Resposta do servidor: a leitura voltou, e a cota junto com ela.
  if (s.reconectando || s.cotaEsgotada) useStatusNuvem.setState({ reconectando: false, cotaEsgotada: false });
};
