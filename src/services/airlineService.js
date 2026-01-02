// src/services/airlineService.js
import airlinesData from "../data/airlines.json";

const STORAGE_KEY = "umrah_app_airlines_v1";

function readFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error("airlineService: failed to read from localStorage", e);
    return null;
  }
}

function writeToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("airlineService: failed to write to localStorage", e);
  }
}

function initData() {
  const stored = readFromStorage();
  if (stored && Array.isArray(stored)) return stored;
  // clone default data to avoid accidental mutation
  const cloned = airlinesData.map((a) => ({ ...a }));
  writeToStorage(cloned);
  return cloned;
}

let airlines = initData();

export function getAllAirlines() {
  // return a shallow copy
  return [...airlines];
}

export function getAirlineById(id) {
  return airlines.find((a) => a.id === id) || null;
}

export function addAirline({ name, code, logo = null }) {
  const id = "air-" + Date.now();
  const newAir = { id, name, code, logo };
  airlines = [newAir, ...airlines];
  writeToStorage(airlines);
  return newAir;
}

export function updateAirline(id, { name, code, logo = null }) {
  airlines = airlines.map((a) =>
    a.id === id ? { ...a, name, code, logo } : a
  );
  writeToStorage(airlines);
  return getAirlineById(id);
}

export function removeAirline(id) {
  const before = airlines.length;
  airlines = airlines.filter((a) => a.id !== id);
  writeToStorage(airlines);
  return airlines.length < before;
}

export function resetAirlinesToDefault() {
  const cloned = airlinesData.map((a) => ({ ...a }));
  airlines = cloned;
  writeToStorage(airlines);
  return getAllAirlines();
}
