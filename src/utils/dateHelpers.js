// src/utils/dateHelpers.js
// Robust date helpers + itinerary generator
// - Safe parseDate for Date objects, timestamps, "YYYY-MM-DD", ISO strings
// - Two-part vs three-part distribution (two-part when startCity !== exitCity)
// - Keeps checkIn, lastNight, checkOut (day-of-departure) clearly separated
// - Returns segments useful for UI: checkIn/checkOut/lastNight + iso fields

function parseDate(d) {
  if (d === null || d === undefined) return null;

  // Date object
  if (d instanceof Date)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());

  // number timestamp
  if (typeof d === "number" && !isNaN(d)) {
    const dt = new Date(d);
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  }

  // string: strict YYYY-MM-DD only OR full ISO (T/Z) -> handle safely
  if (typeof d === "string") {
    const s = d.trim();

    // If string is exactly YYYY-MM-DD (no time part) -> parse as local Y/M/D
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const parts = s.split("-");
      const y = Number(parts[0]);
      const m = Number(parts[1]) - 1;
      const day = Number(parts[2]);
      return new Date(y, m, day);
    }

    // If string contains time-part (T or Z), treat as full ISO -> use Date ctor then normalize
    // This prevents incorrectly using UTC-date prefix (which caused off-by-one)
    if (/[TtZz]/.test(s)) {
      const dt = new Date(s);
      if (!isNaN(dt.getTime())) {
        return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
      }
      return null;
    }

    // fallback: try Date constructor and normalize
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) {
      return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    }
    return null;
  }

  // last fallback
  const dt = new Date(d);
  if (!isNaN(dt.getTime()))
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  return null;
}

function formatDate(d) {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) {
    return { iso: "Invalid", human: "Invalid Date", weeknights: NaN };
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    iso: `${yyyy}-${mm}-${dd}`,
    human: `${dd} ${d.toLocaleString("en-US", { month: "short" })} (${
      days[d.getDay()]
    })`,
    weeknights: d.getDay(),
  };
}

function addDays(date, n) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + n);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// inclusive diff (number of nights/days inclusive)
function diffDaysInclusive(a, b) {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000)) + 1;
}

function isFriday(date) {
  return date.getDay() === 5;
}

const DEFAULT_DISTS = {
  15: [6, 6, 3],
  21: [8, 9, 4],
  28: [10, 10, 8],
};

function distFromTotalDays(totalDays) {
  // default ratio 40/40/20
  const w1 = 0.4,
    w2 = 0.4;
  let a = Math.round(totalDays * w1);
  let b = Math.round(totalDays * w2);
  let c = totalDays - (a + b);
  if (a < 1) a = 1;
  if (b < 1) b = 1;
  if (c < 1) {
    c = totalDays - (a + b);
    if (c < 1) {
      c = 1;
      if (a > b) a = Math.max(1, a - 1);
      else b = Math.max(1, b - 1);
    }
  }
  const sum = a + b + c;
  if (sum !== totalDays) {
    const diff = totalDays - sum;
    a += diff;
  }
  return [a, b, c];
}

function applyMaxMadinah(dist) {
  let [a, b, c] = dist.slice();
  let shifts = 0;
  while (shifts < 4) {
    if (a > 2) {
      a -= 1;
      b += 1;
      shifts++;
      continue;
    }
    if (c > 2) {
      c -= 1;
      b += 1;
      shifts++;
      continue;
    }
    break;
  }
  return [a, b, c];
}

/**
 * For two-part trips (startCity !== exitCity), split totalDays into two parts
 * using floor/ceil so odd numbers distribute sensibly.
 */
function twoPartDist(totalDays) {
  const first = Math.floor(totalDays / 2);
  const second = totalDays - first;
  // ensure min 1
  return [Math.max(1, first), Math.max(1, second)];
}

/**
 * Build stays:
 * - startDate: Date object OR ISO string acceptable by parseDate
 * - distribution: array of days (either [a,b] or [a,b,c])
 * - startCity, exitCity: strings
 *
 * Internal representation:
 * - checkIn: Date (local)
 * - lastNight: Date (local) = checkIn + (displayDays - 1)
 * - checkOut: Date (local) = lastNight + 1 (day-of-departure / travel day)
 */
