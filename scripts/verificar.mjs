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
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
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
  const chamadas = /\b(setDoc|getDoc|getDocs|onSnapshot|writeBatch|deleteDoc|updateDoc|addDoc|getCountFromServer|uploadBytes|uploadBytesResumable|getDownloadURL|deleteObject)\s*\(/;
  const fora = fontes
    .map((f) => relative(raiz, f))
    .filter((f) => !MODULOS_DE_NUVEM.includes(f))
    .filter((f) => chamadas.test(ler(join(raiz, f))));
  if (fora.length) throw new Error(`chamada ao Firestore/Storage fora dos módulos de nuvem: ${fora.join(', ')}`);
});

passo('Gravações passam pelo rastreador', () => {
  const texto = ler(join(raiz, 'src/services/firestoreSync.ts'));
  const soltas = texto
    .split('\n')
    .map((l, i) => [i + 1, l])
    .filter(([, l]) => /(^|[^.\w])(setDoc|deleteDoc)\s*\(/.test(l) && !/rastrearEnvio|const (gravar|apagar)/.test(l));
  if (soltas.length) throw new Error(`setDoc/deleteDoc sem rastreador em firestoreSync.ts nas linhas ${soltas.map(([n]) => n).join(', ')}`);
});

passo('Campos de texto do modal não gravam por tecla', () => {
  const modal = ler(join(raiz, 'src/components/TaskWorkflowModal.tsx'));
  const bloco = modal.match(/const handleFieldChange = [\s\S]*?\n  };/);
  if (!bloco || !/adiarNuvem:\s*true/.test(bloco[0])) {
    throw new Error('handleFieldChange do modal não usa { adiarNuvem: true }');
  }
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

passo('Build de produção', () => {
  try {
    execSync('npx vite build', { cwd: raiz, stdio: 'pipe' });
  } catch (err) {
    throw new Error(String(err.stderr || err.stdout || err.message).split('\n').slice(-12).join('\n'));
  }
  return 'vite';
});

if (falhas.length) {
  console.error(`\n✗ ${falhas.length} verificação(ões) falharam:\n`);
  falhas.forEach((f) => console.error(`- ${f}\n`));
  process.exit(1);
}
console.log('\n✓ Tudo certo para seguir no ciclo de publicação.');
