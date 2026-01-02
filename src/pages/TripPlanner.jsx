// src/pages/TripPlanner.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { generateItinerary } from "../utils/dateHelpers";
import TripSummaryCard from "../components/TripPlanner/TripSummaryCard";
import { adjustStaysManually } from "../utils/manualAdjuster";

/**
 * TripPlanner page (UI)
 * - Supports exclude first/last night and shows counted dates in calendar (display).
 * - Shows notes about original dates when excluded.
 * - Mark weekend nights (Thu + Fri) based on counted nights.
 * - Removes Jeddah option from city dropdown.
 *
 * Important:
 * - generateItinerary remains core calculation.
 * - This UI builds adjustedResult from core result and toggles, and updates displayed dates.
 */

/* Safe ISO helpers: avoid timezone shifts by splitting */
function isoToDate(iso) {
  if (!iso) return null;
  const parts = String(iso).split("-");
  const yyyy = Number(parts[0]);
  const mm = Number(parts[1]) - 1;
  const dd = Number(parts[2]);
  return new Date(yyyy, mm, dd);
}

function dateToIso(d) {
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysIso(iso, n) {
  const dt = isoToDate(iso);
  if (!dt) return iso;
  const d = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  d.setDate(d.getDate() + n);
  return dateToIso(d);
}
/**
 * 🔁 Recalculate preview stays dates
 * based on MANUAL counted days
 *
 * Live preview ONLY — final commit on Accept
 */
function rebuildPreviewFromManual(adjustedResult, manualStays) {
  if (!adjustedResult || !manualStays) return adjustedResult;

  const next = JSON.parse(JSON.stringify(adjustedResult));

  let cursor =
    manualStays[0]?.isoCheckIn || next.adjustedStays[0]?.countedCheckInIso;

  next.adjustedStays.forEach((s, i) => {
    const m = manualStays[i];
    const nights = m.displayDays;

    s.countedDays = nights;
    s.countedCheckInIso = cursor;

    const lastNight = addDaysIso(cursor, nights - 1);
    s.countedLastNightIso = lastNight;

    cursor = addDaysIso(lastNight, 1);
  });

  return next;
}

/**
 * 🔁 Build adjustedSegments from adjustedStays
 * So UI dates (check-in / check-out / travel)
 * update immediately on manual + / −
 */
function rebuildSegmentsFromStays(adjustedResult) {
  if (!adjustedResult || !adjustedResult.adjustedStays) return adjustedResult;

  const next = JSON.parse(JSON.stringify(adjustedResult));
  const segments = [];

  next.adjustedStays.forEach((s, i) => {
    // stay segment (FULL SHAPE)
    segments.push({
      type: "stay",
      city: s.city,

      originalDays: s.originalDays,
      countedDays: s.countedDays,

      // calendar dates (original)
      checkIn: s.checkIn,
      checkOut: s.checkOut,

      isoCheckIn: s.isoCheckIn,
      isoCheckOut: s.isoCheckOut,
      isoLastNight: s.isoLastNight,

      // counted dates (manual/exclude aware)
      countedCheckInIso: s.countedCheckInIso,
      countedLastNightIso: s.countedLastNightIso,

      countedNights: s.countedNights || [],
      weekendDates: s.weekendDates || [],
    });

    // travel segment
    if (i < next.adjustedStays.length - 1) {
      const travelIso = addDaysIso(s.countedLastNightIso, 1);
      segments.push({
        type: "travel",
        iso: travelIso,
        date: {
          iso: travelIso,
          human: travelIso
            ? (() => {
                const d = isoToDate(travelIso);
                const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                const mon = d.toLocaleString("en-US", { month: "short" });
                return `${String(d.getDate()).padStart(2, "0")} ${mon} (${
                  days[d.getDay()]
                })`;
              })()
            : "—",
        },
      });
    }
  });

  next.adjustedSegments = segments;
  return next;
}

/**
 * Build adjusted result for UI:
 * - applies excludeArrival/excludeExit
 * - computes countedCheckInIso / countedLastNightIso per stay
 * - computes weekendDates per stay (Thu+Fri) based on counted nights
 */
function buildAdjustedResult(result, excludeArrival, excludeExit, markWeekend) {
  if (!result) return null;
  const segs = JSON.parse(JSON.stringify(result.segments || []));

  // stays only
  const stays = segs.filter((s) => s.type === "stay");

  // create adjusted stays
  const adjustedStays = stays.map((s, idx) => {
    const isoCheckIn = s.isoCheckIn || s.checkIn?.iso;
    const isoLastNight =
      (s.lastNight && (s.lastNight.iso || s.lastNight)) ||
      addDaysIso(isoCheckIn, (s.displayDays ?? s.days) - 1);

    let countedDays = Number(s.displayDays ?? s.days ?? 0);

    if (excludeArrival && idx === 0) {
      countedDays = Math.max(0, countedDays - 1);
    }
    if (excludeExit && idx === stays.length - 1) {
      countedDays = Math.max(0, countedDays - 1);
    }

    const countedCheckInIso =
      excludeArrival && idx === 0 ? addDaysIso(isoCheckIn, 1) : isoCheckIn;

    const countedLastNightIso = (() => {
      if (excludeExit && idx === stays.length - 1) {
        // if exclude last night, move lastNight back one day
        return addDaysIso(isoLastNight, -1);
      }
      // otherwise count from countedCheckInIso + (countedDays - 1)
      return addDaysIso(countedCheckInIso, Math.max(0, countedDays - 1));
    })();

    // build counted nights array for this stay (every counted night iso)
    const countedNights = [];
    if (countedDays > 0) {
      let cur = isoToDate(countedCheckInIso);
      const last = isoToDate(countedLastNightIso);
      while (cur && last && cur <= last) {
        countedNights.push(dateToIso(cur));
        cur.setDate(cur.getDate() + 1);
      }
    }

    // weekend detection (Thu=4, Fri=5)
    const weekendDates = [];
    if (markWeekend && countedNights.length > 0) {
      countedNights.forEach((iso) => {
        const d = isoToDate(iso);
        const day = d.getDay();
        if (day === 4 || day === 5) weekendDates.push(iso);
      });
    }

    return {
      ...s,
      countedDays,
      countedCheckInIso,
      countedLastNightIso,
      countedNights,
      weekendDates,
      originalDays: s.displayDays ?? s.days,
    };
  });

  // build adjusted segments (stay + travel) for display
  const adjustedSegments = [];
  for (let i = 0; i < adjustedStays.length; i++) {
    const s = adjustedStays[i];
    adjustedSegments.push({
      type: "stay",
      city: s.city,
      originalDays: s.originalDays,
      countedDays: s.countedDays,
      checkIn: s.checkIn, // original formatted
      checkOut: s.checkOut, // original formatted (we keep)
      isoCheckIn: s.isoCheckIn,
      isoCheckOut: s.isoCheckOut,
      countedCheckInIso: s.countedCheckInIso,
      countedLastNightIso: s.countedLastNightIso,
      countedNights: s.countedNights,
      weekendDates: s.weekendDates,
    });
    if (i < adjustedStays.length - 1) {
      // find corresponding travel seg (fallback to s.checkOut)
      adjustedSegments.push({
        type: "travel",
        date: s.checkOut,
        iso: s.isoCheckOut || s.checkOut?.iso,
      });
    }
  }

  // compute per-city totals (based on countedNights)
  let makkahNights = 0,
    madinahNights = 0,
    countedTotal = 0;
  adjustedStays.forEach((s) => {
    const d = s.countedDays ?? 0;
    countedTotal += d;
    if (s.city === "makkah") makkahNights += d;
    if (s.city === "madinah") madinahNights += d;
  });

  return {
    ...result,
    adjustedSegments,
    adjustedStays,
    countedTotal,
    makkahNights,
    madinahNights,
  };
}

export default function TripPlanner() {
  const now = new Date();
  const localToday = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // original values (what user inputs)
  const [originalDeparture, setOriginalDeparture] = useState(localToday);
  const [originalExitDate, setOriginalExitDate] = useState("");

  // displayed calendar values (may be adjusted when excludes used)
  const [displayDeparture, setDisplayDeparture] = useState(localToday);
  const [displayExit, setDisplayExit] = useState("");

  const [totalDays, setTotalDays] = useState(15);
  const [useCustomTotal, setUseCustomTotal] = useState(false);
  const [customTotal, setCustomTotal] = useState(15);
  const [useExitDate, setUseExitDate] = useState(false);
  const [exitDateInput, setExitDateInput] = useState("");

  const [startCity, setStartCity] = useState("makkah");
  const [exitCity, setExitCity] = useState("makkah");
  const [maxMadinah, setMaxMadinah] = useState(false);

  // NEW UI flags:
  const [excludeArrival, setExcludeArrival] = useState(false);
  const [excludeExit, setExcludeExit] = useState(false);
  const [markWeekend, setMarkWeekend] = useState(false); // Thu+Fri

  const [result, setResult] = useState(null);
  const [adjustedResult, setAdjustedResult] = useState(null);
  const [note, setNote] = useState("");
  // Manual adjustment state
  const [manualStays, setManualStays] = useState(null);
  const [manualFridayWarning, setManualFridayWarning] = useState(false);

  const [theme, setTheme] = useState("bg-teal-600");
  const navigate = useNavigate();

  // normalize helpers: ensure passing YYYY-MM-DD to core
  function toLocalIso(val) {
    if (!val) return val;
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
  }

  // When user changes the departure input, keep original and display in sync
  function onDepartureChange(v) {
    setOriginalDeparture(v);
    setDisplayDeparture(v);
  }
  function onExitChange(v) {
    setOriginalExitDate(v);
    setDisplayExit(v);
    setExitDateInput(v);
  }

  // Create itinerary
  function onGenerate(e) {
    e?.preventDefault?.();
    setNote("");

    const opts = {
      departureDate: toLocalIso(originalDeparture),
      startCity,
      exitCity,
      maxMadinah,
    };

    if (useExitDate && exitDateInput) {
      opts.exitDate = toLocalIso(exitDateInput);
    } else if (useCustomTotal) {
      opts.totalDays = Number(customTotal);
    } else {
      opts.totalDays = Number(totalDays);
    }

    const res = generateItinerary(opts);

    if (res.error) {
      setNote(res.error);
      setResult(null);
      setAdjustedResult(null);
      return;
    }

    setResult(res);

    // build adjusted result based on UI flags
    const adj = buildAdjustedResult(
      res,
      excludeArrival,
      excludeExit,
      markWeekend
    );
    setAdjustedResult(adj);
    // initialize manual stays from adjusted stays
    if (adj?.adjustedStays) {
      setManualStays(
        adj.adjustedStays.map((s) => ({
          city: s.city,

          // ✅ IMPORTANT:
          // Manual system ab COUNTED nights se start karega
          displayDays:
            typeof s.countedDays === "number"
              ? s.countedDays
              : s.originalDays ?? s.displayDays ?? s.days,

          isoCheckIn: s.countedCheckInIso || s.isoCheckIn,
          locked: false,
        }))
      );

      setManualFridayWarning(false);
    }

    // Update displayed calendar values depending on exclude flags:
    // Display departure as countedCheckIn of first stay if excludeArrival, else originalDeparture (or core departure iso)
    const firstStay =
      (adj && adj.adjustedStays && adj.adjustedStays[0]) || null;
    if (firstStay) {
      if (excludeArrival) {
        setDisplayDeparture(
          firstStay.countedCheckInIso ||
            firstStay.isoCheckIn ||
            originalDeparture
        );
      } else {
        // Use originalDeparture (user-chosen) or normalized core departure
        setDisplayDeparture(toLocalIso(originalDeparture));
      }
    }

    // Compute original exit iso from core result (last stay lastNight)
    const coreLastStay = res.segments
      ? res.segments.filter((s) => s.type === "stay").slice(-1)[0]
      : null;

    // UPDATED: prefer last night as exit date for form
    const coreExitIso = coreLastStay
      ? coreLastStay.isoLastNight ||
        coreLastStay.isoCheckOutDay ||
        coreLastStay.checkOut?.iso ||
        ""
      : "";

    // For displayExit: if excludeExit true -> show countedLastNight of last adjusted stay
    const lastAdjStay =
      (adj && adj.adjustedStays && adj.adjustedStays.slice(-1)[0]) || null;
    if (lastAdjStay) {
      if (excludeExit) {
        setDisplayExit(
          lastAdjStay.countedLastNightIso ||
            lastAdjStay.isoCheckOut ||
            coreExitIso
        );
      } else {
        // show original exit (from core)
        setDisplayExit(coreExitIso || toLocalIso(originalExitDate) || "");
      }
    } else {
      setDisplayExit(coreExitIso || toLocalIso(originalExitDate) || "");
    }

    setNote("Itinerary generated successfully.");
  }

  // recompute adjusted result and update display when toggles change
  useEffect(() => {
    if (!result) return;
    const adj = buildAdjustedResult(
      result,
      excludeArrival,
      excludeExit,
      markWeekend
    );
    setAdjustedResult(adj);

    // update display departure/exit based on current toggles
    const firstStay =
      (adj && adj.adjustedStays && adj.adjustedStays[0]) || null;
    if (firstStay) {
      if (excludeArrival)
        setDisplayDeparture(
          firstStay.countedCheckInIso || firstStay.isoCheckIn
        );
      else setDisplayDeparture(toLocalIso(originalDeparture));
    }
    const lastAdjStay =
      (adj && adj.adjustedStays && adj.adjustedStays.slice(-1)[0]) || null;
    const coreLastStay = result.segments
      ? result.segments.filter((s) => s.type === "stay").slice(-1)[0]
      : null;

    // UPDATED: prefer last night as exit date for form
    const coreExitIso = coreLastStay
      ? coreLastStay.isoLastNight ||
        coreLastStay.isoCheckOutDay ||
        coreLastStay.checkOut?.iso ||
        ""
      : "";

    if (lastAdjStay) {
      if (excludeExit)
        setDisplayExit(
          lastAdjStay.countedLastNightIso ||
            lastAdjStay.isoCheckOut ||
            coreExitIso
        );
      else setDisplayExit(coreExitIso || toLocalIso(originalExitDate) || "");
    } else {
      setDisplayExit(coreExitIso || toLocalIso(originalExitDate) || "");
    }
    // recompute note cleared/updated
  }, [excludeArrival, excludeExit, markWeekend, result]); // eslint-disable-line

  function onManualAdjust(stayIndex, delta) {
    if (!manualStays || !adjustedResult) return;

    const { stays, fridayWarning, balanceWarning } = adjustStaysManually(
      manualStays,
      stayIndex,
      delta
    );

    setManualStays(stays);
    setManualFridayWarning(fridayWarning);

    if (balanceWarning) return;

    // -------------------------------
    // 🔁 Rebuild adjustedResult dates
    // based on MANUAL counted days
    // -------------------------------
    const newAdjusted = JSON.parse(JSON.stringify(adjustedResult));

    let cursor =
      stays[0].isoCheckIn || newAdjusted.adjustedStays[0]?.countedCheckInIso;

    newAdjusted.adjustedStays.forEach((s, i) => {
      const manual = stays[i];
      const nights = manual.displayDays;

      s.countedDays = nights;
      s.countedCheckInIso = cursor;

      // last night = checkin + (nights - 1)
      const lastNight = addDaysIso(cursor, nights - 1);
      s.countedLastNightIso = lastNight;

      // ✅ weekend nights ONLY if feature is ON
      let weekendDates = [];

      if (markWeekend) {
        let d = isoToDate(s.countedCheckInIso);
        const end = isoToDate(s.countedLastNightIso);

        while (d && end && d <= end) {
          const day = d.getDay(); // Thu=4, Fri=5
          if (day === 4 || day === 5) {
            weekendDates.push(dateToIso(d));
          }
          d.setDate(d.getDate() + 1);
        }
      }

      s.weekendDates = weekendDates;

      // next checkin = last night + 1
      cursor = addDaysIso(lastNight, 1);
    });

    // 🔁 Live preview: rebuild stays + segments
    const previewStays = rebuildPreviewFromManual(newAdjusted, stays);
    const previewFinal = rebuildSegmentsFromStays(previewStays);

    setAdjustedResult(previewFinal);
  }

  // Accept & Send to Hotels (save adjusted values) — COMPLETE REPLACEMENT

  function onAccept() {
    try {
      const toSave =
        adjustedResult && adjustedResult.adjustedSegments
          ? {
              ...adjustedResult,

              // ✅ FINAL CANONICAL SEGMENTS (SCREEN = SAVE)
              segments: adjustedResult.adjustedSegments.map((s) => {
                if (s.type !== "stay") return s;

                const checkInIso = s.countedCheckInIso;
                const checkOutIso = s.countedLastNightIso
                  ? addDaysIso(s.countedLastNightIso, 1)
                  : s.isoCheckOut;

                return {
                  ...s,

                  // 🔥 overwrite auto planner dates
                  isoCheckIn: checkInIso,
                  isoCheckOut: checkOutIso,

                  checkIn: {
                    ...(s.checkIn || {}),
                    iso: checkInIso,
                  },
                  checkOut: {
                    ...(s.checkOut || {}),
                    iso: checkOutIso,
                  },
                };
              }),
            }
          : result;

      if (!toSave) {
        setNote("No itinerary to save.");
        return;
      }

      // Save full plan for reference
      localStorage.setItem("umrah_last_plan", JSON.stringify(toSave));

      // Build staysList from adjustedStays if present, otherwise from segments
      let staysList = [];

      if (
        Array.isArray(toSave.adjustedStays) &&
        toSave.adjustedStays.length > 0
      ) {
        staysList = toSave.adjustedStays;
      } else if (
        Array.isArray(toSave.adjustedSegments) &&
        toSave.adjustedSegments.length > 0
      ) {
        staysList = toSave.adjustedSegments.filter((s) => s.type === "stay");
      } else {
        staysList = (toSave.segments || []).filter((s) => s.type === "stay");
      }

      // Aggregate totals across stays (countedDays) for backward-compat total
      const totalMakkah = staysList
        .filter((s) => String(s.city).toLowerCase() === "makkah")
        .reduce(
          (acc, s) =>
            acc + Number(s.countedDays ?? s.displayDays ?? s.days ?? 0),
          0
        );

      const totalMadinah = staysList
        .filter((s) => String(s.city).toLowerCase() === "madinah")
        .reduce(
          (acc, s) =>
            acc + Number(s.countedDays ?? s.displayDays ?? s.days ?? 0),
          0
        );

      // Save backward-compatible overall totals (counted nights)
      localStorage.setItem("umrah_makkah_nights", String(totalMakkah));
      localStorage.setItem("umrah_madinah_nights", String(totalMadinah));

      // Group stays per city
      const makkahStays = staysList.filter(
        (s) => String(s.city).toLowerCase() === "makkah"
      );
      const madinahStays = staysList.filter(
        (s) => String(s.city).toLowerCase() === "madinah"
      );

      // Helper: compute totals from an array of stays
      const computeTotals = (arr) => {
        let totalNights = 0;
        let weekendNights = 0;
        arr.forEach((s) => {
          // prefer countedNights array length if present
          const t = Array.isArray(s.countedNights)
            ? s.countedNights.length
            : Number(s.countedDays ?? s.displayDays ?? s.days ?? 0);
          const w = Array.isArray(s.weekendDates) ? s.weekendDates.length : 0;
          totalNights += Number(t || 0);
          weekendNights += Number(w || 0);
        });
        return { totalNights, weekendNights };
      };

      const makkahTotals = computeTotals(makkahStays);
      const madinahTotals = computeTotals(madinahStays);

      // Save aggregated values in the shape Manage Hotels expects:
      // - <prefix>_nights  => weeknights (total minus weekend)
      // - <prefix>_weekend_nights => weekend nights
      const saveAggregated = (prefix, totals) => {
        const totalN = totals.totalNights || 0;
        const weekendN = totals.weekendNights || 0;
        const weekN = Math.max(0, totalN - weekendN);

        localStorage.setItem(`${prefix}_nights`, String(weekN));
        localStorage.setItem(`${prefix}_weekend_nights`, String(weekendN));
      };

      saveAggregated("umrah_makkah", makkahTotals);
      saveAggregated("umrah_madinah", madinahTotals);

      // Also save representative price and weekend price if present (take from first stay that has it)
      const pickPrice = (arr) => {
        for (let s of arr) {
          if (s.pricePerNight !== undefined && s.pricePerNight !== "")
            return s.pricePerNight;
          if (s.countedPrice !== undefined && s.countedPrice !== "")
            return s.countedPrice;
        }
        return null;
      };
      const pickWeekendPrice = (arr) => {
        for (let s of arr) {
          if (s.weekendPrice !== undefined && s.weekendPrice !== "")
            return s.weekendPrice;
        }
        return null;
      };

      const mPrice = pickPrice(makkahStays);
      const mWeekendPrice = pickWeekendPrice(makkahStays);
      if (mPrice !== null)
        localStorage.setItem("umrah_makkah_price", String(mPrice));
      if (mWeekendPrice !== null)
        localStorage.setItem(
          "umrah_makkah_weekend_price",
          String(mWeekendPrice)
        );

      const dPrice = pickPrice(madinahStays);
      const dWeekendPrice = pickWeekendPrice(madinahStays);
      if (dPrice !== null)
        localStorage.setItem("umrah_madinah_price", String(dPrice));
      if (dWeekendPrice !== null)
        localStorage.setItem(
          "umrah_madinah_weekend_price",
          String(dWeekendPrice)
        );

      // Save checkin/checkout ISO for each city (use first stay as representative)
      if (makkahStays.length > 0) {
        const s = makkahStays[0];
        const isoIn = s.countedCheckInIso || s.isoCheckIn || s.checkIn?.iso;
        const isoOut = s.countedLastNightIso
          ? addDaysIso(s.countedLastNightIso, 1)
          : s.isoCheckOut || s.checkOut?.iso;
        if (isoIn) localStorage.setItem("umrah_makkah_checkin", isoIn);
        if (isoOut) localStorage.setItem("umrah_makkah_checkout", isoOut);
      } else {
        // remove stale keys if no stay
        localStorage.removeItem("umrah_makkah_checkin");
        localStorage.removeItem("umrah_makkah_checkout");
      }

      if (madinahStays.length > 0) {
        const s = madinahStays[0];
        const isoIn = s.countedCheckInIso || s.isoCheckIn || s.checkIn?.iso;
        const isoOut = s.countedLastNightIso
          ? addDaysIso(s.countedLastNightIso, 1)
          : s.isoCheckOut || s.checkOut?.iso;
        if (isoIn) localStorage.setItem("umrah_madinah_checkin", isoIn);
        if (isoOut) localStorage.setItem("umrah_madinah_checkout", isoOut);
      } else {
        localStorage.removeItem("umrah_madinah_checkin");
        localStorage.removeItem("umrah_madinah_checkout");
      }

      // Navigate back to Umrah Calculator
      navigate("/umrah-calculator");
    } catch (err) {
      console.error("Save plan failed:", err);
      setNote("Failed to save plan. LocalStorage may be full.");
    }
  }

  // Reset display when user manually edits dates
  useEffect(() => {
    // if user edits originalDeparture we want displayDeparture to follow until generate is pressed
    setDisplayDeparture(originalDeparture);
  }, [originalDeparture]); // eslint-disable-line

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 p-6">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 px-4 py-2 mb-4 bg-gray-200 hover:bg-gray-300 rounded-md text-sm"
      >
        ← Back
      </button>

      <div className="max-w-4xl mx-auto">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-teal-600 to-indigo-600 bg-clip-text text-transparent">
              Trip Planner
            </h1>
            <p className="text-sm text-indigo-600 font-medium mt-1">
              Create your complete Makkah + Madinah itinerary
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm px-3 py-2 rounded-md text-white bg-gradient-to-r from-indigo-500 to-teal-500 shadow">
              Smart Auto Planner
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded shadow p-6">
          <form onSubmit={onGenerate} className="space-y-4">
            {/* Departure Date (original vs displayed) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                Departure Date
              </label>
              <input
                type="date"
                value={displayDeparture}
                onChange={(e) => {
                  // when user edits the date manually in input, treat it as changing original
                  onDepartureChange(e.target.value);
                }}
                className="mt-1 block w-full border rounded p-2"
              />
              {/* Note area: show original if different and excluded */}
              {excludeArrival &&
                originalDeparture &&
                originalDeparture !== displayDeparture && (
                  <div className="mt-1 text-sm bg-gradient-to-r from-red-500 via-red-600 to-rose-600 text-white p-2 rounded">
                    Note: The original check-in date was{" "}
                    <strong>{originalDeparture}</strong> — the first night was
                    excluded; the current check-in will be counted:{" "}
                    <strong>{displayDeparture}</strong>
                  </div>
                )}
            </div>

            {/* Days Options */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Preset Days
                </label>
                <select
                  value={totalDays}
                  onChange={(e) => setTotalDays(e.target.value)}
                  disabled={useCustomTotal || useExitDate}
                  className="mt-1 block w-full border rounded p-2"
                >
                  <option value={15}>15 Days</option>
                  <option value={21}>21 Days</option>
                  <option value={28}>28 Days</option>
                </select>
              </div>

              {/* Custom Days */}
              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Custom Total Days
                </label>
                <div className="flex items-center mt-1 gap-2">
                  <input
                    type="checkbox"
                    checked={useCustomTotal}
                    onChange={(e) => {
                      setUseCustomTotal(e.target.checked);
                      if (e.target.checked) setUseExitDate(false);
                    }}
                  />
                  <input
                    type="number"
                    min={1}
                    value={customTotal}
                    onChange={(e) => setCustomTotal(e.target.value)}
                    disabled={!useCustomTotal}
                    className="border rounded p-2 w-full"
                  />
                </div>
              </div>

              {/* Exit Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Set Exit Date
                </label>
                <div className="flex items-center mt-1 gap-2">
                  <input
                    type="checkbox"
                    checked={useExitDate}
                    onChange={(e) => {
                      setUseExitDate(e.target.checked);
                      if (e.target.checked) setUseCustomTotal(false);
                    }}
                  />
                  <input
                    type="date"
                    value={displayExit || exitDateInput}
                    onChange={(e) => {
                      setExitDateInput(e.target.value);
                      onExitChange(e.target.value);
                    }}
                    disabled={!useExitDate}
                    className="border rounded p-2 w-full"
                  />
                </div>

                {excludeExit &&
                  displayExit &&
                  originalExitDate &&
                  displayExit !== originalExitDate && (
                    <div className="mt-1 text-sm bg-gradient-to-r from-red-500 via-red-600 to-rose-600 text-white p-2 rounded">
                      Note: The original departure date was{" "}
                      <strong>{originalExitDate || displayExit}</strong> — the
                      last night was counted; Counted last night:{" "}
                      <strong>{displayExit}</strong>
                    </div>
                  )}
              </div>
            </div>

            {/* Cities */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Start City
                </label>
                <select
                  value={startCity}
                  onChange={(e) => setStartCity(e.target.value)}
                  className="mt-1 block w-full border rounded p-2"
                >
                  <option value="makkah">Makkah</option>
                  <option value="madinah">Madinah</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Exit City
                </label>
                <select
                  value={exitCity}
                  onChange={(e) => setExitCity(e.target.value)}
                  className="mt-1 block w-full border rounded p-2"
                >
                  <option value="makkah">Makkah</option>
                  <option value="madinah">Madinah</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Max MED Nights
                </label>
                <input
                  type="checkbox"
                  checked={maxMadinah}
                  onChange={(e) => setMaxMadinah(e.target.checked)}
                  className="mt-2"
                />
              </div>
            </div>

            {/* NEW UI: exclude arrival/exit and weekend */}
            <div
              className="
    flex flex-col
    sm:flex-row
    sm:items-center
    gap-2 sm:gap-6
    text-sm
  "
            >
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={excludeArrival}
                  onChange={(e) => setExcludeArrival(e.target.checked)}
                />
                Exclude arrival night
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={excludeExit}
                  onChange={(e) => setExcludeExit(e.target.checked)}
                />
                Exclude Exit night
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={markWeekend}
                  onChange={(e) => setMarkWeekend(e.target.checked)}
                />
                Mark weekend nights
              </label>
            </div>

            {/* Theme */}
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                Theme Color
              </label>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setTheme("bg-teal-600")}
                  className="w-8 h-8 rounded bg-teal-600 border-2"
                />
                <button
                  type="button"
                  onClick={() => setTheme("bg-indigo-600")}
                  className="w-8 h-8 rounded bg-indigo-600 border-2"
                />
                <button
                  type="button"
                  onClick={() => setTheme("bg-rose-500")}
                  className="w-8 h-8 rounded bg-rose-500 border-2"
                />
                <button
                  type="button"
                  onClick={() => setTheme("bg-amber-500")}
                  className="w-8 h-8 rounded bg-amber-500 border-2"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded"
              >
                Generate Itinerary
              </button>

              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setAdjustedResult(null);
                  setNote("");
                  setUseCustomTotal(false);
                  setUseExitDate(false);
                  setOriginalDeparture(localToday);
                  setDisplayDeparture(localToday);
                  setOriginalExitDate("");
                  setDisplayExit("");
                  setExitDateInput("");
                  setExcludeArrival(false);
                  setExcludeExit(false);
                  setMarkWeekend(false);
                }}
                className="px-4 py-2 border rounded"
              >
                Reset
              </button>
            </div>

            {note && (
              <div className="mt-2 text-sm bg-yellow-50 p-2 rounded text-gray-700">
                {note}
              </div>
            )}
          </form>
        </div>
        {manualStays && (
          <div className="mb-4 bg-white rounded shadow p-4">
            <h3 className="text-sm font-semibold mb-3">
              Manual Days Adjustment
            </h3>

            {manualStays.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b py-2"
              >
                <div className="capitalize flex items-center gap-2">
                  {s.city} stay {i + 1}
                  {manualStays.length === 3 && (
                    <label className="text-xs flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={s.locked}
                        onChange={() => {
                          setManualStays((prev) =>
                            prev.map((x, idx) =>
                              idx === i ? { ...x, locked: !x.locked } : x
                            )
                          );
                        }}
                      />
                      Lock
                    </label>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onManualAdjust(i, -1)}
                    className="px-2 py-1 border rounded"
                  >
                    −
                  </button>
                  <span className="w-6 text-center">{s.displayDays}</span>
                  <button
                    onClick={() => onManualAdjust(i, +1)}
                    className="px-2 py-1 border rounded"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}

            {manualFridayWarning && (
              <div className="mt-3 p-2 text-sm rounded bg-red-100 text-red-700">
                ⚠️ Manual adjustment ki wajah se travel day Friday ban raha hai.
                Barah-e-karam aik din kam ya zyada karein.
              </div>
            )}
          </div>
        )}

        {/* Results */}
        <div className="mt-6">
          {result ? (
            <>
              <div className="mb-4">
                <TripSummaryCard
                  data={adjustedResult || result}
                  raw={result}
                  excludeArrival={excludeArrival}
                  excludeExit={excludeExit}
                  markWeekend={markWeekend}
                  themeClass={theme}
                  onAccept={() => onAccept()}
                />
              </div>
            </>
          ) : (
            <div className="max-w-4xl mx-auto p-6 text-center text-gray-600">
              Generate a plan to see results here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
