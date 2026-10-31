/**
 * Utility to print an HTML element cleanly in an isolated iframe.
 * This avoids issues where layout containers (like h-screen, overflow-hidden,
 * or modal backdrops) break standard browser window.print() pagination and preview.
 */
export function printElement(element: HTMLElement, title: string = "Document") {
  if (typeof window === "undefined") return;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  // Gather all style and stylesheet tags from the current document
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((el) => el.outerHTML)
    .join("\n");

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        ${styles}
        <style>
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          html, body {
            background-color: #ffffff !important;
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            -webkit-font-smoothing: antialiased;
          }
          .avoid-break, tr, .avoid-page-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          #quotation-printable-area, .quotation-print-body {
            display: block !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 16px !important;
            padding: 24px 28px !important;
            background: #ffffff !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          table {
            border-collapse: collapse !important;
          }
          img {
            max-width: 100%;
          }
        </style>
      </head>
      <body>
        ${element.outerHTML}
      </body>
    </html>
  `);
  doc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("Failed to print iframe:", e);
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }
  };

  // Ensure all images are fully loaded before opening print preview dialog
  const images = Array.from(doc.images || []);
  if (images.length > 0) {
    const promises = images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    });
    Promise.all(promises).then(() => {
      setTimeout(triggerPrint, 200);
    });
  } else {
    setTimeout(triggerPrint, 250);
  }
}
