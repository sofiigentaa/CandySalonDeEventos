/**
 * Utility for robust, high-fidelity printing and report exports
 * Works seamlessly across iframes, sandboxes, mobile, and desktop browsers
 * without triggering cross-origin or $$typeof security errors.
 */

/**
 * Print an HTML element directly using an isolated, same-origin hidden iframe.
 * This triggers the browser's native print / Save-to-PDF dialog cleanly
 * without opening popups or untrusted cross-origin tabs.
 */
export function printDocument(elementId?: string, title: string = 'Documento - Candy Salón'): boolean {
  try {
    if (!elementId) {
      window.print();
      return true;
    }

    const element = document.getElementById(elementId);
    if (!element) {
      window.print();
      return true;
    }

    const htmlContent = generatePrintableHtml(element.innerHTML, title);
    return printViaHiddenIframe(htmlContent);
  } catch (err) {
    console.warn('printDocument encountered an issue, falling back to window.print:', err);
    try {
      window.print();
    } catch {
      // Ignore fallback failure
    }
    return false;
  }
}

/**
 * Creates a clean offscreen iframe in the current document to trigger print dialog safely.
 * Positioned offscreen (not visibility:hidden or 0x0) so browser engines correctly compute layout and launch the print dialog.
 */
function printViaHiddenIframe(htmlContent: string): boolean {
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '1024px';
    iframe.style.height = '768px';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.setAttribute('aria-hidden', 'true');

    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc || !iframe.contentWindow) {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
      window.focus();
      window.print();
      return false;
    }

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    const cleanup = () => {
      setTimeout(() => {
        try {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        } catch {
          // Ignore
        }
      }, 2500);
    };

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (printErr) {
        console.warn('Iframe print failed, falling back to window.print:', printErr);
        window.focus();
        window.print();
      } finally {
        cleanup();
      }
    }, 280);

    return true;
  } catch (err) {
    console.warn('Failed to print via hidden iframe:', err);
    try {
      window.focus();
      window.print();
    } catch {
      // Ignore
    }
    return false;
  }
}

/**
 * Print or export an element. Supports both direct printing and safe new tab.
 */
export function openPrintWindowFromElement(elementId: string, title: string = 'Documento - Candy Salón'): boolean {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      window.print();
      return true;
    }

    const htmlContent = generatePrintableHtml(element.innerHTML, title);
    // Print directly with maximum fidelity and security
    return printViaHiddenIframe(htmlContent);
  } catch (err) {
    console.error('Failed to open print:', err);
    try {
      window.print();
    } catch {
      // Ignore
    }
    return false;
  }
}

/**
 * Safe helper to open print window or fallback to direct printing
 */
export function openPrintWindow(bodyHtml: string, title: string = 'Documento - Candy Salón'): boolean {
  try {
    return printViaHiddenIframe(bodyHtml);
  } catch (err) {
    console.error('Error in openPrintWindow:', err);
    window.print();
    return false;
  }
}

/**
 * Generates an elegant, printable HTML document styled for Candy Salón de Eventos.
 */
export function generatePrintableHtml(innerHtml: string, title: string = 'Documento - Candy Salón'): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const styles = typeof document !== 'undefined'
    ? Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map((node) => node.outerHTML)
        .join('\n')
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <base href="${origin}/" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${styles}
  <style>
    @page {
      margin: 10mm 8mm;
      size: auto;
    }
    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      box-sizing: border-box;
    }
    body {
      background: #ffffff !important;
      color: #0f172a !important;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 16px;
      line-height: 1.4;
    }
    .print\\:hidden, .no-print {
      display: none !important;
    }
    .print-container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
      }
      .print-container {
        border: none !important;
        box-shadow: none !important;
        max-width: 100% !important;
        margin: 0 !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-container">
    ${innerHtml}
  </div>
</body>
</html>`;
}

export function downloadHtmlReport(htmlContent: string, fileName: string = 'Reporte_CandySalon.html') {
  try {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error downloading HTML report:', err);
  }
}
