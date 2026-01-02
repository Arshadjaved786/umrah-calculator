// src/utils/airports.js
// LocalStorage helpers and bundled default airports.
// This version autodetects whether the bundled or stored data is a flat
// airport list (array of {id,name,iata,country}) and converts it into the
// grouped-by-country shape that the rest of the app expects.

// Try to import JSON data if it exists in src/data/airports.json.
let bundledAirports = null;
try {
  // Use require inside try/catch so build doesn't fail if file missing.
  // When file exists, bundler will include it.
  // @ts-ignore
  bundledAirports = require("../data/airports.json");
} catch (e) {
  bundledAirports = null;
}

const STORAGE_KEY = "umrah_airports_v1";

/**
 * Helper: detect if array looks like a flat airports list
 * (items have `iata` property and `country` field).
 */
function isFlatAirportArray(arr) {
  return (
    Array.isArray(arr) &&
    arr.length > 0 &&
    typeof arr[0] === "object" &&
    ("iata" in arr[0] || ("country" in arr[0] && "iata" in arr[0]))
  );
}

/**
 * Convert flat airports array -> grouped by country:
 * Input: [{id,name,iata,country}, ...]
 * Output: [{ id: "country-xxx", country: "Country", airports: [{id,name,iata}, ...] }, ...]
 */
function groupFlatAirports(flat) {
  const map = {};
  flat.forEach((a) => {
    const country = (a.country || "Unknown").trim();
    if (!map[country]) map[country] = [];
    map[country].push({
      id:
        a.id ||
        (a.iata
          ? a.iata.toLowerCase()
          : Math.random().toString(36).slice(2, 8)),
      name: a.name || a.iata || "Unknown",
      iata: (a.iata || "").toUpperCase(),
    });
  });

  return Object.keys(map).map((country) => ({
    id:
      "country-" +
      country
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9\-]/g, ""),
    country,
    airports: map[country],
  }));
}

/**
 * Fallback grouped default (keeps original small default)
 */
const fallbackGrouped = [
  {
    id: "country-sa",
    country: "Saudi Arabia",
    airports: [
      { id: "ruh", name: "King Khalid International Airport", iata: "RUH" },
      { id: "jed", name: "King Abdulaziz International Airport", iata: "JED" },
      { id: "med", name: "Prince Mohammad bin Abdulaziz Airport", iata: "MED" },
    ],
  },
  {
    id: "country-pk",
    country: "Pakistan",
    airports: [
      { id: "khi", name: "Jinnah International Airport", iata: "KHI" },
      { id: "lhe", name: "Allama Iqbal International Airport", iata: "LHE" },
      { id: "isb", name: "Islamabad International Airport", iata: "ISB" },
    ],
  },
  {
    id: "country-us",
    country: "United States",
    airports: [
      { id: "jfk", name: "John F. Kennedy International Airport", iata: "JFK" },
      { id: "lax", name: "Los Angeles International Airport", iata: "LAX" },
    ],
  },
];

/**
 * initialAirports: prefer bundledAirports if present.
 * If bundledAirports is flat -> convert it to grouped.
 * If bundledAirports is already grouped -> use as-is.
 * If nothing present -> fallbackGrouped
 */
export const initialAirports = (() => {
  if (bundledAirports) {
    if (isFlatAirportArray(bundledAirports)) {
      try {
        return groupFlatAirports(bundledAirports);
      } catch (e) {
        console.error("Failed to group bundledAirports, falling back:", e);
        return fallbackGrouped;
      }
    } else if (
      Array.isArray(bundledAirports) &&
      bundledAirports.length &&
      bundledAirports[0].airports
    ) {
      // Looks already grouped
      return bundledAirports;
    } else {
      return fallbackGrouped;
    }
  }
  return fallbackGrouped;
})();

/**
 * Read from localStorage. If empty -> save initialAirports and return.
 * If localStorage contains a flat airports array -> convert it and save grouped.
 * This ensures old flat data (or manual paste) will work.
 */
export function loadAirportsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Save the initial (grouped) data and return it
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialAirports));
      return initialAirports;
    }

    const parsed = JSON.parse(raw);

    // If parsed is a flat array (old data), convert it to grouped and save
    if (isFlatAirportArray(parsed)) {
      const grouped = groupFlatAirports(parsed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(grouped));
      return grouped;
    }

    // If parsed already grouped, return as-is
    if (Array.isArray(parsed) && parsed.length && parsed[0].airports) {
      return parsed;
    }

    // anything unexpected -> overwrite with initialAirports
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialAirports));
    return initialAirports;
  } catch (e) {
    console.error("loadAirportsFromStorage error:", e);
    return initialAirports;
  }
}

export function saveAirportsToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("saveAirportsToStorage error:", e);
    return false;
  }
}
