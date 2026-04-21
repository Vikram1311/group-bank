const REVOKE_DELAY_MS = 1000;

/**
 * Downloads CSV content as a UTF-8 file with BOM for spreadsheet compatibility.
 */
export function downloadCSV(content: string, filename: string) {
  const csvWithBom = `\ufeff${content}`;
  const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
