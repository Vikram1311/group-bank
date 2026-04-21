// Delay URL cleanup so slow devices finish starting the download first.
const REVOKE_DELAY_MS = 2000;

/**
 * Downloads CSV content as a UTF-8 file with BOM for spreadsheet compatibility.
 *
 * Strategy:
 *  - iOS Safari: the `download` attribute on blob: URLs is not supported, so
 *    we encode the content as a data: URI and open it in a new tab.  The user
 *    can then save the file via the iOS share sheet ("Save to Files").
 *  - All other browsers: blob URL + programmatic anchor click (standard approach).
 *  - Fallback: if the blob approach throws for any reason, we fall back to the
 *    data: URI approach so the user at least sees the content.
 *
 * @param content  CSV text (must not be empty)
 * @param filename Suggested filename for the download
 */
export function downloadCSV(content: string, filename: string) {
  if (!content) return;

  const csvWithBom = '\ufeff' + content;

  // iOS Safari does not honour the `download` attribute on blob: URLs.
  // iPadOS 13+ reports as "Macintosh" but still can't download blobs — detect it
  // via the presence of touch support alongside a Mac UA string.
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes('Mac') && 'ontouchend' in document);
  if (isIOS) {
    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvWithBom);
    window.open(dataUri, '_blank');
    return;
  }

  try {
    const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.setAttribute('href', url);
    anchor.setAttribute('download', filename);
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore cleanup errors
      }
    }, REVOKE_DELAY_MS);
  } catch {
    // Fallback for any browser that can't handle blob: URLs — open in new tab.
    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvWithBom);
    window.open(dataUri, '_blank');
  }
}
