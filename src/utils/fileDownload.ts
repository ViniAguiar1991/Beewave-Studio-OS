/**
 * Single-file downloader for original uncompressed assets.
 * Downloads one by one without zip, preserving original file name and format.
 */

export function downloadTaskFile(file: {
  name: string;
  dataUrl?: string;
  url?: string;
}) {
  if (!file) return;

  const fileName = file.name || 'arquivo_original';

  if (file.dataUrl && file.dataUrl.startsWith('data:')) {
    // Convert base64 dataUrl to Blob for clean, high-performance browser download
    try {
      const parts = file.dataUrl.split(';base64,');
      const contentType = parts[0].split(':')[1] || 'application/octet-stream';
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);

      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }

      const blob = new Blob([uInt8Array], { type: contentType });
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      return;
    } catch (err) {
      console.warn('Blob download error, falling back to direct anchor:', err);
      const link = document.createElement('a');
      link.href = file.dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
  }

  if (file.url) {
    const link = document.createElement('a');
    link.href = file.url;
    link.target = '_blank';
    link.download = fileName;
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
