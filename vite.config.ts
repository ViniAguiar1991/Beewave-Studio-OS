import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// Identidade da publicação. Na Vercel é o id da publicação (o commit sozinho
// repetia a versão quando o mesmo commit era publicado de novo, e as abas
// velhas não percebiam); localmente, o horário do build.
// O app compara com /versao.json para saber quando recarregar (src/lib/atualizacao.ts).
const versaoDoApp =
  process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now());

export default defineConfig(() => {
  return {
    define: {
      __VERSAO_APP__: JSON.stringify(versaoDoApp),
    },
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'versao-do-app',
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: 'versao.json',
            source: JSON.stringify({ versao: versaoDoApp }),
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
