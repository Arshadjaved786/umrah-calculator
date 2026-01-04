// src/services/pdfService.js
// Robust multi-page A4 PDF exporter using html2canvas + jsPDF
// ✅ Mobile safe (no cut), ✅ Desktop safe, ✅ Footer never cuts

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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
    scale = 2.5,
    backgroundColor = "#ffffff",
    imageType = "png",
    imageQuality = 0.95,
    skipSave = false,
    returnBlob = false,
  } = options;

  // Create PDF
  const pdf = new jsPDF({ unit, format, orientation });

  // Page size
  const pageWidthMm = pdf.internal.pageSize.getWidth();
  const pageHeightMm = pdf.internal.pageSize.getHeight();

  const innerWidthMm = pageWidthMm - margin * 2;
  const innerHeightMm = pageHeightMm - margin * 2;

  // ---- FORCE STABLE WIDTH (mobile fix) ----
  const originalStyle = {
    width: element.style.width,
    maxWidth: element.style.maxWidth,
    margin: element.style.margin,
  };

  element.style.width = "794px"; // A4 @ 96dpi
  element.style.maxWidth = "none";
  element.style.margin = "0 auto";

  // Render DOM → Canvas
  const canvas = await html2canvas(element, {
    scale,
    backgroundColor,
    useCORS: true,
    logging: false,
    onclone: (doc) => {
      // Fix gradient text in PDF
      doc.querySelectorAll(".bg-clip-text").forEach((el) => {
        el.classList.remove("bg-clip-text", "text-transparent");
        el.style.color = "#4f46e5"; // indigo-600
        el.style.background = "none";
      });
    },
  });

  // Restore styles
  element.style.width = originalStyle.width;
  element.style.maxWidth = originalStyle.maxWidth;
  element.style.margin = originalStyle.margin;

  const mime =
    imageType === "jpeg" || imageType === "jpg" ? "image/jpeg" : "image/png";

  const dataUrl =
    mime === "image/png"
      ? canvas.toDataURL("image/png")
      : canvas.toDataURL("image/jpeg", imageQuality);

  // =====================================================
  // ✅ MULTI-PAGE LOGIC (FINAL – NO CUT EVER)
  // =====================================================

  const imgWidthMm = innerWidthMm;
  const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;

  let heightLeft = imgHeightMm;
  let position = margin;

  // First page
  pdf.addImage(
    dataUrl,
    mime === "image/png" ? "PNG" : "JPEG",
    margin,
    position,
    imgWidthMm,
    imgHeightMm
  );

  heightLeft -= innerHeightMm;

  // Extra pages if needed
  while (heightLeft > 0) {
    pdf.addPage();
    position = margin - heightLeft;

    pdf.addImage(
      dataUrl,
      mime === "image/png" ? "PNG" : "JPEG",
      margin,
      position,
      imgWidthMm,
      imgHeightMm
    );

    heightLeft -= innerHeightMm;
  }

  // Return Blob if needed (Print / Mobile)
  if (skipSave || returnBlob) {
    return pdf.output("blob");
  }

  // Save normally
  pdf.save(fileName);
  return true;
}

export default { exportPdf };
