// src/pages/ManageAirportsPage.jsx
// Manage Airports page with top search bar (reuses AirportSearch component).
// Beginner-friendly, full file replacement.

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AirportSearch from "../components/AirportSearch";
import {
  getAllCountries as loadCountriesFromService,
  addCountry as addCountryService,
  addAirportToCountry,
  updateCountry,
  deleteCountry,
  updateAirport,
  deleteAirport,
} from "../services/airportService";

/*
  Simple ManageAirportsPage:
  - shows AirportSearch at top (same search UI as home)
  - below shows Add Country form and list of countries with airports
  - beginner-friendly UI and code
*/

export default function ManageAirportsPage() {
  const navigate = useNavigate();

  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add country form
  const [newCountry, setNewCountry] = useState("");

  // small helpers for adding / editing
  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await loadCountriesFromService();
      // ensure it's an array
      setCountries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load countries:", err);
      setCountries([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCountry(e) {
    e.preventDefault();
    const name = (newCountry || "").trim();
    if (!name) return alert("Country name لکھیں (English)");
    try {
      const created = await addCountryService({ country: name });
      // refresh list
      await load();
      setNewCountry("");
    } catch (err) {
      console.error(err);
      alert("Unable to add country");
    }
  }

  // Inline Add Airport under a country
  async function handleAddAirport(countryId, name, iata, resetFn) {
    if (!name || !iata) return alert("Airport name اور IATA دونوں لکھیں");
    try {
      await addAirportToCountry(countryId, {
        name: name.trim(),
        iata: iata.trim(),
      });
      await load();
      if (typeof resetFn === "function") resetFn();
    } catch (err) {
      console.error(err);
      alert("Unable to add airport");
    }
  }

  // Simple delete helpers
  async function handleDeleteCountry(id) {
    if (!confirm("کیا آپ واقعی اس ملک کو حذف کرنا چاہتے ہیں؟")) return;
    await deleteCountry(id);
    await load();
  }

  async function handleDeleteAirport(countryId, airportId) {
    if (!confirm("کیا آپ واقعی یہ airport حذف کرنا چاہتے ہیں؟")) return;
    await deleteAirport(countryId, airportId);
    await load();
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Top: Back button + Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-2xl font-semibold">Manage Airports</h2>
        </div>

        <div>
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-2 border rounded hover:bg-gray-100"
          >
            Back
          </button>
        </div>
      </div>

      {/* --- SEARCH BAR (reuse AirportSearch) --- */}
      <div className="mb-4">
        <AirportSearch />
      </div>

      {/* Add Country box */}
      <div className="bg-white border rounded p-4 shadow-sm mb-4">
        <form onSubmit={handleAddCountry} className="flex gap-3 items-center">
          <input
            placeholder="Country name (English)"
            value={newCountry}
            onChange={(e) => setNewCountry(e.target.value)}
            className="flex-1 p-2 border rounded"
          />
          <button className="px-4 py-2 bg-blue-600 text-white rounded">
            Add
          </button>
        </form>
      </div>

      {/* Countries list */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-4 text-gray-600">Loading...</div>
        ) : countries.length === 0 ? (
          <div className="p-4 bg-white border rounded">No countries found.</div>
        ) : (
          countries.map((c) => (
            <CountryCard
              key={c.id}
              country={c}
              refresh={load}
              onDelete={handleDeleteCountry}
              onAddAirport={handleAddAirport}
              onDeleteAirport={handleDeleteAirport}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* Small component to display a country and its airports */
function CountryCard({
  country,
  refresh,
  onDelete,
  onAddAirport,
  onDeleteAirport,
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [aName, setAName] = useState("");
  const [aIata, setAIata] = useState("");

  return (
    <div className="bg-white border rounded p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold text-lg">{country.country}</div>
          <div className="text-xs text-gray-500">ID: {country.id}</div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowAdd((s) => !s)}
            className="px-3 py-1 border rounded hover:bg-gray-50"
          >
            {showAdd ? "Close" : "Add Airport"}
          </button>

          <button
            onClick={() => onDelete(country.id)}
            className="px-3 py-1 border rounded text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Airports list */}
      <div className="mt-4 space-y-2">
        {Array.isArray(country.airports) && country.airports.length > 0 ? (
          country.airports.map((a) => (
            <div
              key={a.id}
              className="p-3 border rounded flex items-center justify-between bg-gray-50"
            >
              <div>
                <div className="font-medium">{a.name}</div>
                <div className="text-xs text-gray-600">
                  IATA: {a.iata} — ID: {a.id}
                </div>
              </div>

              <div className="flex gap-2 items-center">
                {/* simple delete */}
                <button
                  onClick={() => onDeleteAirport(country.id, a.id)}
                  className="px-2 py-1 text-sm border rounded text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-2 text-sm text-gray-600">No airports yet.</div>
        )}
      </div>

      {/* Add airport form */}
      {showAdd && (
        <div className="mt-3 bg-white p-3 border rounded">
          <div className="flex gap-2 items-center">
            <input
              placeholder="Airport name"
              value={aName}
              onChange={(e) => setAName(e.target.value)}
              className="flex-1 p-2 border rounded"
            />
            <input
              placeholder="IATA (e.g. KHI)"
              value={aIata}
              onChange={(e) => setAIata(e.target.value.toUpperCase())}
              className="w-32 p-2 border rounded"
            />
            <button
              onClick={() => {
                onAddAirport(country.id, aName, aIata, () => {
                  setAName("");
                  setAIata("");
                  setShowAdd(false);
                });
              }}
              className="px-3 py-2 bg-blue-600 text-white rounded"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
