/**
 * Compresses an image File using HTML5 Canvas to a lightweight, high-quality Data URL.
 * Prevents LocalStorage QuotaExceededError and Firestore 1MB document limit issues.
 */
export async function compressImage(
  file: File,
  maxWidth = 1080,
  maxHeight = 1080,
  quality = 0.72,
  /**
   * Mantém o fundo transparente e exporta PNG.
   *
   * O caminho padrão pinta branco e salva em JPEG, que não tem canal alfa —
   * ótimo para foto, péssimo para recorte. Um mascote PNG salvo assim ganhava
   * um retângulo branco atrás.
   */
  preserveTransparency = false
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Erro ao ler o arquivo de imagem'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Erro ao processar a imagem'));
        img.onload = () => {
          try {
            let { width, height } = img;

            // Calculate aspect-ratio preserved dimensions
            if (width > maxWidth || height > maxHeight) {
              const ratio = Math.min(maxWidth / width, maxHeight / height);
              width = Math.round(width * ratio);
              height = Math.round(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, width);
            canvas.height = Math.max(1, height);

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              // Fallback to original result if canvas context is unavailable
              resolve(e.target?.result as string);
              return;
            }

            if (!preserveTransparency) {
              // Fundo branco para o JPEG, que não guarda transparência.
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, width, height);
            }

            // Clean rendering
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            let compressedDataUrl = preserveTransparency
              ? canvas.toDataURL('image/png')
              : canvas.toDataURL('image/jpeg', quality);

            // If image is still larger than 120KB (~160,000 base64 chars), do a fast second-pass reduction
            if (compressedDataUrl.length > 160000) {
              const secondWidth = Math.round(width * 0.75);
              const secondHeight = Math.round(height * 0.75);
              const canvas2 = document.createElement('canvas');
              canvas2.width = Math.max(1, secondWidth);
              canvas2.height = Math.max(1, secondHeight);
              const ctx2 = canvas2.getContext('2d');
              if (ctx2) {
                if (!preserveTransparency) {
                  ctx2.fillStyle = '#ffffff';
                  ctx2.fillRect(0, 0, secondWidth, secondHeight);
                }
                ctx2.drawImage(img, 0, 0, secondWidth, secondHeight);
                compressedDataUrl = preserveTransparency
                  ? canvas2.toDataURL('image/png')
                  : canvas2.toDataURL('image/jpeg', 0.6);
              }
            }

            resolve(compressedDataUrl);
          } catch (err) {
            console.error('Error during canvas compression:', err);
            resolve(e.target?.result as string);
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      reject(err);
    }
  });
}

