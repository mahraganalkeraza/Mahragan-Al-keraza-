/**
 * Standard browser-native file download helper.
 * Completely eliminates commonjs/esm bundling issues with file-saver.
 */
export const downloadBlob = (blob: Blob, fileName: string): void => {
  if (typeof window === 'undefined') return;
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 1000);
};

export const downloadDataUrl = (dataUrl: string, fileName: string): void => {
  if (typeof window === 'undefined') return;
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
