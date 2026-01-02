// src/components/TripPlanner/TripSummaryCard.jsx
import React from "react";

/**
 * TripSummaryCard (updated)
 *
 * Expects `data` in the shape produced by TripPlanner:
 * - data.adjustedSegments (array)
 * - data.adjustedStays (array)
 * - data.countedTotal
 * - data.makkahNights, data.madinahNights
 * - data.notes (array)
 *
 * Props:
 * - data: adjusted result OR original result (adjusted preferred)
 * - raw: original result (optional) - used for reference
 * - excludeArrival, excludeExit, markWeekend: booleans (for showing notes/badges)
 * - themeClass: tailwind class for header color
 * - onAccept: callback when Accept & Send pressed
 */

function isoToHuman(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const mon = d.toLocaleString("en-US", { month: "short" });
  return `${String(d.getDate()).padStart(2, "0")} ${mon} (${days[d.getDay()]})`;
}

function isoToDay(iso) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  return d.getDay();
}

export default function TripSummaryCard({
  data,
  raw,
  excludeArrival,
  excludeExit,
  markWeekend,
  themeClass = "bg-teal-600",
  onAccept,
}) {
  if (!data || data.error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded">
        {data?.error || "No data"}
      </div>
    );
  }

  const segments = data.adjustedSegments || data.segments || [];
  const stays =
    data.adjustedStays ||
    (segments ? segments.filter((s) => s.type === "stay") : []);
  const countedTotal =
    data.countedTotal ?? data.makkahNights + data.madinahNights;
  const makkahNights = data.makkahNights ?? 0;
  const madinahNights = data.madinahNights ?? 0;
  const computedMakkahNights = stays
    .filter((s) => s.city === "makkah")
    .reduce((sum, s) => sum + (s.countedDays || 0), 0);

  const computedMadinahNights = stays
    .filter((s) => s.city === "madinah")
    .reduce((sum, s) => sum + (s.countedDays || 0), 0);

  // compute weekend totals from adjusted stays (if present)
  let makkahWeekend = 0;
  let madinahWeekend = 0;
  if (stays && stays.length) {
    stays.forEach((s) => {
      const w = s.weekendDates ? s.weekendDates.length : 0;
      if (s.city === "makkah") makkahWeekend += w;
      if (s.city === "madinah") madinahWeekend += w;
    });
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-white shadow-md rounded overflow-hidden">
      {/* header */}
      <div
        className={`
          ${themeClass}
          px-4 py-3 text-white
          flex flex-col sm:flex-row
          items-start sm:items-center
          gap-2
          sm:justify-between
        `}
      >
        <div>
          <h2 className="text-xl font-bold">Trip summary — خلاصہ سفر</h2>
          <div className="text-sm opacity-90">
            Generated itinerary (adjusted view)
          </div>
        </div>
        <div className="text-sm bg-white/20 px-3 py-1 rounded">
          Nights (counted): <strong>{countedTotal}</strong>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {segments.map((s, i) => {
          if (s.type === "travel") {
            return (
              <div
                key={`travel-${s.iso || i}`}
                className="p-3 border rounded max-w-xl mx-auto text-center bg-gradient-to-r from-emerald-100 via-teal-100 to-cyan-100"
              >
                <div className="text-sm font-semibold">Travel Day</div>
                <div className="text-sm text-gray-700 mt-1">
                  {s.date?.human || s.date}
                </div>
              </div>
            );
          }

          const countedDays = s.countedDays ?? s.originalDays ?? s.days ?? 0;
          const countedCheckIn = s.countedCheckInIso
            ? isoToHuman(s.countedCheckInIso)
            : null;
          const countedLastNight = s.countedLastNightIso
            ? isoToHuman(s.countedLastNightIso)
            : null;
          const weekendDates = s.weekendDates || [];

          return (
            <div
              key={`stay-${s.city}-${s.isoCheckIn || i}`}
              className="p-3 border rounded max-w-xl mx-auto text-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50"
            >
              <div className="flex flex-col sm:flex-row justify-between gap-3">
                <div>
                  <div className="text-md font-semibold capitalize">
                    {s.city}
                  </div>
                  <div className="text-sm text-gray-700">
                    Nights: <span className="font-medium">{countedDays}</span>
                  </div>
                </div>
              </div>

              {(countedCheckIn || countedLastNight) && (
                <div className="mt-3 bg-gray-50 p-3 rounded text-sm text-gray-700 border-l-4 border-gray-200">
                  <div>
                    Counted check-in:{" "}
                    <span className="font-medium">{countedCheckIn || "—"}</span>
                  </div>
                  <div>
                    Counted last-night:{" "}
                    <span className="font-medium">
                      {countedLastNight || "—"}
                    </span>
                  </div>
                </div>
              )}

              {markWeekend && weekendDates.length > 0 && (
                <div className="mt-3 text-sm bg-blue-50 p-2 rounded">
                  <div className="font-semibold text-xs">
                    Weekend nights in this stay:
                  </div>
                  <div className="text-xs mt-1 flex flex-wrap gap-2">
                    {weekendDates.map((iso) => (
                      <div
                        key={iso}
                        className="px-2 py-1 bg-white rounded border text-xs"
                      >
                        {isoToHuman(iso)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* bottom summary */}
      <div className="p-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-semibold">Notes / نوٹس</h3>

          <ul className="list-disc ml-5 text-sm text-gray-600 mt-2">
            {stays.length > 0 && (
              <li className="text-sm text-gray-700">
                Distribution used:{" "}
                <strong>{stays.map((s) => s.countedDays).join(" / ")}</strong>
              </li>
            )}

            {(data.notes || [])
              .filter((n) => !n.startsWith("Distribution used"))
              .map((n, idx) => (
                <li key={`note-${idx}`}>{n}</li>
              ))}

            {excludeArrival && stays.length > 0 && (
              <li className="text-sm bg-gradient-to-r from-red-500 via-red-600 to-rose-600 text-white p-2 rounded mb-1">
                Note: Original arrival date:{" "}
                <strong>{stays[0].countedCheckInIso || "—"}</strong> — displayed
                counted check-in:{" "}
                <strong>{stays[0].countedCheckInIso || "—"}</strong>
              </li>
            )}

            {excludeExit && stays.length > 0 && (
              <li className="text-sm bg-gradient-to-r from-red-500 via-red-600 to-rose-600 text-white p-2 rounded mb-1">
                Note: Original exit date:{" "}
                <strong>
                  {stays[stays.length - 1].countedLastNightIso || "—"}
                </strong>{" "}
                Checkout last date:{" "}
                <strong>
                  {stays[stays.length - 1].countedLastNightIso || "—"}
                </strong>
              </li>
            )}

            {markWeekend && (
              <li className="text-sm text-gray-700">
                Weekend (Thu + Fri) nights are highlighted per stay.
              </li>
            )}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold">
            Nights summary — خلاصہ راتیں
          </h3>
          <div className="text-sm text-gray-700 mt-2">
            <div>
              Makkah nights:{" "}
              <span className="font-medium">{computedMakkahNights}</span>
              {markWeekend && (
                <span className="ml-2 text-xs text-gray-600">
                  {" "}
                  (Weekend: {makkahWeekend} → Weeknights:{" "}
                  {Math.max(0, computedMakkahNights - makkahWeekend)})
                </span>
              )}
            </div>
            <div>
              Madinah nights:{" "}
              <span className="font-medium">{computedMadinahNights}</span>
              {markWeekend && (
                <span className="ml-2 text-xs text-gray-600">
                  {" "}
                  (Weekend: {madinahWeekend} → Weeknights:{" "}
                  {Math.max(0, computedMadinahNights - madinahWeekend)})
                </span>
              )}
            </div>

            <div className="mt-3 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => onAccept && onAccept()}
                className={`px-4 py-2 w-full sm:w-auto text-white rounded ${themeClass}`}
              >
                Accept & Send to Hotels
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 border rounded"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
