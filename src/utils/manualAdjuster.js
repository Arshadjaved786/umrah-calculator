// src/utils/manualAdjuster.js
// Manual adjustment helper for TripPlanner
// Purpose:
// - Adjust days (+ / -) for a specific stay
// - Keep TOTAL DAYS FIXED (never allow overflow)
// - Respect LOCKED stays (only when 3 stays)
// - Recalculate dates chain (check-in / check-out)
// - Detect Friday travel (WARNING only, no auto-fix)
// - Emit WARNING when balance is NOT possible

function parseIsoToDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(date, n) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + n);
  return d;
}

function isFriday(date) {
  return date.getDay() === 5;
}

/**
 * adjustStaysManually
 *
 * @param {Array} stays
 *   Each stay must have:
 *   - city
 *   - displayDays
 *   - isoCheckIn
 *   - locked (boolean)
 *
 * @param {number} targetIndex
 * @param {number} delta (+1 / -1)
 *
 * @returns {Object}
 * {
 *   stays,
 *   fridayWarning,
 *   balanceWarning
 * }
 */
export function adjustStaysManually(stays, targetIndex, delta) {
  if (!Array.isArray(stays)) {
    return { stays, fridayWarning: false, balanceWarning: false };
  }

  // Deep copy
  const updated = stays.map((s) => ({ ...s }));

  const target = updated[targetIndex];
  if (!target) {
    return { stays: updated, fridayWarning: false, balanceWarning: false };
  }

  const useLock = updated.length === 3;

  // Locked target cannot be changed
  if (useLock && target.locked) {
    return { stays: updated, fridayWarning: false, balanceWarning: true };
  }

  // Minimum 1 day rule
  if (target.displayDays + delta < 1) {
    return { stays: updated, fridayWarning: false, balanceWarning: true };
  }

  // ------------------------------------
  // BALANCE CHECK (BEFORE APPLYING DELTA)
  // ------------------------------------
  let balanceIndex = -1;

  if (delta > 0) {
    // Need some other stay to GIVE 1 day
    let maxDays = 0;
    updated.forEach((s, i) => {
      if (i === targetIndex) return;
      if (useLock && s.locked) return;
      if (s.displayDays > 1 && s.displayDays > maxDays) {
        maxDays = s.displayDays;
        balanceIndex = i;
      }
    });

    // ❌ No stay available to reduce → BLOCK
    if (balanceIndex === -1) {
      return {
        stays: updated,
        fridayWarning: false,
        balanceWarning: true,
      };
    }
  }

  if (delta < 0) {
    // Need some other stay to RECEIVE 1 day
    let minDays = Infinity;
    updated.forEach((s, i) => {
      if (i === targetIndex) return;
      if (useLock && s.locked) return;
      if (s.displayDays < minDays) {
        minDays = s.displayDays;
        balanceIndex = i;
      }
    });

    // ❌ No stay available to add → BLOCK
    if (balanceIndex === -1) {
      return {
        stays: updated,
        fridayWarning: false,
        balanceWarning: true,
      };
    }
  }

  // ------------------------------------
  // APPLY DELTA (SAFE NOW)
  // ------------------------------------
  target.displayDays += delta;

  if (delta > 0 && balanceIndex !== -1) {
    updated[balanceIndex].displayDays -= 1;
  }

  if (delta < 0 && balanceIndex !== -1) {
    updated[balanceIndex].displayDays += 1;
  }

  // ------------------------------------
  // REBUILD DATE CHAIN
  // ------------------------------------
  let fridayWarning = false;

  let cursor = parseIsoToDate(updated[0].isoCheckIn);

  updated.forEach((s, i) => {
    s.isoCheckIn = formatDate(cursor);

    const lastNight = addDays(cursor, s.displayDays - 1);
    const checkOut = addDays(lastNight, 1);

    if (i < updated.length - 1 && isFriday(checkOut)) {
      fridayWarning = true;
    }

    s.isoLastNight = formatDate(lastNight);
    s.isoCheckOutDay = formatDate(checkOut);

    cursor = checkOut;
  });

  return {
    stays: updated,
    fridayWarning,
    balanceWarning: false,
  };
}
