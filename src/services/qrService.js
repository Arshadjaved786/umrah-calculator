// src/services/qrService.js
// Simple QR helper that returns a QR image URL (no extra npm required).
// We use goqr / qrserver public API to create QR images.
// data: string to encode, size: "200x200" etc.

export function buildQrUrl(data, size = "300x300") {
  const encoded = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encoded}&size=${size}&format=png`;
}

// returns an <a download> friendly data URL by fetching the image and converting to blob URL
export async function downloadQrAsPng(
  data,
  fileName = "qr.png",
  size = "400x400"
) {
  const url = buildQrUrl(data, size);
  const res = await fetch(url);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);

  // create anchor and click
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();

  // revoke later
  setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
}
