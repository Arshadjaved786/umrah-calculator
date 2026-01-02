// src/components/SavedPackages.jsx
import React, { useState, useRef } from "react";
import { exportPdf } from "../services/pdfService";
import Footer from "./Footer";

function addDaysIso(iso, n) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
const sumCity = (segs, city) =>
  segs
    .filter((s) => s.type === "stay" && s.city === city)
    .reduce((a, s) => a + Number(s.countedDays || 0), 0);

const sumWeekend = (segs, city) =>
  segs
    .filter((s) => s.type === "stay" && s.city === city)
    .reduce(
      (a, s) => a + (Array.isArray(s.weekendDates) ? s.weekendDates.length : 0),
      0
    );

/**
 * SavedPackages
 *
 * Props:
 * - packages: array of saved package snapshots
 * - setPackages: setter to update packages (delete etc.)
 *
 * Features:
 * - List packages (compact)
 * - Show / Hide Details per package (in-list)
 * - Preview modal (full package) with Export PDF button
 * - Delete package (with confirm)
 *
 * Simple, readable UI using Tailwind (matches app style)
 */

function fmtSAR(n) {
  try {
    return Number(n || 0).toLocaleString();
  } catch {
    return n;
  }
}

export default function SavedPackages({ packages = [], setPackages }) {
  console.log("📦 SavedPackages packages prop", packages);

  const [expanded, setExpanded] = useState({}); // { [id]: true }
  const [previewPkg, setPreviewPkg] = useState(null); // package being previewed
  const previewRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  function toggleExpand(id) {
    setExpanded((s) => ({ ...s, [id]: !s[id] }));
  }

  function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this package?")) return;
    const next = (packages || []).filter((p) => p.id !== id);
    setPackages(next);
  }

  function openPreview(pkg) {
    setPreviewPkg(pkg);
    // small delay to let modal render before any further action (not required but safe)
    setTimeout(() => {
      if (previewRef.current) {
        // noop
      }
    }, 50);
  }

  async function handleExportPdf(pkg) {
    if (!previewRef.current) {
      alert("Preview not ready for export.");
      return;
    }
    try {
      setExporting(true);
      const fileName = `${pkg.id || "package"}.pdf`;
      await exportPdf(previewRef.current, fileName, { format: "a4", scale: 2 });
      setExporting(false);
    } catch (err) {
      console.error("Export PDF failed:", err);
      setExporting(false);
      alert("Export failed. See console for details.");
    }
  }
  async function handlePrint(pkg) {
    // ensure preview DOM exists; if not, open preview then retry
    if (!previewRef.current) {
      openPreview(pkg);
      // wait a short moment for modal to render then retry
      setTimeout(() => {
        handlePrint(pkg);
      }, 300);
      return;
    }

    try {
      const blob = await exportPdf(
        previewRef.current,
        `${pkg.id || "package"}.pdf`,
        {
          format: "a4",
          scale: 3,
          forceSinglePage: true,
          skipSave: true,
        }
      );

      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank");
      if (!w) {
        alert("Popup blocked — allow popups.");
        return;
      }

      w.focus();
      setTimeout(() => {
        try {
          w.print();
        } catch {}
      }, 600);
    } catch (err) {
      console.error("Print failed", err);
      alert("Print failed.");
    }
  }

  // Render a compact itinerary snippet (safe fallback)
  function renderItinerarySnippet(itinerary) {
    if (!itinerary)
      return <div className="text-xs text-gray-500">No itinerary</div>;
    // Use segments or adjustedSegments
    const segs = itinerary.adjustedSegments || [];

    return (
      <div className="text-sm text-gray-700 space-y-1">
        {segs.slice(0, 4).map((s, idx) => {
          if (s.type === "travel")
            return (
              <div key={idx} className="text-xs text-gray-600">
                Travel: {s.date?.human || s.date || s.iso}
              </div>
            );
          return (
            <div key={idx} className="text-xs">
              <b className="capitalize">{s.city}</b>{" "}
              <span className="text-gray-600">— {s.countedDays} nights</span>
            </div>
          );
        })}
        {segs.length > 4 && (
          <div className="text-xs text-gray-500">...more</div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4 max-w-4xl mx-auto px-3">
      {(!packages || packages.length === 0) && (
        <div className="text-gray-500 text-sm">No packages saved yet.</div>
      )}

      {(packages || []).map((pkg) => (
        <div
          key={pkg.id}
          className="
    p-4 rounded-xl
    bg-gradient-to-r from-indigo-50 via-white to-sky-50
    border border-indigo-100
    shadow-sm
    flex flex-col md:flex-row md:items-center md:justify-between
    gap-3 w-full max-w-full overflow-hidden
    text-center
  "
        >
          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-4">
              <div>
                <div className="font-medium text-sm">
                  {Number(
                    pkg.itinerary?.adjustedStays
                      ? pkg.itinerary.adjustedStays.reduce(
                          (sum, s) => sum + Number(s.countedDays || 0),
                          0
                        )
                      : 0
                  )}{" "}
                  Days Package —{" "}
                  {pkg.createdAt
                    ? new Date(pkg.createdAt).toLocaleString()
                    : pkg.id}
                </div>

                {/* NEW — Perfect Layout: Per Person + Totals (PKR Bold) */}
                <div className="text-center text-xs mt-2 px-1">
                  {/* Per Person Line */}
                  <div className="mb-1 font-medium flex flex-col sm:flex-row flex-wrap sm:items-center sm:justify-center gap-1 sm:gap-4">
                    Per Person:
                    <span className="ml-3 font-bold">
                      PKR{" "}
                      {fmtSAR(
                        pkg.perPersonTotal
                          ? Math.round(
                              (Number(pkg.perPersonTotal) *
                                (pkg.totals?.PKR || 0)) /
                                (pkg.totals?.SAR ||
                                  Number(pkg.perPersonTotal) ||
                                  1)
                            )
                          : pkg.totals?.PKR
                          ? Math.round(
                              pkg.totals.PKR / Math.max(1, pkg.pax || 1)
                            )
                          : 0
                      )}
                    </span>
                    <span className="ml-4">
                      SAR{" "}
                      {fmtSAR(
                        pkg.perPersonTotal ??
                          (pkg.totals?.SAR
                            ? Math.round(
                                pkg.totals.SAR / Math.max(1, pkg.pax || 1)
                              )
                            : 0)
                      )}
                    </span>
                    <span className="ml-4">
                      USD{" "}
                      {(pkg.perPersonTotal
                        ? (Number(pkg.perPersonTotal) *
                            Number(pkg.totals?.USD || 0)) /
                          Number(
                            pkg.totals?.SAR || Number(pkg.perPersonTotal) || 1
                          )
                        : Number(pkg.totals?.USD || 0) /
                          Math.max(1, pkg.pax || 1)
                      ).toFixed(2)}
                    </span>
                  </div>

                  {/* Pax + Totals Line */}
                  <div className="mt-1 font-medium flex flex-col sm:flex-row sm:items-center sm:justify-center gap-1 sm:gap-0">
                    Pax {pkg.pax || 1} &nbsp;&nbsp; | &nbsp;&nbsp; Totals:
                    <span className="ml-3 font-bold">
                      PKR {fmtSAR(pkg.totals?.PKR || 0)}
                    </span>
                    <span className="ml-4">
                      SAR {fmtSAR(pkg.totals?.SAR || 0)}
                    </span>
                    <span className="ml-4">
                      USD {(pkg.totals?.USD || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* compact details (collapsible) */}
                <div className="mt-3">
                  <button
                    onClick={() => toggleExpand(pkg.id)}
                    className="text-xs text-indigo-600 hover:underline"
                    type="button"
                  >
                    {expanded[pkg.id] ? "Hide details" : "Show details"}
                  </button>

                  {expanded[pkg.id] && (
                    <div className="mt-2 p-3 bg-gray-50 rounded text-sm text-gray-700 space-y-4">
                      {/* Agency */}
                      {pkg.agency && (
                        <div>
                          <div className="text-xs text-gray-500">Agency</div>
                          <div className="text-lg font-extrabold text-center bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                            {pkg.agency.name || "No name"}
                          </div>

                          <div className="text-xs text-gray-500">
                            {pkg.agency.email || ""}
                          </div>
                          {pkg.agency.address && (
                            <div className="text-xs text-gray-500">
                              {pkg.agency.address}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Hotels (Full Detail - Price hidden, Weekend nights visible) */}
                      <div>
                        <div className="flex items-center justify-center gap-2 text-sm font-extrabold text-indigo-700 mb-2">
                          <span className="text-xl">🏨</span>
                          <span>Hotels</span>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 mt-3 bg-gradient-to-r from-gray-50 via-white to-gray-50 p-3 rounded-xl">
                          {/* Makkah */}
                          <div
                            className="
    p-3 rounded-xl
    bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50
    border border-amber-200
    shadow-sm
    text-center
  "
                          >
                            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-amber-700">
                              <span className="text-2xl">🕋</span>
                              <span>Makkah</span>
                            </div>

                            <div className="font-medium">
                              {pkg.hotelsSelected?.makkah?.name || "-"}
                            </div>

                            {pkg.itinerary?.adjustedSegments &&
                              (() => {
                                const segs = pkg.itinerary.adjustedSegments;
                                return (
                                  <>
                                    <div className="text-xs text-gray-600">
                                      Nights: {sumCity(segs, "makkah")}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      Weekend nights:{" "}
                                      {sumWeekend(segs, "makkah")}
                                    </div>
                                  </>
                                );
                              })()}
                          </div>

                          {/* Madinah */}
                          <div
                            className="
    p-3 rounded-xl
    bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50
    border border-emerald-200
    shadow-sm
    text-center
  "
                          >
                            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700">
                              <span className="text-2xl">🕌</span>
                              <span>Madinah</span>
                            </div>

                            <div className="font-medium">
                              {pkg.hotelsSelected?.madinah?.name || "-"}
                            </div>

                            {pkg.itinerary?.adjustedSegments &&
                              (() => {
                                const segs = pkg.itinerary.adjustedSegments;
                                return (
                                  <>
                                    <div className="text-xs text-gray-600">
                                      Nights: {sumCity(segs, "madinah")}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      Weekend nights:{" "}
                                      {sumWeekend(segs, "madinah")}
                                    </div>
                                  </>
                                );
                              })()}
                          </div>
                        </div>
                      </div>

                      {/* Full Itinerary (same style as Preview page) */}
                      <div>
                        <div className="flex items-center justify-center gap-2 mb-2 text-sm font-extrabold text-indigo-700">
                          <span className="text-xl">🗺️</span>
                          <span>Itinerary</span>
                        </div>

                        <div className="mt-2 space-y-3">
                          {(pkg.itinerary?.adjustedSegments || []).map(
                            (s, i) => {
                              // Travel Segment
                              if (s.type === "travel") {
                                return (
                                  <div
                                    key={i}
                                    className="
    p-3 rounded-xl
    bg-gradient-to-r from-sky-100 via-cyan-100 to-emerald-100
    border border-cyan-200
    text-sm
    text-center
    shadow-sm
  "
                                  >
                                    <div className="font-semibold">
                                      Travel Day
                                    </div>
                                    <div className="text-xs text-gray-700">
                                      {s.date?.human || s.date || s.iso}
                                    </div>
                                  </div>
                                );
                              }

                              // Stay Segment
                              return (
                                <div
                                  key={i}
                                  className="p-3 bg-white rounded border"
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <div className="font-semibold capitalize">
                                        {s.city}
                                      </div>
                                    </div>

                                    <div className="text-xs text-right text-gray-700">
                                      <div>
                                        Check-in:{" "}
                                        <span className="font-medium">
                                          {s.countedCheckInIso || "-"}
                                        </span>
                                      </div>
                                      <div>
                                        Check-out:{" "}
                                        <span className="font-medium">
                                          {s.countedLastNightIso
                                            ? addDaysIso(
                                                s.countedLastNightIso,
                                                1
                                              )
                                            : "-"}
                                        </span>
                                      </div>

                                      <div className="mt-1 text-gray-600">
                                        Nights (counted): {s.countedDays ?? "-"}
                                      </div>
                                    </div>
                                  </div>

                                  {/* counted + weekend */}
                                  {(s.countedCheckInIso ||
                                    s.countedLastNightIso) && (
                                    <div className="mt-2 bg-gray-50 p-2 rounded border text-xs">
                                      <div>
                                        Counted check-in:{" "}
                                        <span className="font-medium">
                                          {s.countedCheckInIso || "-"}
                                        </span>
                                      </div>
                                      <div>
                                        Counted last-night:{" "}
                                        <span className="font-medium">
                                          {s.countedLastNightIso || "-"}
                                        </span>
                                      </div>

                                      {s.weekendDates?.length > 0 && (
                                        <div className="mt-1 text-gray-600">
                                          Weekend nights:{" "}
                                          {s.weekendDates.join(", ")}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>

                      {/* Transport, Visa & Ticket */}
                      <div className="grid md:grid-cols-3 gap-3 text-sm">
                        <div className="p-3 bg-white rounded border">
                          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-indigo-700">
                            <span className="text-xl">🚌</span>
                            <span>Transport</span>
                          </div>

                          <div className="font-medium">
                            {pkg.transport?.vehicle || pkg.vehicle || "—"}
                          </div>
                          {/* optional small note */}
                          <div className="text-xs text-gray-500">
                            Selected vehicle
                          </div>
                        </div>

                        <div className="p-3 bg-white rounded border">
                          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700">
                            <span className="text-xl">🛂</span>
                            <span>Visa</span>
                          </div>

                          <div className="font-medium">e-visa</div>
                        </div>

                        <div className="p-3 bg-white rounded border">
                          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-amber-700">
                            <span className="text-xl">✈️</span>
                            <span>Ticket</span>
                          </div>

                          <div className="font-medium">
                            {pkg.flights?.selectedAirline?.name ||
                              pkg.flights?.airline?.name ||
                              pkg.selectedAirline?.name ||
                              pkg.flights?.airline ||
                              "—"}
                          </div>
                          <div className="text-xs text-gray-500">
                            Selected airline
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-center flex-wrap gap-3 mt-3">
                <button
                  onClick={() => openPreview(pkg)}
                  className="
  px-4 py-2 text-sm rounded-lg
  bg-gradient-to-r from-indigo-600 to-blue-600
  text-white shadow hover:opacity-95
  w-full sm:w-auto
"
                >
                  Preview
                </button>

                <button
                  onClick={() => {
                    // export quick PDF using a small inline preview creation
                    openPreview(pkg);
                    // wait a moment and then export (modal will open)
                    setTimeout(() => {
                      if (previewRef.current) {
                        handleExportPdf(pkg);
                      } else {
                        // fallback: try once more later
                        setTimeout(() => {
                          if (previewRef.current) handleExportPdf(pkg);
                        }, 200);
                      }
                    }, 250);
                  }}
                  className="
  px-4 py-2 text-sm rounded-lg
  bg-gradient-to-r from-emerald-600 to-teal-600
  text-white shadow hover:opacity-95
  w-full sm:w-auto
"
                >
                  Export PDF
                </button>

                <button
                  onClick={() => handleDelete(pkg.id)}
                  className="
  px-4 py-2 text-sm rounded-lg
  bg-gradient-to-r from-rose-600 to-red-600
  text-white shadow hover:opacity-95
  w-full sm:w-auto
"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* small separator */}
          </div>
        </div>
      ))}

      {/* Preview Modal */}
      {previewPkg && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-6 bg-black/40"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white max-w-4xl w-full mx-auto rounded shadow-lg overflow-auto px-2 sm:px-0"
            style={{ maxHeight: "90vh" }}
          >
            {/* Header */}
            <div
              className="
    flex items-center justify-between p-4
    bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-600
    text-white
  "
            >
              <div className="text-lg font-semibold tracking-wide">
                Package Preview
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                {/* Export PDF */}
                <button
                  onClick={() => handleExportPdf(previewPkg)}
                  disabled={exporting}
                  className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg text-sm font-semibold shadow hover:opacity-90"
                >
                  {exporting ? "Exporting..." : "Export PDF"}
                </button>

                {/* Print Button (NEW) */}
                <button
                  onClick={() => handlePrint(previewPkg)}
                  className="px-4 py-1.5 bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-lg text-sm font-semibold shadow hover:opacity-90"
                >
                  Print
                </button>

                {/* Close */}
                <button
                  onClick={() => setPreviewPkg(null)}
                  className="px-4 py-1.5 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium shadow hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Content to render & export */}
            <div className="p-6" ref={previewRef}>
              {/* Top: Agency + Meta (updated) */}
              <div className="flex items-start justify-between gap-6">
                {/* Logo */}
                <div className="w-20 h-20 rounded flex items-center justify-center overflow-hidden bg-white border">
                  {previewPkg.agency?.logo ? (
                    <img
                      src={previewPkg.agency.logo}
                      alt="Agency Logo"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-gray-400">Logo</span>
                  )}
                </div>

                {/* Center Agency */}
                <div className="flex-1 text-center">
                  <div
                    className="
      text-2xl font-extrabold text-center
      bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600
      bg-clip-text text-transparent
    "
                  >
                    {previewPkg.agency?.name || "Agency"}
                  </div>

                  <div className="text-sm text-gray-600 mt-1">
                    {previewPkg.agency?.email || ""}
                    {previewPkg.agency?.phone
                      ? ` • ${previewPkg.agency.phone}`
                      : ""}
                  </div>
                </div>

                {/* Only Created Date — Package ID Removed */}
                <div className="text-sm text-right text-gray-600">
                  <div>Created:</div>
                  <div className="font-mono text-xs">
                    {previewPkg.createdAt
                      ? new Date(previewPkg.createdAt).toLocaleDateString()
                      : "-"}
                  </div>
                </div>
              </div>

              {/* Summary (preview modal) — updated layout: Per Person (PKR bold), Pax + Totals same row */}
              <div
                className="
    mt-8 p-6
    rounded-2xl
    bg-gradient-to-br from-indigo-50 via-white to-sky-50
    border border-indigo-200
    shadow-md
  "
              >
                <h3 className="text-center text-xl font-extrabold text-indigo-700 mb-4 tracking-wide">
                  {Number(
                    previewPkg.itinerary?.adjustedStays
                      ? previewPkg.itinerary.adjustedStays.reduce(
                          (sum, s) => sum + Number(s.countedDays || 0),
                          0
                        )
                      : 0
                  )}{" "}
                  Days Package Summary
                </h3>

                <div className="max-w-[820px] mx-auto text-center">
                  {/* Per Person — PKR bold → SAR → USD */}
                  <div className="mb-3">
                    <div className="text-xs text-gray-500">Per Person</div>

                    <div className="mt-1 flex flex-col sm:flex-row sm:items-baseline justify-center gap-2 sm:gap-6">
                      {/* PKR BOLD */}
                      <span className="text-xl font-extrabold text-gray-900">
                        PKR{" "}
                        {fmtSAR(
                          previewPkg.perPersonTotal
                            ? Math.round(
                                (Number(previewPkg.perPersonTotal) *
                                  (previewPkg.totals?.PKR || 0)) /
                                  (previewPkg.totals?.SAR ||
                                    Number(previewPkg.perPersonTotal) ||
                                    1)
                              )
                            : previewPkg.totals?.PKR
                            ? Math.round(
                                Number(previewPkg.totals.PKR) /
                                  Math.max(1, Number(previewPkg.pax || 1))
                              )
                            : 0
                        )}
                      </span>

                      {/* SAR normal */}
                      <span className="text-lg text-gray-700">
                        SAR{" "}
                        {fmtSAR(
                          Number(
                            previewPkg.perPersonTotal ??
                              (previewPkg.totals?.SAR
                                ? Math.round(
                                    Number(previewPkg.totals.SAR) /
                                      Math.max(1, Number(previewPkg.pax || 1))
                                  )
                                : 0)
                          )
                        )}
                      </span>

                      {/* USD normal */}
                      <span className="text-lg text-gray-700">
                        USD{" "}
                        {(previewPkg.perPersonTotal
                          ? (Number(previewPkg.perPersonTotal) *
                              Number(previewPkg.totals?.USD || 0)) /
                            Number(
                              previewPkg.totals?.SAR ||
                                Number(previewPkg.perPersonTotal) ||
                                1
                            )
                          : Number(previewPkg.totals?.USD || 0) /
                            Math.max(1, Number(previewPkg.pax || 1))
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Pax + Totals in SAME ROW */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-12 mt-2">
                    {/* Pax */}
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Pax</div>
                      <div className="text-lg font-medium">
                        {previewPkg.pax || 1}
                      </div>
                    </div>

                    {/* Totals */}
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Totals</div>

                      <div className="mt-1 flex flex-col sm:flex-row sm:items-baseline justify-center gap-2 sm:gap-6">
                        {/* PKR bold */}
                        <span className="text-xl font-extrabold text-gray-900">
                          PKR {fmtSAR(previewPkg.totals?.PKR || 0)}
                        </span>

                        {/* SAR normal */}
                        <span className="text-lg text-gray-700">
                          SAR {fmtSAR(previewPkg.totals?.SAR || 0)}
                        </span>

                        {/* USD normal */}
                        <span className="text-lg text-gray-700">
                          USD {Number(previewPkg.totals?.USD || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Itinerary detailed */}
              <div className="mt-6">
                <h4 className="mb-3 text-lg font-extrabold text-center text-indigo-700 tracking-wide">
                  Itinerary
                </h4>

                {previewPkg.itinerary?.adjustedSegments ? (
                  <div className="space-y-3">
                    {previewPkg.itinerary.adjustedSegments.map((s, i) => {
                      if (s.type === "travel") {
                        return (
                          <div
                            key={i}
                            className="
    p-3 rounded-xl
    bg-gradient-to-r from-sky-100 via-cyan-100 to-emerald-100
    border border-cyan-200
    text-sm
    text-center
    shadow-sm
  "
                          >
                            <div className="flex items-center justify-center gap-2 text-sm font-extrabold text-emerald-700">
                              <span className="text-lg">🚌</span>
                              <span>Travel Day</span>
                            </div>

                            <div className="text-sm text-gray-700 mt-1">
                              {s.date?.human || s.date || s.iso}
                            </div>
                          </div>
                        );
                      }
                      // stay
                      return (
                        <div key={i} className="p-3 border rounded">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-extrabold capitalize text-center text-indigo-700">
                                {s.city}
                              </div>
                            </div>
                            <div className="text-sm text-center w-full mt-1">
                              <div>
                                Check-in:{" "}
                                <span className="font-medium">
                                  {s.countedCheckInIso || "-"}
                                </span>
                              </div>
                              <div>
                                Check-out:{" "}
                                <span className="font-medium">
                                  {s.countedLastNightIso
                                    ? addDaysIso(s.countedLastNightIso, 1)
                                    : "-"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* weekend list */}
                          {s.weekendDates && s.weekendDates.length > 0 && (
                            <div
                              className="mt-3 p-3 rounded-lg 
  bg-gradient-to-r from-indigo-50 via-blue-50 to-cyan-50 
  border border-blue-200 text-center"
                            >
                              <div className="font-semibold text-xs">
                                Weekend nights:
                              </div>
                              <div className="text-xs mt-1 flex flex-wrap gap-2">
                                {s.weekendDates.map((iso) => (
                                  <div
                                    key={iso}
                                    className="px-2 py-1 bg-white rounded border text-xs"
                                  >
                                    {iso}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    No itinerary data available
                  </div>
                )}
              </div>

              {/* Hotels */}
              <div className="mt-6">
                <h4 className="flex items-center justify-center gap-2 mb-3 text-lg font-extrabold text-indigo-700">
                  <span className="text-2xl">🏨</span>
                  Hotels
                </h4>

                <div className="grid md:grid-cols-2 gap-4">
                  <div
                    className="p-4 rounded-xl 
  bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 
  border border-amber-200 shadow-sm text-center"
                  >
                    <div className="flex items-center justify-center gap-2 text-sm font-semibold text-amber-700">
                      <span className="text-2xl">🕋</span>
                      <span>Makkah</span>
                    </div>

                    <div className="font-medium">
                      {previewPkg.hotelsSelected?.makkah?.name || "-"}
                    </div>
                    <div className="text-sm text-gray-700 mt-1">
                      Nights: {previewPkg.hotelsSelected?.makkah?.nights ?? "-"}
                    </div>
                  </div>

                  <div
                    className="
    p-3 rounded-xl
    bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50
    border border-emerald-200
    shadow-sm
    text-center
  "
                  >
                    <div className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700">
                      <span className="text-2xl">🕌</span>
                      <span>Madinah</span>
                    </div>
                    <div className="font-medium">
                      {previewPkg.hotelsSelected?.madinah?.name || "-"}
                    </div>
                    <div className="text-sm text-gray-700 mt-1">
                      Nights:{" "}
                      {previewPkg.hotelsSelected?.madinah?.nights ?? "-"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Transport / Visa / Ticket (preview modal) */}
              <div className="mt-6 grid md:grid-cols-3 gap-3 text-sm">
                <div className="p-3 bg-white rounded border">
                  <div className="flex items-center justify-center gap-2 text-sm font-semibold text-indigo-700">
                    <span className="text-xl">🚌</span>
                    <span>Transport</span>
                  </div>

                  <div className="font-medium">
                    {previewPkg.transport?.vehicle || previewPkg.vehicle || "—"}
                  </div>
                </div>

                <div className="p-3 bg-white rounded border">
                  <div className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700">
                    <span className="text-xl">🛂</span>
                    <span>Visa</span>
                  </div>

                  <div className="font-medium">
                    {previewPkg.visa?.type ||
                      previewPkg.visa?.visaType ||
                      "e-visa"}
                  </div>
                </div>

                <div className="p-3 bg-white rounded border">
                  <div className="flex items-center justify-center gap-2 text-sm font-semibold text-amber-700">
                    <span className="text-xl">✈️</span>
                    <span>Ticket</span>
                  </div>

                  <div className="font-medium">
                    {previewPkg.flights?.selectedAirline?.name ||
                      previewPkg.flights?.airline?.name ||
                      previewPkg.selectedAirline?.name ||
                      previewPkg.flights?.airline ||
                      "—"}
                  </div>
                </div>
              </div>

              <Footer />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
