// src/pages/ManageAirlinesPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  getAllAirlines,
  addAirline,
  updateAirline,
  removeAirline,
  resetAirlinesToDefault,
} from "../services/airlineService";

const STORAGE_KEY = "umrah_airline_search";

export default function ManageAirlinesPage() {
  const [airlines, setAirlines] = useState([]);
  const [mode, setMode] = useState("list"); // list | add | edit
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", code: "" });

  // NEW: search state
  const [search, setSearch] = useState("");

  useEffect(() => {
    refresh();

    // initialize search from localStorage
    const initial = localStorage.getItem(STORAGE_KEY);
    if (initial) setSearch(initial);

    // listen for storage events (other tabs)
    function onStorage(e) {
      if (e.key === STORAGE_KEY) {
        const val = e.newValue || "";
        if (val !== search) setSearch(val);
      }
    }
    window.addEventListener("storage", onStorage);

    // listen for custom event (same tab)
    function onCustom(e) {
      const val = (e && e.detail) || "";
      if (val !== search) setSearch(val);
    }
    window.addEventListener("airlineSearch", onCustom);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("airlineSearch", onCustom);
    };
  }, []);

  function refresh() {
    const all = getAllAirlines();
    setAirlines(all);
    setMode("list");
    setEditing(null);
    setForm({ name: "", code: "" });
    // do not clear search here, we intentionally keep it
  }

  function handleAddClick() {
    setMode("add");
    setForm({ name: "", code: "" });
  }

  function handleEditClick(item) {
    setMode("edit");
    setEditing(item);
    setForm({ name: item.name, code: item.code });
  }

  function handleDeleteClick(id) {
    if (!confirm("Are you sure you want to delete this airline?")) return;
    removeAirline(id);
    refresh();
  }

  function handleResetDefaults() {
    if (!confirm("Restore default airlines?")) return;
    resetAirlinesToDefault();
    refresh();
  }

  function handleSubmit(e) {
    e.preventDefault();
    const name = form.name.trim();
    const code = form.code.trim().toUpperCase();
    if (!name || !code) {
      alert("Please fill both Name and Code.");
      return;
    }
    if (mode === "add") {
      addAirline({ name, code, logo: null });
    } else if (mode === "edit" && editing) {
      updateAirline(editing.id, { name, code, logo: editing.logo ?? null });
    }
    refresh();
  }

  // whenever search changes locally, save and dispatch to sync
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, search);
    } catch (err) {
      console.error("Failed to write search to localStorage", err);
    }
    const ev = new CustomEvent("airlineSearch", { detail: search });
    window.dispatchEvent(ev);
  }, [search]);

  // derive filtered list using search (search by name or code)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return airlines;
    return airlines.filter((a) => {
      return (
        a.name.toLowerCase().includes(q) ||
        (a.code && a.code.toLowerCase().includes(q))
      );
    });
  }, [airlines, search]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Manage Airlines</h1>
        <div className="flex gap-2">
          <button
            onClick={handleResetDefaults}
            className="px-3 py-1 bg-gray-100 rounded"
          >
            Reset Defaults
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            className="px-3 py-1 bg-gray-200 rounded"
          >
            Back
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-5">
        {/* LIST VIEW */}
        {mode === "list" && (
          <>
            {/* SEARCH BAR */}
            <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by airline name or code (e.g. PIA or PK)"
                  className="w-full md:w-96 px-3 py-2 border rounded"
                  aria-label="Search airlines"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="px-3 py-2 bg-gray-200 rounded text-sm"
                    type="button"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-600">
                  Showing: <strong>{filtered.length}</strong> /{" "}
                  {airlines.length}
                </div>
                <button
                  onClick={() => handleAddClick()}
                  className="px-3 py-2 bg-blue-600 text-white rounded"
                >
                  + Add Airline
                </button>
              </div>
            </div>

            {/* LIST */}
            <div className="space-y-3">
              {filtered.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No airlines found.
                </div>
              )}

              {filtered.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-3 border rounded"
                >
                  <div>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-sm text-gray-500">Code: {a.code}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditClick(a)}
                      className="px-3 py-1 bg-yellow-300 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(a.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ADD / EDIT VIEW */}
        {(mode === "add" || mode === "edit") && (
          <div>
            <h2 className="text-lg font-medium mb-3">
              {mode === "add" ? "Add Airline" : "Edit Airline"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm">Airline Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full border rounded px-3 py-2"
                  placeholder="Example: Pakistan International Airlines"
                />
              </div>

              <div>
                <label className="block text-sm">Airline Code</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="mt-1 w-48 border rounded px-3 py-2"
                  placeholder="Example: PK"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded"
                >
                  {mode === "add" ? "Add Airline" : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={refresh}
                  className="px-4 py-2 bg-gray-200 rounded"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
