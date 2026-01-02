// src/services/packageService.js
// سادہ package service: LocalStorage میں packages save / list / load / delete کرتا ہے
// استعمال کرنے کا طریقہ (مثلاً): import { savePackage, listPackages } from "../services/packageService";

import { v4 as uuidv4 } from "uuid";

// LocalStorage key
const STORAGE_KEY = "umrah_packages";

/**
 * helper: read packages array from localStorage (safe)
 */
function _readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch (err) {
    console.error("packageService: read error", err);
    return [];
  }
}

/**
 * helper: write packages array to localStorage
 */
function _writeAll(arr) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr || []));
    return true;
  } catch (err) {
    console.error("packageService: write error", err);
    return false;
  }
}

/**
 * Save a consolidated package snapshot.
 * - If pkg.id present -> update existing
 * - If no id -> create new id + createdAt
 * Returns saved package object (with id and createdAt) or null on failure.
 *
 * Expect pkg to be a plain object with fields:
 * { agency, itinerary, hotelsSelected, flights, visa, transport, pax, profit, totals, ... }
 */
export function savePackage(pkg) {
  console.log("🔥 savePackage CALLED", pkg);

  try {
    const all = _readAll();

    const now = new Date().toISOString();
    let toSave = { ...(pkg || {}) };

    if (!toSave.id) {
      toSave.id = `pkg_${uuidv4()}`;
      toSave.createdAt = now;
    } else if (!toSave.createdAt) {
      toSave.createdAt = now;
    }
    toSave.updatedAt = now;

    // minimal normalization: ensure totals object
    if (!toSave.totals) toSave.totals = {};

    // if itinerary not provided, try to grab umrah_last_plan from localStorage
    if (!toSave.itinerary) {
      try {
        const last = localStorage.getItem("umrah_last_plan");
        if (last) toSave.itinerary = JSON.parse(last);
      } catch (e) {
        // ignore
      }
    }

    // update existing if present
    const idx = all.findIndex((x) => x.id === toSave.id);
    if (idx >= 0) {
      all[idx] = toSave;
    } else {
      all.unshift(toSave); // newest first
    }

    const ok = _writeAll(all);
    return ok ? toSave : null;
  } catch (err) {
    console.error("packageService.savePackage error", err);
    return null;
  }
}

/**
 * List all saved packages (most recent first)
 */
export function listPackages() {
  return _readAll();
}

/**
 * Load a single package by id (returns object or null)
 */
export function loadPackage(id) {
  if (!id) return null;
  const all = _readAll();
  return all.find((p) => p.id === id) || null;
}

/**
 * Delete package by id. Returns true if deleted, false otherwise.
 */
export function deletePackage(id) {
  if (!id) return false;
  const all = _readAll();
  const next = all.filter((p) => p.id !== id);
  if (next.length === all.length) return false; // nothing removed
  return _writeAll(next);
}

/**
 * Replace (overwrite) a package fully (must contain id).
 * Returns saved package or null.
 */
export function replacePackage(pkg) {
  if (!pkg || !pkg.id) return null;
  return savePackage(pkg);
}

export default {
  savePackage,
  listPackages,
  loadPackage,
  deletePackage,
  replacePackage,
};
