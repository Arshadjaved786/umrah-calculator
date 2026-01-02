// src/components/AirlineManager.jsx
import React, { useEffect, useState } from "react";
import {
  getAllAirlines,
  addAirline,
  updateAirline,
  removeAirline,
  resetAirlinesToDefault,
} from "../services/airlineService";

export default function AirlineManager({ isOpen, onClose, onChange }) {
  const [airlines, setAirlines] = useState([]);
  const [mode, setMode] = useState("list"); // list | add | edit
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", code: "" });

  useEffect(() => {
    if (isOpen) refresh();
  }, [isOpen]);

  function refresh() {
    setAirlines(getAllAirlines());
    setMode("list");
    setEditing(null);
    setForm({ name: "", code: "" });
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
    if (!confirm("کیا آپ واقعی اس ایئر لائن کو حذف کرنا چاہتے ہیں؟")) return;
    removeAirline(id);
    const updated = getAllAirlines();
    setAirlines(updated);
    if (onChange) onChange();
  }

  function handleSubmit(e) {
    e.preventDefault();
    const name = form.name.trim();
    const code = form.code.trim().toUpperCase();
    if (!name || !code) {
      alert("براہِ کرم دونوں فیلڈز مکمل کریں (Name اور Code)");
      return;
    }
    if (mode === "add") {
      addAirline({ name, code, logo: null });
    } else if (mode === "edit" && editing) {
      updateAirline(editing.id, { name, code, logo: editing.logo ?? null });
    }
    refresh();
    if (onChange) onChange();
  }

  function handleResetDefaults() {
    if (!confirm("کیا آپ ڈیفالٹ ایئر لائنز بحال کرنا چاہتے ہیں؟")) return;
    resetAirlinesToDefault();
    refresh();
    if (onChange) onChange();
  }

  if (!isOpen) return null;

  return (
    // modal backdrop
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black opacity-50"
        onClick={onClose}
      ></div>

      <div className="relative z-50 w-full max-w-2xl bg-white rounded-2xl shadow-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Manage Airlines</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDefaults}
              className="px-3 py-1 text-sm rounded bg-gray-100"
            >
              Reset Defaults
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 text-sm rounded bg-red-500 text-white"
            >
              Close
            </button>
          </div>
        </div>

        {mode === "list" && (
          <>
            <div className="mb-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                کل ایئر لائنز: {airlines.length}
              </div>
              <div>
                <button
                  onClick={handleAddClick}
                  className="px-3 py-1 bg-blue-600 text-white rounded"
                >
                  + Add Airline
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-auto">
              {airlines.map((a) => (
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
                      className="px-2 py-1 text-sm rounded bg-yellow-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(a.id)}
                      className="px-2 py-1 text-sm rounded bg-red-400 text-white"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {airlines.length === 0 && (
                <div className="text-center text-gray-500 py-6">
                  کوئی ایئر لائن موجود نہیں۔
                </div>
              )}
            </div>
          </>
        )}

        {(mode === "add" || mode === "edit") && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm">Airline Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full border rounded px-3 py-2"
                placeholder="مثال: Pakistan International Airlines"
              />
            </div>

            <div>
              <label className="block text-sm">Airline Code</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="mt-1 w-full border rounded px-3 py-2"
                placeholder="مثال: PK"
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
                onClick={() => {
                  setMode("list");
                  setEditing(null);
                  setForm({ name: "", code: "" });
                }}
                className="px-4 py-2 bg-gray-200 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
