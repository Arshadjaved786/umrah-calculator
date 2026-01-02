// src/services/airportService.js
// Full English-only Airport CRUD service.

import {
  loadAirportsFromStorage,
  saveAirportsToStorage,
} from "../utils/airports";

function generateId(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 9);
}

export function getAllCountries() {
  return loadAirportsFromStorage();
}

export function searchAirports(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];

  const data = loadAirportsFromStorage();
  const results = [];

  data.forEach((country) => {
    if (country.country.toLowerCase().includes(q)) {
      country.airports.forEach((a) =>
        results.push({ ...a, country: country.country })
      );
    } else {
      country.airports.forEach((a) => {
        if (
          a.name.toLowerCase().includes(q) ||
          a.iata.toLowerCase().includes(q)
        ) {
          results.push({ ...a, country: country.country });
        }
      });
    }
  });

  return results;
}

export function addCountry({ country }) {
  const data = loadAirportsFromStorage();
  const newItem = { id: generateId("country-"), country, airports: [] };
  data.push(newItem);
  saveAirportsToStorage(data);
  return newItem;
}

export function updateCountry(id, { country }) {
  const data = loadAirportsFromStorage();
  const index = data.findIndex((c) => c.id === id);
  if (index === -1) return null;
  data[index].country = country;
  saveAirportsToStorage(data);
  return data[index];
}

export function deleteCountry(id) {
  let data = loadAirportsFromStorage();
  data = data.filter((c) => c.id !== id);
  saveAirportsToStorage(data);
  return true;
}

export function addAirportToCountry(countryId, { name, iata }) {
  const data = loadAirportsFromStorage();
  const country = data.find((c) => c.id === countryId);
  if (!country) return null;
  const airport = { id: generateId("ap-"), name, iata: iata.toUpperCase() };
  country.airports.push(airport);
  saveAirportsToStorage(data);
  return airport;
}

export function updateAirport(countryId, airportId, { name, iata }) {
  const data = loadAirportsFromStorage();
  const country = data.find((c) => c.id === countryId);
  if (!country) return null;
  const airport = country.airports.find((a) => a.id === airportId);
  if (!airport) return null;
  airport.name = name;
  airport.iata = iata.toUpperCase();
  saveAirportsToStorage(data);
  return airport;
}

export function deleteAirport(countryId, airportId) {
  const data = loadAirportsFromStorage();
  const country = data.find((c) => c.id === countryId);
  if (!country) return false;
  country.airports = country.airports.filter((a) => a.id !== airportId);
  saveAirportsToStorage(data);
  return true;
}
