// src/services/pdfService.js
// High-quality single-page A4 PDF exporter using html2canvas + jsPDF.
// Produces PNG (lossless) image embed and can return Blob instead of auto-save.

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * exportPdf
 * Renders element to a single A4 page, high quality.
 *
 * options:
 *  - format: 'a4' (default)
 *  - unit: 'mm' (default)
 *  - orientation: 'portrait'|'landscape' (default 'portrait')
 *  - margin: number mm (default 8)
 *  - scale: html2canvas scale (default 3) — increase for sharper images (costs memory/time)
 *  - backgroundColor: canvas background (default '#ffffff')
 *  - imageType: 'png'|'jpeg' (default 'png')
 *  - imageQuality: number 0..1 (jpeg only)
 *  - skipSave: boolean (if true, don't call pdf.save; return Blob)
 *  - returnBlob: boolean (alias for skipSave)
 *
 * Returns:
 *  - If skipSave/returnBlob true => resolves to PDF Blob
 *  - Otherwise resolves to true (after saving file)
 */
export async function exportPdf(
  element,
  fileName = "document.pdf",
  options = {}
) {
  if (!element) throw new Error("exportPdf: element is required");

  const {
    format = "a4",
    unit = "mm",
    orientation = "portrait",
    margin = 8,
    scale = 3,
    backgroundColor = "#ffffff",
    imageType = "png",
    imageQuality = 0.95,
    skipSave = false,
    returnBlob = false,
  } = options || {};

  // Create PDF
  const pdf = new jsPDF({ unit, format, orientation });

  // Page size in mm
  const pageWidthMm = pdf.internal.pageSize.getWidth();
  const pageHeightMm = pdf.internal.pageSize.getHeight();

  // Render element with html2canvas
  const canvas = await html2canvas(element, {
    scale: scale,
    backgroundColor: backgroundColor,
    useCORS: true,
    logging: false,

    // ⭐⭐ ROOT FIX ⭐⭐
    onclone: (clonedDoc) => {
      // PDF ke liye gradient-text ko normal text bana do
      clonedDoc.querySelectorAll(".bg-clip-text").forEach((el) => {
        el.classList.remove("bg-clip-text", "text-transparent");
        el.style.color = "#6d28d9"; // purple-700

        el.style.background = "none";
      });
    },
  });

  // Prefer PNG for lossless quality; JPEG only if explicitly requested
  const outType = (imageType || "png").toLowerCase();
  const mime =
    outType === "jpeg" || outType === "jpg" ? "image/jpeg" : "image/png";
  const dataUrl =
    mime === "image/png"
      ? canvas.toDataURL("image/png")
      : canvas.toDataURL("image/jpeg", imageQuality);

  const imgWidthPx = canvas.width;
  const imgHeightPx = canvas.height;

  // Convert page inner area (minus margins) to px (approx 96 DPI)
  const innerWidthMm = pageWidthMm - 2 * margin;
  const innerHeightMm = pageHeightMm - 2 * margin;
  const pageWidthPx = Math.round((innerWidthMm * 96) / 25.4);
  const pageHeightPx = Math.round((innerHeightMm * 96) / 25.4);

  // Compute scale to fit entire canvas into one page
  const finalScale = Math.min(pageWidthPx / imgWidthPx, 1);

  // Calculate final dimensions in mm for pdf.addImage
  const finalWidthMm = (imgWidthPx * finalScale * 25.4) / 96;
  const finalHeightMm = (imgHeightPx * finalScale * 25.4) / 96;

  // center horizontally, top margin for vertical centering optional (we keep top margin)
  const x = margin;

  const y = margin + Math.max(0, (innerHeightMm - finalHeightMm) / 6); // small top offset for balance

  // Add image to PDF
  // jsPDF supports 'PNG' and 'JPEG'
  pdf.addImage(
    dataUrl,
    mime === "image/png" ? "PNG" : "JPEG",
    x,
    y,
    finalWidthMm,
    finalHeightMm
  );

  // If user requested Blob back (for opening in new tab / print), return Blob
  if (skipSave || returnBlob) {
    // return Blob for further handling
    const blob = pdf.output("blob");
    return blob;
  }

  // Otherwise save file and return true
  pdf.save(fileName);
  return true;
}

export default {
  exportPdf,
};