function buildStays(startDate, distribution, startCity, exitCity) {
  // normalize startDate
  let cursor = parseDate(startDate);
  if (!cursor) throw new Error("Invalid startDate");

  // decide sequence of cities based on distribution length and start/exit
  let seqCities = [];
  if (distribution.length === 2) {
    // two-part: first stays in startCity, second in exitCity
    seqCities = [startCity, exitCity];
  } else {
    // three-part default: startCity, other, last depends on exitCity
    if (startCity === "madinah") {
      seqCities = [
        "madinah",
        "makkah",
        exitCity === "madinah" ? "madinah" : "makkah",
      ];
    } else {
      seqCities = [
        "makkah",
        "madinah",
        exitCity === "madinah" ? "madinah" : "makkah",
      ];
    }
  }

  const stays = [];
  for (let i = 0; i < distribution.length; i++) {
    const days = distribution[i];
    const checkIn = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate()
    );
    const lastNight = addDays(checkIn, days - 1);
    const checkOut = addDays(lastNight, 1); // day-of-departure
    stays.push({
      city: seqCities[i],
      days,
      displayDays: days,
      checkIn,
      lastNight,
      checkOut,
    });
    // move cursor to checkOut (no gap)
    cursor = new Date(
      checkOut.getFullYear(),
      checkOut.getMonth(),
      checkOut.getDate()
    );
  }
  return stays;
}

/**
 * Apply Friday rule and adjust stays so there's no travel on Friday:
 * - If travelDate (prev.checkOut) is Friday, give previous one extra night and shift subsequent stays
 */
function applyFridayAndAdjust(stays) {
  stays.forEach((s) => {
    s.displayDays = Number(s.displayDays);
  });

  for (let i = 0; i < stays.length - 1; i++) {
    let prev = stays[i];
    let next = stays[i + 1];

    let travelDate = prev.checkOut; // day-of-departure

    if (isFriday(travelDate)) {
      const delta = 1; // shift forward by one day
      prev.displayDays = (prev.displayDays || prev.days) + 1;
      next.displayDays = Math.max(1, (next.displayDays || next.days) - 1);

      prev.lastNight = addDays(prev.lastNight, delta);
      prev.checkOut = addDays(prev.checkOut, delta);

      // shift all subsequent stays
      for (let j = i + 1; j < stays.length; j++) {
        const s = stays[j];
        s.checkIn = addDays(s.checkIn, delta);
        s.lastNight = addDays(s.lastNight, delta);
        s.checkOut = addDays(s.checkOut, delta);
      }

      // recompute next based on updated prev.checkOut
      next.checkIn = new Date(
        prev.checkOut.getFullYear(),
        prev.checkOut.getMonth(),
        prev.checkOut.getDate()
      );
      next.lastNight = addDays(next.checkIn, next.displayDays - 1);
      next.checkOut = addDays(next.lastNight, 1);

      // fix further
      for (let k = i + 2; k < stays.length; k++) {
        const before = stays[k - 1];
        const cur = stays[k];
        cur.checkIn = new Date(
          before.checkOut.getFullYear(),
          before.checkOut.getMonth(),
          before.checkOut.getDate()
        );
        cur.lastNight = addDays(cur.checkIn, cur.displayDays - 1);
        cur.checkOut = addDays(cur.lastNight, 1);
      }
    } else {
      // normal chain: next.checkIn = travelDate
      next.checkIn = new Date(
        travelDate.getFullYear(),
        travelDate.getMonth(),
        travelDate.getDate()
      );
      next.lastNight = addDays(next.checkIn, next.displayDays - 1);
      next.checkOut = addDays(next.lastNight, 1);
      for (let k = i + 2; k < stays.length; k++) {
        const prevS = stays[k - 1];
        const cur = stays[k];
        cur.checkIn = new Date(
          prevS.checkOut.getFullYear(),
          prevS.checkOut.getMonth(),
          prevS.checkOut.getDate()
        );
        cur.lastNight = addDays(cur.checkIn, cur.displayDays - 1);
        cur.checkOut = addDays(cur.lastNight, 1);
      }
    }
  }

  stays.forEach((s) => {
    if (!s.checkIn) s.checkIn = parseDate("1970-01-01");
    if (!s.lastNight)
      s.lastNight = addDays(s.checkIn, (s.displayDays || s.days) - 1);
    if (!s.checkOut) s.checkOut = addDays(s.lastNight, 1);
  });

  return stays;
}

/**
 * Build segments for UI and for TripPlanner core consumers.
 *
 * Segment structure:
 * - stay segments have: type: "stay", city, days, displayDays, checkIn(format), checkOut(format), isoCheckIn, isoCheckOut (ISO of lastNight), lastNight(format)
 * - travel segments have: type: "travel", date(format) and iso (ISO of travel day = day-of-departure)
 *
 * Note: isoCheckOut is intentionally the ISO of lastNight (so UI that wants to show "exit date" can use that).
 *       travel segment 'iso' uses the actual travel date (checkOut).
 */
