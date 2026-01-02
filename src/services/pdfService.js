// src/services/pdfService.js
// High-quality single-page A4 PDF exporter using html2canvas + jsPDF.
// Produces PNG (lossless) image embed and can return Blob instead of auto-save.

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * exportPdf
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

  // Page size
  const pageWidthMm = pdf.internal.pageSize.getWidth();
  const pageHeightMm = pdf.internal.pageSize.getHeight();

  // ===============================
  // ⭐ ROOT FIX — FORCE A4 WIDTH
  // ===============================
  const originalStyle = {
    width: element.style.width,
    maxWidth: element.style.maxWidth,
    margin: element.style.margin,
  };

  element.style.width = "794px"; // A4 width @96dpi
  element.style.maxWidth = "none";
  element.style.margin = "0 auto";

  // ===============================
  // RENDER WITH html2canvas
  // ===============================
  const canvas = await html2canvas(element, {
    scale,
    backgroundColor,
    useCORS: true,
    logging: false,

    // ⭐ FIX GRADIENT TEXT (Agency / Name)
    onclone: (doc) => {
      doc.querySelectorAll(".bg-clip-text").forEach((el) => {
        el.classList.remove("bg-clip-text", "text-transparent");
        el.style.color = "#6d28d9"; // purple-700
        el.style.background = "none";
      });
    },
  });

  // ===============================
  // ⭐ RESTORE ORIGINAL STYLES
  // ===============================
  element.style.width = originalStyle.width;
  element.style.maxWidth = originalStyle.maxWidth;
  element.style.margin = originalStyle.margin;

  // ===============================
  // IMAGE → PDF
  // ===============================
  const outType = imageType.toLowerCase();
  const mime =
    outType === "jpeg" || outType === "jpg" ? "image/jpeg" : "image/png";

  const dataUrl =
    mime === "image/png"
      ? canvas.toDataURL("image/png")
      : canvas.toDataURL("image/jpeg", imageQuality);

  const imgWidthPx = canvas.width;
  const imgHeightPx = canvas.height;

  // inner page size (px)
  const innerWidthMm = pageWidthMm - margin * 2;
  const innerHeightMm = pageHeightMm - margin * 2;
  const pageWidthPx = Math.round((innerWidthMm * 96) / 25.4);

  // ⭐ MOBILE-SAFE SCALE (WIDTH FIRST)
  const finalScale = Math.min(pageWidthPx / imgWidthPx, 1);

  const finalWidthMm = (imgWidthPx * finalScale * 25.4) / 96;
  const finalHeightMm = (imgHeightPx * finalScale * 25.4) / 96;

  const x = margin;
  const y = margin + Math.max(0, (innerHeightMm - finalHeightMm) / 6);

  pdf.addImage(
    dataUrl,
    mime === "image/png" ? "PNG" : "JPEG",
    x,
    y,
    finalWidthMm,
    finalHeightMm
  );

  if (skipSave || returnBlob) {
    return pdf.output("blob");
  }

  pdf.save(fileName);
  return true;
}

export default {
  exportPdf,
};
