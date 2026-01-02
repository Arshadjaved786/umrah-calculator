// src/components/PDF/PackagePDF.jsx
// Presentational component for PDF / preview
// Props: { pkg }  where pkg is the consolidated snapshot saved by packageService
// - keep this pure (no side-effects). pdfService will take the rendered DOM and convert to PDF.

import React from "react";

/**
 * چھوٹے helpers (سیدھے اور آسان اردو comments)
 */
function fmtNumber(n) {
  if (n === undefined || n === null) return "0";
  return Number(n).toLocaleString();
}

function fmtCurrency(n, cur = "SAR") {
  if (n === undefined || n === null) return `${cur} 0`;
  if (cur === "USD") return `${cur} ${Number(n).toFixed(2)}`;
  return `${cur} ${fmtNumber(n)}`;
}

function isoToHuman(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const day = d.getDate().toString().padStart(2, "0");
    const mon = d.toLocaleString("en-US", { month: "short" });
    return `${day} ${mon} ${d.getFullYear()}`;
  } catch (e) {
    return iso;
  }
}

/**
 * Component
 */
export default function PackagePDF({ pkg }) {
  if (!pkg) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600 font-semibold">No package data</div>
      </div>
    );
  }

  // safe destructure
  const meta = {
    id: pkg.id || "n/a",
    createdAt: pkg.createdAt || pkg.updatedAt || new Date().toISOString(),
  };

  const agency = pkg.agency || {};
  const itinerary = pkg.itinerary || null;
  const makkah = (pkg.hotelsSelected && pkg.hotelsSelected.makkah) || {};
  const madinah = (pkg.hotelsSelected && pkg.hotelsSelected.madinah) || {};
  const flights = pkg.flights || {};
  const visa = pkg.visa || {};
  const transport = pkg.transport || {};
  const pax = Number(pkg.pax || 1);
  const profit = Number(pkg.profit || 0);
  const totals = pkg.totals || {};
  const currency = flights.ticketCurrency || "SAR";
  // total days fallback (safe)
  const totalDays = Number(
    pkg.itinerary?.adjustedStays
      ? pkg.itinerary.adjustedStays.reduce(
          (sum, s) => sum + Number(s.countedDays || 0),
          0
        )
      : 0
  );

  return (
    <div className="bg-white text-gray-900 p-6 leading-tight">
      {/* Page container */}
      <div className="max-w-[800px] mx-auto border shadow-sm p-6">
        {/* Header: logo + agency (updated) */}
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-4 pb-4 border-b text-center md:text-left">
          {/* Logo Left */}
          <div className="w-20 h-20 bg-gray-100 rounded p-1 flex items-center justify-center">
            {agency.logoBase64 ? (
              <img
                src={agency.logoBase64}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-xs text-gray-400">Logo</div>
            )}
          </div>

          {/* Center Agency Info */}
          <div className="flex-1 text-center md:text-center">
            <div className="text-3xl font-extrabold text-indigo-700">
              {agency.name || "Agency Name"}
            </div>

            <div className="text-sm text-gray-700 mt-1">
              {agency.email || ""} {agency.phone ? ` • ${agency.phone}` : ""}
            </div>
          </div>

          {/* Right — Only Created Date (NO Package ID) */}
          <div className="text-right">
            <div className="text-xs text-gray-600">Created</div>
            <div className="text-sm text-gray-700 mt-1">
              {isoToHuman(meta.createdAt)}
            </div>
          </div>
        </div>

        {/* Title / Summary (FINAL) */}
        <div className="mt-4 flex justify-center">
          <div className="w-full max-w-[820px] bg-white p-4 rounded-md shadow-sm">
            {/* Days in Title */}
            <h3 className="text-center text-lg font-semibold mb-3">
              {totalDays} Days Package Summary
            </h3>

            {/* Per Person Line */}
            <div className="text-center mb-4">
              <div className="text-xs text-gray-800 font-bold">Per Person</div>

              <div className="mt-1 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6">
                {/* PKR (BOLD) */}
                <span className="text-lg font-bold">
                  PKR{" "}
                  {fmtNumber(
                    pkg.perPersonTotal
                      ? Math.round(
                          (Number(pkg.perPersonTotal) * (totals?.PKR || 0)) /
                            (totals?.SAR || Number(pkg.perPersonTotal) || 1)
                        )
                      : totals?.PKR
                      ? Math.round(Number(totals.PKR) / Math.max(1, pax))
                      : 0
                  )}
                </span>

                {/* SAR normal */}
                <span className="text-lg text-gray-700">
                  SAR{" "}
                  {fmtNumber(
                    Number(
                      pkg.perPersonTotal ??
                        (totals?.SAR
                          ? Math.round(Number(totals.SAR) / Math.max(1, pax))
                          : 0)
                    )
                  )}
                </span>

                {/* USD normal */}
                <span className="text-lg text-gray-700">
                  USD{" "}
                  {(pkg.perPersonTotal
                    ? (Number(pkg.perPersonTotal) * Number(totals?.USD || 0)) /
                      Number(totals?.SAR || Number(pkg.perPersonTotal) || 1)
                    : Number(totals?.USD || 0) / Math.max(1, pax)
                  ).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Pax + Totals — Same Row */}
            <div className="text-center mt-2">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-10">
                {/* Pax */}
                <div className="text-center">
                  <div className="text-xs text-gray-500">Pax</div>
                  <div className="text-lg font-medium">{pax}</div>
                </div>

                {/* Totals (PKR bold → SAR → USD) */}
                <div className="text-center">
                  <div className="text-xs text-gray-500">Totals</div>

                  <div className="mt-1 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6">
                    {/* PKR bold */}
                    <span className="text-lg font-bold">
                      PKR {fmtNumber(totals?.PKR || 0)}
                    </span>

                    {/* SAR normal */}
                    <span className="text-lg text-gray-700">
                      SAR {fmtNumber(totals?.SAR || 0)}
                    </span>

                    {/* USD normal */}
                    <span className="text-lg text-gray-700">
                      USD {Number(totals?.USD || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Itinerary (if exists) */}
        {itinerary && (
          <div className="mt-5">
            <h4 className="font-semibold">Itinerary</h4>
            <div className="text-sm text-gray-700 mt-2 space-y-2">
              {/* show segments if available */}
              {(itinerary.adjustedSegments || []).map((s, i) => {
                if (s.type === "travel") {
                  return (
                    <div
                      key={`seg-${i}`}
                      className="p-2 bg-yellow-50 rounded border"
                    >
                      <div className="text-xs text-gray-600">Travel Day</div>
                      <div className="text-sm">
                        {s.date?.human || s.date || s.iso}
                      </div>
                    </div>
                  );
                }
                // stay
                return (
                  <div key={`seg-${i}`} className="p-2 border rounded">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                      <div className="text-sm font-semibold capitalize">
                        {s.city}
                      </div>
                      <div className="text-xs text-gray-600">
                        Nights (counted):{" "}
                        {s.countedDays ?? s.displayDays ?? s.days}
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Check-in:{" "}
                      <strong>
                        {s.countedCheckInIso
                          ? isoToHuman(s.countedCheckInIso)
                          : "—"}
                      </strong>
                      {" • "}
                      Check-out:{" "}
                      <strong>
                        {s.countedLastNightIso
                          ? isoToHuman(s.countedLastNightIso)
                          : "—"}
                      </strong>
                    </div>
                    {s.weekendDates && s.weekendDates.length > 0 && (
                      <div className="mt-2 text-xs bg-blue-50 p-2 rounded">
                        Weekend nights:{" "}
                        {s.weekendDates.map((d) => (
                          <span key={d} className="inline-block mr-2">
                            {isoToHuman(d)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Hotels (PDF — Price hidden, Weekend nights visible) */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Makkah Hotel */}
          <div className="p-3 border rounded">
            <div className="font-semibold">Makkah Hotel</div>

            <div className="text-sm mt-2">
              {/* Hotel Name */}
              <div className="font-medium">{makkah.name || "—"}</div>

              {/* Nights */}
              <div className="text-xs text-gray-600">
                Nights: {makkah.nights || 0}
              </div>

              {/* Weekend Nights (Keep Visible) */}
              {makkah.weekendNights !== undefined && (
                <div className="text-xs text-gray-600">
                  Weekend nights: {makkah.weekendNights}
                </div>
              )}

              {/* Check-in */}
              <div className="text-xs mt-2">
                Check-in:{" "}
                {isoToHuman(
                  makkah.countedCheckInIso ||
                    makkah.isoCheckIn ||
                    makkah.checkInIso ||
                    ""
                )}
              </div>

              {/* Check-out */}
              <div className="text-xs">
                Check-out:{" "}
                {makkah.countedLastNightIso
                  ? isoToHuman(
                      new Date(
                        new Date(makkah.countedLastNightIso).setDate(
                          new Date(makkah.countedLastNightIso).getDate() + 1
                        )
                      ).toISOString()
                    )
                  : "—"}
              </div>
            </div>
          </div>

          {/* Madinah Hotel */}
          <div className="p-3 border rounded">
            <div className="font-semibold">Madinah Hotel</div>

            <div className="text-sm mt-2">
              {/* Hotel Name */}
              <div className="font-medium">{madinah.name || "—"}</div>

              {/* Nights */}
              <div className="text-xs text-gray-600">
                Nights: {madinah.nights || 0}
              </div>

              {/* Weekend Nights (SHOW) */}
              {madinah.weekendNights !== undefined && (
                <div className="text-xs text-gray-600">
                  Weekend nights: {madinah.weekendNights}
                </div>
              )}

              {/* Check-in */}
              <div className="text-xs mt-2">
                Check-in:{" "}
                {isoToHuman(
                  madinah.countedCheckInIso ||
                    madinah.isoCheckIn ||
                    madinah.checkInIso ||
                    ""
                )}
              </div>

              {/* Check-out */}
              <div className="text-xs">
                Check-out:{" "}
                {madinah.countedLastNightIso
                  ? isoToHuman(
                      new Date(
                        new Date(madinah.countedLastNightIso).setDate(
                          new Date(madinah.countedLastNightIso).getDate() + 1
                        )
                      ).toISOString()
                    )
                  : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Flights, Visa, Transport */}
        <div className="mt-5 border-t pt-4 space-y-3">
          <div className="flex justify-between items-center">
            <div className="text-sm">Airline</div>
            <div className="text-sm font-medium">
              {pkg.flights?.selectedAirline?.name ||
                pkg.flights?.airline?.name ||
                pkg.selectedAirline?.name ||
                pkg.flights?.airline ||
                "—"}
            </div>
          </div>

          {/* Ticket price removed on PDF */}

          <div className="flex justify-between items-center">
            <div className="text-sm">Visa</div>
            <div className="text-sm font-medium">
              {pkg.visa?.type || pkg.visa?.visaType || "e-visa"}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm">Transport</div>
            <div className="text-sm font-medium">
              {pkg.transport?.vehicle || pkg.vehicle || "—"}
            </div>
          </div>

          {profit > 0 && (
            <div className="flex justify-between items-center">
              <div className="text-sm">Profit</div>
              <div className="text-sm font-medium">
                {fmtCurrency(profit, pkg.profitCurrency || "SAR")}
              </div>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="mt-5 border-t pt-4">
          <div className="flex justify-between items-center text-sm">
            <div>Per person total (SAR)</div>
            <div className="font-semibold">
              {fmtCurrency(pkg.perPersonTotal || totals.SAR || 0, "SAR")}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm mt-2 gap-2">
            <div>Grand total</div>

            <div className="font-semibold">
              <span className="font-semibold text-lg">
                {fmtCurrency(totals.SAR || 0, "SAR")}
              </span>

              <span className="ml-4 text-sm text-gray-600">
                PKR {fmtNumber(totals.PKR || 0)}
              </span>

              <span className="ml-4 text-sm text-gray-600">
                USD {Number(totals.USD || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="mt-6 border-t pt-3 text-xs text-gray-600"
          style={{
            pageBreakInside: "avoid",
            breakInside: "avoid",
            marginTop: "30px",
          }}
        >
          <div>Notes: {pkg.notes || "—"}</div>

          <div className="mt-2">
            Contact: {agency.phone || "—"} · {agency.email || "—"}
          </div>

          {/* QR + Address */}
          <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="text-xs text-gray-500">{agency.address || "—"}</div>

            <div>
              {pkg.qrBase64 ? (
                <img
                  src={pkg.qrBase64}
                  className="w-20 h-20 object-contain border rounded-sm"
                />
              ) : (
                <div className="w-20 h-20 bg-gray-50 flex items-center justify-center text-xs text-gray-400 border rounded">
                  No QR
                </div>
              )}
            </div>
          </div>

          <div className="mt-2">Generated: {isoToHuman(meta.createdAt)}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Small helpers used inside template
 */

// hotel subtotal: nights*price + weekendNights*weekendPrice (if weekendPrice provided)
function calcHotelSubtotal(h) {
  const nights = Number(h.nights || 0);
  const base = Number(h.pricePerNight || 0);
  const wN = Number(h.weekendNights || 0);
  const wP =
    h.weekendPrice === "" || h.weekendPrice === null
      ? base
      : Number(h.weekendPrice || base);
  // weekend nights often are counted inside nights, so weekend price may be additional or replacement.
  // current assumption: weekend nights are counted within nights and weekendPrice replaces base for those nights.
  const normalNights = Math.max(0, nights - wN);
  return normalNights * base + wN * wP;
}