function buildSegmentsFromStays(stays) {
  const segments = [];

  for (let i = 0; i < stays.length; i++) {
    const s = stays[i];
    // normalize formatted pieces once for clarity
    const fmtCheckIn = formatDate(s.checkIn);
    const fmtLastNight = formatDate(s.lastNight);
    const fmtCheckOut = formatDate(s.checkOut);

    segments.push({
      type: "stay",
      city: s.city,
      days: s.days,
      displayDays: s.displayDays,
      checkIn: fmtCheckIn,
      // checkOut: day-of-departure (travel day) - keep for travel segment
      checkOut: fmtCheckOut,
      isoCheckIn: fmtCheckIn.iso,
      // explicit separate fields to avoid confusion:
      isoLastNight: fmtLastNight.iso, // last counted night (previously named isoCheckOut)
      isoCheckOutDay: fmtCheckOut.iso, // actual day-of-departure (travel date)
      lastNight: fmtLastNight,
    });

    // travel segment (day-of-departure) — only between stays
    if (i < stays.length - 1) {
      segments.push({
        type: "travel",
        date: formatDate(s.checkOut),
        iso: formatDate(s.checkOut).iso,
      });
    }
  }

  return segments;
}

/**
 * Travel infos — gives original planned travel dates and alternates around Friday
 */
function buildTravelInfosBeforeAdjust(initialStays, finalSegments) {
  const travelInfos = [];
  for (let i = 0; i < initialStays.length - 1; i++) {
    const origPrev = initialStays[i];
    const origTravel = addDays(parseDate(origPrev.checkIn), origPrev.days);
    const originalFmt = formatDate(origTravel);
    const travelSegs = finalSegments.filter((s) => s.type === "travel");
    const finalTravelSeg = travelSegs[i];
    const defaultFmt = finalTravelSeg ? finalTravelSeg.date : originalFmt;
    if (isFriday(origTravel)) {
      const alt1 = formatDate(addDays(origTravel, -1));
      const alt2 = formatDate(addDays(origTravel, 1));
      travelInfos.push({
        original: originalFmt,
        default: defaultFmt,
        alternates: [alt1, alt2],
      });
    } else {
      travelInfos.push({
        original: originalFmt,
        default: defaultFmt,
        alternates: [],
      });
    }
  }
  return travelInfos;
}

/**
 * Main generator
 * opts: { departureDate, totalDays, exitDate, startCity, exitCity, maxMadinah }
 */
export function generateItinerary(opts) {
  const {
    departureDate,
    totalDays: userTotalDays,
    exitDate,
    startCity = "makkah",
    exitCity = "makkah",
    maxMadinah = false,
  } = opts || {};

  const dep = parseDate(departureDate);
  if (!dep || isNaN(dep.getTime())) return { error: "Invalid departure date" };

  let totalDays;
  if (exitDate) {
    const ex = parseDate(exitDate);
    if (!ex || isNaN(ex.getTime())) return { error: "Invalid exit date" };
    totalDays = diffDaysInclusive(dep, ex);
    if (totalDays < 1)
      return { error: "Exit date must be same or after departure date" };
  } else if (userTotalDays) {
    totalDays = Number(userTotalDays);
    if (!Number.isInteger(totalDays) || totalDays < 1)
      return { error: "totalDays must be a positive integer" };
  } else {
    totalDays = 15;
  }

  // choose distribution
  let distribution;
  if (startCity !== exitCity) {
    // two-part
    distribution = twoPartDist(totalDays);
  } else {
    // three-part preferred
    distribution = DEFAULT_DISTS[totalDays]
      ? DEFAULT_DISTS[totalDays].slice()
      : distFromTotalDays(totalDays);
  }

  // apply maxMadinah only for three-part (safe)
  if (maxMadinah && distribution.length === 3) {
    distribution = applyMaxMadinah(distribution);
  }

  const initialStays = buildStays(dep, distribution, startCity, exitCity);

  // deep copy and normalize Dates to plain Date objects
  const workingStays = JSON.parse(JSON.stringify(initialStays));
  for (let s of workingStays) {
    s.checkIn = parseDate(s.checkIn);
    s.lastNight = parseDate(s.lastNight);
    s.checkOut = parseDate(s.checkOut);
    s.displayDays = Number(s.displayDays);
    s.days = Number(s.days);
  }

  const adjustedStays = applyFridayAndAdjust(workingStays);

  const segments = buildSegmentsFromStays(adjustedStays);

  const travelInfos = buildTravelInfosBeforeAdjust(initialStays, segments);

  // compute nights per city (use adjustedStays displayDays)
  let makkahNights = 0,
    madinahNights = 0;
  adjustedStays.forEach((s) => {
    if (s.city === "makkah") makkahNights += s.displayDays || s.days || 0;
    if (s.city === "madinah") madinahNights += s.displayDays || s.days || 0;
  });

  const notes = [];
  notes.push(`Distribution used: ${distribution.join(" / ")}`);
  if (maxMadinah) notes.push("Max Madinah ON");
  if (startCity === "madinah") notes.push("Start City: Madinah");
  if (exitCity && exitCity !== "makkah") notes.push(`Exit City: ${exitCity}`);
  notes.push(`Total days: ${totalDays}`);

  return {
    raw: {
      departure: formatDate(dep),
      totalDays,
      distribution,
      startCity,
      exitCity,
    },
    segments,
    travelInfos,
    makkahNights,
    madinahNights,
    notes,
  };
}
