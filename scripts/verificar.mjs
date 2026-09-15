#!/usr/bin/env node
/**
 * Verificação automática antes de publicar.
 *
 * Roda o que não depende de julgamento: tipos, build e as regras que já
 * derrubaram o app. Os agentes do ciclo /publicar cuidam do resto; isto aqui
 * é o piso — se falhar, nem vale chamar os agentes.
 *
 *   npm run verificar
 */
import { execFileSync, execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath e não .pathname: a pasta do projeto tem espaço ("Beewave OS").
const raiz = fileURLToPath(new URL('..', import.meta.url));
const falhas = [];

const passo = (nome, fn) => {
  process.stdout.write(`• ${nome}… `);
  try {
    const nota = fn();
    console.log(nota ? `ok (${nota})` : 'ok');
  } catch (err) {
    console.log('FALHOU');
    falhas.push(`${nome}: ${err.message}`);
  }
};

const arquivos = (dir) =>
  readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho];
  });

const fontes = arquivos(join(raiz, 'src')).filter((f) => /\.(ts|tsx)$/.test(f));
const ler = (f) => readFileSync(f, 'utf8');

/* ===========================================================================
 * Leitura do código-fonte
 *
 * As regras olham só para código. Comentário que cita `setDoc(` (e há vários,
 * explicando o porquê das coisas) não pode reprovar, e texto de string não
 * pode esconder nem inventar parêntese. O tamanho e as quebras de linha são
 * preservados, para o número da linha no erro bater com o arquivo.
 * ========================================================================= */

/** Caracteres depois dos quais uma `/` abre expressão regular, e não divisão. */
const ANTES_DE_REGEX = '(,=:[!&|?{;+-*%~^';
/** Palavras depois das quais uma `/` também abre expressão regular. */
const PALAVRAS_ANTES_DE_REGEX = /^(return|typeof|case|in|of|void|yield|await|delete|instanceof|else|do)$/;

/**
 * Devolve duas cópias do texto:
 *   - semComentarios: comentários em branco;
 *   - soCodigo: comentários e conteúdo de string, template e regex em branco.
 */
function limparFonte(texto) {
  const n = texto.length;
  const semComentarios = [];
  const soCodigo = [];
  const branco = (c) => (c === '\n' ? '\n' : ' ');
  const emBranco = (c) => {
    semComentarios.push(branco(c));
    soCodigo.push(branco(c));
  };
  const literal = (c) => {
    semComentarios.push(c);
    soCodigo.push(branco(c));
  };
  const codigo = (c) => {
    semComentarios.push(c);
    soCodigo.push(c);
  };
  // Últimos caracteres de código que não são espaço, e a palavra que termina
  // neles — para decidir se uma `/` abre regex (`=> /x/`, `return /x/`).
  let anterior = '';
  let antesDoAnterior = '';
  let palavra = '';
  let emPalavra = false;
  const marcarAnterior = (c) => {
    antesDoAnterior = anterior;
    anterior = c;
  };

  let i = 0;
  while (i < n) {
    const c = texto[i];
    const d = texto[i + 1];

    if (c === '/' && d === '/') {
      while (i < n && texto[i] !== '\n') emBranco(texto[i++]);
      continue;
    }
    if (c === '/' && d === '*') {
      const fim = texto.indexOf('*/', i + 2);
      const ate = fim === -1 ? n : fim + 2;
      while (i < ate) emBranco(texto[i++]);
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      codigo(c);
      i++;
      while (i < n && texto[i] !== c) {
        // String comum sem fechar na linha (apóstrofo em texto de JSX): não
        // deixa engolir o resto do arquivo.
        if (c !== '`' && texto[i] === '\n') break;
        if (texto[i] === '\\' && i + 1 < n) literal(texto[i++]);
        literal(texto[i++]);
      }
      if (texto[i] === c) codigo(texto[i++]);
      marcarAnterior(c);
      emPalavra = false;
      continue;
    }
    const abreRegex =
      anterior === '' ||
      ANTES_DE_REGEX.includes(anterior) ||
      (anterior === '>' && antesDoAnterior === '=') ||
      (/[\w$]/.test(anterior) && PALAVRAS_ANTES_DE_REGEX.test(palavra));
    if (c === '/' && abreRegex) {
      // Expressão regular: vai até a `/` que fecha, fora de [classe], na mesma linha.
      let j = i + 1;
      let classe = false;
      while (j < n && texto[j] !== '\n') {
        if (texto[j] === '\\') j += 2;
        else if (texto[j] === '[') (classe = true), j++;
        else if (texto[j] === ']') (classe = false), j++;
        else if (texto[j] === '/' && !classe) break;
        else j++;
      }
      if (j < n && texto[j] === '/') {
        codigo(c);
        for (i++; i < j; i++) literal(texto[i]);
        codigo(texto[i++]);
        marcarAnterior('/');
        emPalavra = false;
        continue;
      }
    }
    codigo(c);
    if (/[\w$]/.test(c)) {
      palavra = emPalavra ? palavra + c : c;
      emPalavra = true;
    } else {
      emPalavra = false;
    }
    if (!/\s/.test(c)) marcarAnterior(c);
    i++;
  }
  return { semComentarios: semComentarios.join(''), soCodigo: soCodigo.join('') };
}

