"use client";

import QRCode from "qrcode";

interface Props {
  url: string;
  slug: string;
}

/**
 * High-resolution QR export (2048px PNG) with Cyber Wars color treatment.
 * Error correction "H" keeps the code scannable even with high contrast ink.
 */
export default function QrButton({ url, slug }: Props) {
  async function download() {
    const dataUrl = await QRCode.toDataURL(url, {
      width: 2048,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#00F0FF", light: "#05050A" },
    });

    // Also emit a print-safe pure black/white variant for physical chips.
    const printSafe = await QRCode.toDataURL(url, {
      width: 2048,
      margin: 4,
      errorCorrectionLevel: "H",
      color: { dark: "#000000", light: "#FFFFFF" },
    });

    triggerDownload(dataUrl, `qr-${slug}-neon-2048.png`);
    setTimeout(() => triggerDownload(printSafe, `qr-${slug}-print-2048.png`), 400);
  }

  function triggerDownload(href: string, filename: string) {
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <button className="btn-neon" onClick={() => void download()} title={url}>
      QR Download
    </button>
  );
}