const linhaDe = (texto, pos) => texto.slice(0, pos).split('\n').length;

/** Índice do fechamento que casa com a abertura em `inicio` ((, [ ou {). */
function fechamento(codigo, inicio) {
  let profundidade = 0;
  for (let i = inicio; i < codigo.length; i++) {
    const c = codigo[i];
    if (c === '(' || c === '[' || c === '{') profundidade++;
    else if (c === ')' || c === ']' || c === '}') {
      profundidade--;
      if (profundidade === 0) return i;
    }
  }
  return codigo.length - 1;
}

/* ===========================================================================
 * Regras (funções puras sobre o texto, testadas no autoteste abaixo)
 * ========================================================================= */

const CHAMADAS_DE_NUVEM = [
  'setDoc', 'getDoc', 'getDocs', 'getDocFromServer', 'getDocsFromServer', 'getDocFromCache',
  'getDocsFromCache', 'getAggregateFromServer', 'getCountFromServer', 'onSnapshot', 'writeBatch',
  'runTransaction', 'deleteDoc', 'updateDoc', 'addDoc', 'uploadString', 'uploadBytes',
  'uploadBytesResumable', 'getDownloadURL', 'getBlob', 'getBytes', 'deleteObject',
];
const reChamadaDeNuvem = new RegExp(`\\b(${CHAMADAS_DE_NUVEM.join('|')})\\s*\\(`, 'g');
const reImportDeNuvem = /(?:\bfrom\s*|\bimport\s*\(?\s*)['"]firebase\/(?:firestore|storage)(?:\/[^'"]*)?['"]/g;

/** Chamadas e imports do Firestore/Storage num arquivo que não é módulo de nuvem. */
function acessosANuvem(texto) {
  const { semComentarios, soCodigo } = limparFonte(texto);
  const achados = [];
  for (const m of soCodigo.matchAll(reChamadaDeNuvem)) achados.push(`${m[1]}() na linha ${linhaDe(soCodigo, m.index)}`);
  for (const m of semComentarios.matchAll(reImportDeNuvem)) {
    achados.push(`import de firebase na linha ${linhaDe(semComentarios, m.index)}`);
  }
  return achados;
}

/** A ocorrência em `pos` está dentro dos parênteses de uma chamada rastrearEnvio(? */
function dentroDeRastrearEnvio(codigo, pos) {
  let profundidade = 0;
  for (let i = pos - 1; i >= 0; i--) {
    const c = codigo[i];
    if (c === ')' || c === ']' || c === '}') profundidade++;
    else if (c === '(' || c === '[' || c === '{') {
      if (profundidade > 0) {
        profundidade--;
        continue;
      }
      // Abertura que envolve a ocorrência: se for de rastrearEnvio, está rastreada.
      if (c === '(' && /\brastrearEnvio\s*$/.test(codigo.slice(Math.max(0, i - 60), i))) return true;
    }
  }
  return false;
}

/**
 * Linhas com gravação fora de rastrearEnvio(. Os wrappers (gravar, apagar,
 * atualizar) não têm exceção: eles mesmos precisam chamar rastrearEnvio, e
 * assim um wrapper sem rastreador também reprova.
 */
function gravacoesSemRastreador(texto) {
  const { soCodigo } = limparFonte(texto);
  const soltas = [];
  for (const m of soCodigo.matchAll(/(?<![\w$.])(?:setDoc|deleteDoc|updateDoc|addDoc)\s*\(|\.\s*commit\s*\(/g)) {
    if (!dentroDeRastrearEnvio(soCodigo, m.index)) soltas.push(linhaDe(soCodigo, m.index));
  }
  return soltas;
}

/** handleFieldChange do modal adia a nuvem? */
function handleFieldChangeAdiaNuvem(texto) {
  const { soCodigo } = limparFonte(texto);
  const inicio = soCodigo.search(/const handleFieldChange\s*=/);
  if (inicio === -1) return false;
  const seta = /=>\s*\{/.exec(soCodigo.slice(inicio));
  if (!seta) return false;
  const corpo = inicio + seta.index + seta[0].length - 1;
  const bloco = soCodigo.slice(inicio, fechamento(soCodigo, corpo) + 1);
  const chamadas = [...bloco.matchAll(/\bupdateTask\s*\(/g)];
  return (
    chamadas.length > 0 &&
    chamadas.every((u) => {
      const abre = u.index + u[0].length - 1;
      return /adiarNuvem\s*:\s*true/.test(bloco.slice(abre, fechamento(bloco, abre) + 1));
    })
  );
}

/** Linhas com updateTask( dentro de onChange={…} sem { adiarNuvem: true }. */
function onChangeGravandoPorTecla(texto) {
  const { soCodigo } = limparFonte(texto);
  const linhas = [];
  for (const m of soCodigo.matchAll(/\bonChange\s*=\s*\{/g)) {
    const abre = m.index + m[0].length - 1;
    const handler = soCodigo.slice(abre, fechamento(soCodigo, abre) + 1);
    for (const u of handler.matchAll(/\bupdateTask\s*\(/g)) {
      const abreChamada = u.index + u[0].length - 1;
      const chamada = handler.slice(abreChamada, fechamento(handler, abreChamada) + 1);
      if (!/adiarNuvem\s*:\s*true/.test(chamada)) linhas.push(linhaDe(soCodigo, abre + u.index));
    }
  }
  return linhas;
}

/* ===========================================================================
 * Autoteste: cada regra reprova a violação que existe para pegar
 *
 * Uma regra que nunca reprova passa em silêncio para sempre. Estas amostras
 * provam, a cada execução, que as funções acima pegam o que prometem e não
 * reprovam o que é permitido.
 * ========================================================================= */
passo('Regras da verificação pegam violações conhecidas', () => {
  const erros = [];
  const espera = (nome, obtido, esperado) => {
    if (JSON.stringify(obtido) !== JSON.stringify(esperado)) {
      erros.push(`${nome}: esperado ${JSON.stringify(esperado)}, veio ${JSON.stringify(obtido)}`);
    }
  };

  // Leitura do fonte
  const amostraLimpeza = "const a = 'x // y'; // setDoc(r)\n/* deleteDoc(x) */ const b = /['\"]/g;\n<p>Don't</p>";
  espera('limparFonte preserva tamanho', limparFonte(amostraLimpeza).soCodigo.length, amostraLimpeza.length);
  espera(
    'limparFonte: regex depois de => e de return',
    limparFonte('a.every((l) => /[.)]/.test(l));\nfunction f() { return /[(]/; }').soCodigo.replace(/[^()]/g, ''),
    '(()())()'
  );

  // Acesso à nuvem
  for (const nome of [
    'runTransaction', 'getDocFromServer', 'getDocsFromServer', 'getDocFromCache', 'getAggregateFromServer',
    'updateDoc', 'addDoc', 'uploadString', 'uploadBytes', 'uploadBytesResumable', 'getBlob', 'getBytes',
    'setDoc', 'getDocs', 'onSnapshot',
  ]) {
    espera(`acesso: ${nome}`, acessosANuvem(`async function f() {\n  await ${nome}(ref, {});\n}`).length, 1);
  }
  espera('acesso: import firestore', acessosANuvem("import { getFirestore } from 'firebase/firestore';").length, 1);
  espera('acesso: import storage', acessosANuvem('import { ref } from "firebase/storage";').length, 1);
  espera('acesso: import lite', acessosANuvem("import { doc } from 'firebase/firestore/lite';").length, 1);
  espera('acesso: import dinâmico', acessosANuvem("const m = await import('firebase/firestore');").length, 1);
  espera('acesso: comentário não conta', acessosANuvem('// aqui antes havia setDoc(ref)\n/* getDoc(x) */').length, 0);
  espera('acesso: string não conta', acessosANuvem("const aviso = 'use setDoc(ref)';").length, 0);
  espera('acesso: módulo do app', acessosANuvem("import { db } from '../firebase';").length, 0);

  // Rastreador
  espera('rastreador: setDoc solto', gravacoesSemRastreador('await setDoc(ref, dados);'), [1]);
  espera('rastreador: updateDoc solto', gravacoesSemRastreador('x();\nawait updateDoc(ref, {\n  a: 1,\n});'), [2]);
  espera('rastreador: addDoc solto', gravacoesSemRastreador('addDoc(col, {});'), [1]);
  espera('rastreador: deleteDoc solto', gravacoesSemRastreador('deleteDoc(ref);'), [1]);
  espera('rastreador: commit solto', gravacoesSemRastreador('await lote.commit();'), [1]);
  espera('rastreador: depois do rastreio', gravacoesSemRastreador('rastrearEnvio(x).then(() => deleteDoc(ref));'), [1]);
  espera('rastreador: wrapper sem rastreio', gravacoesSemRastreador('const gravar = (r, d) => setDoc(r, d);'), [1]);
  espera(
    'rastreador: dentro, com quebra de linha',
    gravacoesSemRastreador('await rastrearEnvio(\n  setDoc(ref, dados, { merge: true })\n);'),
    []
  );
  espera(
    'rastreador: wrapper com rastreio',
    gravacoesSemRastreador('const gravar = (ref, dados, opcoes) =>\n  rastrearEnvio(opcoes ? setDoc(ref, dados, opcoes) : setDoc(ref, dados));'),
    []
  );
  espera(
    'rastreador: commits em lote',
    gravacoesSemRastreador('await Promise.all(lotes.map((lote) => rastrearEnvio(lote.commit())));'),
    []
  );
  espera('rastreador: comentário', gravacoesSemRastreador('// setDoc(ref, dados) direto era o problema\n/* lote.commit() */'), []);

  // Modal
  espera(
    'modal: handleFieldChange sem adiar',
    handleFieldChangeAdiaNuvem('const handleFieldChange = (f, v) => {\n  updateTask(id, { [f]: v });\n};'),
    false
  );
  espera(
    'modal: handleFieldChange adiando',
    handleFieldChangeAdiaNuvem('const handleFieldChange = (f, v) => {\n  updateTask(id, { [f]: v }, { adiarNuvem: true });\n};'),
    true
  );
  espera(
    'modal: onChange gravando',
    onChangeGravandoPorTecla('<input\n  onChange={(e) => {\n    updateTask(task.id, { title: e.target.value });\n  }}\n/>'),
    [3]
  );
  espera(
    'modal: onChange de uma linha gravando',
    onChangeGravandoPorTecla('<input onChange={(e) => updateTask(task.id, { caption: e.target.value })} />'),
    [1]
  );
  espera(
    'modal: onChange adiando',
    onChangeGravandoPorTecla('<input onChange={(e) => updateTask(task.id, { caption: e.target.value }, { adiarNuvem: true })} />'),
    []
  );
  espera(
    'modal: onChange via handleFieldChange',
    onChangeGravandoPorTecla("<input onChange={(e) => handleFieldChange('title', e.target.value)} />"),
    []
  );

  if (erros.length) throw new Error(erros.join('\n'));
  return 'amostras de violação reprovadas';
});

passo('TypeScript', () => {
  try {
    execSync('npx tsc --noEmit', { cwd: raiz, stdio: 'pipe' });
  } catch (err) {
    throw new Error(String(err.stdout || err.message).split('\n').slice(0, 10).join('\n'));
  }
});

/*
 * Acesso ao Firestore/Storage só nos módulos de nuvem. Leitura ou gravação
 * espalhada em componente foi o que multiplicou o consumo da cota.
 */
const MODULOS_DE_NUVEM = [
  'src/firebase.ts',
  'src/services/firestoreSync.ts',
  'src/services/taskFileCloudSync.ts',
  'src/services/storageArtes.ts',
  'src/services/migracaoBase.ts',
];
passo('Acesso à nuvem só nos módulos de nuvem', () => {
  const fora = fontes
    .map((f) => relative(raiz, f).split('\\').join('/'))
    .filter((f) => !MODULOS_DE_NUVEM.includes(f))
    .flatMap((f) => acessosANuvem(ler(join(raiz, f))).map((achado) => `${f}: ${achado}`));
  if (fora.length) throw new Error(`Firestore/Storage fora dos módulos de nuvem:\n${fora.join('\n')}`);
});

const MODULOS_QUE_GRAVAM = ['src/services/firestoreSync.ts', 'src/services/taskFileCloudSync.ts'];
passo('Gravações passam pelo rastreador', () => {
  const soltas = MODULOS_QUE_GRAVAM.flatMap((f) => {
    const linhas = gravacoesSemRastreador(ler(join(raiz, f)));
    return linhas.length ? [`${f} nas linhas ${linhas.join(', ')}`] : [];
  });
  if (soltas.length) throw new Error(`gravação fora de rastrearEnvio(: ${soltas.join('; ')}`);
});

passo('Campos de texto do modal não gravam por tecla', () => {
  const modal = ler(join(raiz, 'src/components/TaskWorkflowModal.tsx'));
  const problemas = [];
  if (!handleFieldChangeAdiaNuvem(modal)) problemas.push('handleFieldChange do modal não usa { adiarNuvem: true }');
  const linhas = onChangeGravandoPorTecla(modal);
  if (linhas.length) problemas.push(`updateTask( em onChange sem { adiarNuvem: true } nas linhas ${linhas.join(', ')}`);
  if (problemas.length) throw new Error(problemas.join('; '));
});

passo('Sem restos de teste', () => {
  const restos = [];
  if (existsSync(join(raiz, '.env.local'))) restos.push('.env.local presente');
  if (existsSync(join(raiz, 'public')) && readdirSync(join(raiz, 'public')).some((n) => n.startsWith('__teste'))) {
    restos.push('arquivo __teste em public/');
  }
  for (const f of fontes) {
    if (/__teste|__gravacoes|__uploads/.test(ler(f))) restos.push(relative(raiz, f));
  }
  if (restos.length) throw new Error(restos.join(', '));
});

/*
 * Build numa pasta temporária do sistema, apagada no fim. Em dist/ ele
 * sobrescreveria o build de quem estiver trabalhando e deixaria ali um build
 * com a nuvem ligada — que qualquer `vite preview` abriria contra a base de
 * produção.
 */
passo('Build de produção', () => {
  const pasta = mkdtempSync(join(tmpdir(), 'beewave-verificar-'));
  try {
    execFileSync('npx', ['vite', 'build', '--outDir', pasta, '--emptyOutDir'], { cwd: raiz, stdio: 'pipe' });
  } catch (err) {
    throw new Error(String(err.stderr || err.stdout || err.message).split('\n').slice(-12).join('\n'));
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
  return 'vite, em pasta temporária já apagada';
});

if (falhas.length) {
  console.error(`\n✗ ${falhas.length} verificação(ões) falharam:\n`);
  falhas.forEach((f) => console.error(`- ${f}\n`));
  process.exit(1);
}
console.log('\n✓ Tudo certo para seguir no ciclo de publicação.');
