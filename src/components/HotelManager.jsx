// src/components/HotelManager.jsx
import React, { useState, useMemo, useEffect } from "react";
import {
  getMakkahHotels,
  getMadinahHotels,
  addMakkahHotel,
  updateMakkahHotel,
  deleteMakkahHotel,
  addMadinahHotel,
  updateMadinahHotel,
  deleteMadinahHotel,
} from "../services/hotelService";

/**
 * HotelManager
 * Props:
 * - open (bool) : show modal
 * - setOpen (fn) : toggle modal
 * - makkahList, madinahList (arrays) : current lists (for display)
 * - refreshMakkah(), refreshMadinah() : callbacks to refresh parent lists after changes
 *
 * Note:
 * - یہ فائل صرف HotelManager کمپوننٹ رکھتی ہے۔
 * - جو اضافی یا غیر متعلقہ کوڈ پہلے یہاں شامل تھا، وہ ہٹا دیا گیا ہے۔
 */

export default function HotelManager({
  open,
  setOpen,
  makkahList = [],
  madinahList = [],
  refreshMakkah,
  refreshMadinah,
}) {
  const [editorCity, setEditorCity] = useState("Makkah");
  const [editorMode, setEditorMode] = useState("add"); // add / edit
  const [filterQuery, setFilterQuery] = useState("");
  const [editorDraft, setEditorDraft] = useState({
    id: "",
    name: "",
    stars: 3,
    pricePerNight: "",
    distance: "",
    image: "",
    weekendNights: 0, // default 0
    weekendPrice: "", // empty so fallback possible
  });

  // --------------------------
  // Auto-fill from TripPlanner saved keys
  // --------------------------
  // This effect runs:
  // - on mount (so it works if HotelManager is a route/page)
  // - when `open` changes (so it works if HotelManager is a modal)
  useEffect(() => {
    try {
      // read Makkah keys (TripPlanner onAccept saves these)
      const mN = localStorage.getItem("umrah_makkah_nights");
      const mWN =
        localStorage.getItem("umrah_makkah_weekend_nights") ||
        localStorage.getItem("umrah_makkah_weekendNights") ||
        null;
      const mP = localStorage.getItem("umrah_makkah_price");
      const mWP = localStorage.getItem("umrah_makkah_weekend_price");

      // read Madinah keys
      const dN = localStorage.getItem("umrah_madinah_nights");
      const dWN =
        localStorage.getItem("umrah_madinah_weekend_nights") ||
        localStorage.getItem("umrah_madinah_weekendNights") ||
        null;
      const dP = localStorage.getItem("umrah_madinah_price");
      const dWP = localStorage.getItem("umrah_madinah_weekend_price");

      // If Makkah values exist, prefill editorDraft for Makkah
      if (mN !== null || mWN !== null || mP !== null || mWP !== null) {
        setEditorDraft((prev) => ({
          ...prev,
          // Only override the fields we have; preserve others.
          nights: mN !== null && mN !== "" ? Number(mN) : prev.nights,
          pricePerNight:
            mP !== null && mP !== "" ? Number(mP) : prev.pricePerNight,
          weekendNights:
            mWN !== null && mWN !== "" ? Number(mWN) : prev.weekendNights,
          weekendPrice:
            mWP !== null && mWP !== ""
              ? mWP === ""
                ? ""
                : Number(mWP)
              : prev.weekendPrice,
        }));
        setEditorCity("Makkah");
        setEditorMode("edit");
      }

      // If Madinah values exist, prefill editorDraft for Madinah as well
      if (dN !== null || dWN !== null || dP !== null || dWP !== null) {
        setEditorDraft((prev) => ({
          ...prev,
          nights:
            prev.nights === undefined ||
            prev.nights === "" ||
            prev.nights === null
              ? dN !== null && dN !== ""
                ? Number(dN)
                : prev.nights
              : prev.nights,
          pricePerNight:
            prev.pricePerNight === "" || prev.pricePerNight === undefined
              ? dP !== null && dP !== ""
                ? Number(dP)
                : prev.pricePerNight
              : prev.pricePerNight,
          weekendNights:
            prev.weekendNights === undefined || prev.weekendNights === null
              ? dWN !== null && dWN !== ""
                ? Number(dWN)
                : prev.weekendNights
              : prev.weekendNights,
          weekendPrice:
            prev.weekendPrice === "" || prev.weekendPrice === undefined
              ? dWP !== null && dWP !== ""
                ? dWP === ""
                  ? ""
                  : Number(dWP)
                : prev.weekendPrice
              : prev.weekendPrice,
        }));
        // do not forcibly switch city here; user can open Madinah tab or choose Edit.
      }
    } catch (err) {
      // fail silently but log for developer
      // eslint-disable-next-line no-console
      console.warn("HotelManager: failed to load saved plan keys", err);
    }
  }, [open]); // runs on mount and every time `open` changes

  // choose current list based on city
  const currentList = editorCity === "Makkah" ? makkahList : madinahList;

  const filtered = useMemo(() => {
    const q = (filterQuery || "").trim().toLowerCase();
    if (!q) return currentList || [];
    return (currentList || []).filter((h) => {
      if (h.name && h.name.toLowerCase().includes(q)) return true;
      if (h.distance && h.distance.toLowerCase().includes(q)) return true;
      const num = Number(q.replace(/[^\d]/g, ""));
      if (!isNaN(num) && num > 0 && Number(h.stars) === num) return true;
      return false;
    });
  }, [currentList, filterQuery]);

  const openAdd = (city) => {
    setEditorCity(city);
    setEditorMode("add");
    setEditorDraft({
      id: "",
      name: "",
      stars: 3,
      pricePerNight: "",
      distance: "",
      image: "",
      weekendNights: 0,
      weekendPrice: "",
    });
  };

  const openEdit = (city, hotel) => {
    setEditorCity(city);
    setEditorMode("edit");
    setEditorDraft({
      id: hotel.id,
      name: hotel.name || "",
      stars: hotel.stars || 3,
      pricePerNight: hotel.pricePerNight || "",
      distance: hotel.distance || "",
      image: hotel.image || "",
      weekendNights: hotel.weekendNights ?? 0,
      weekendPrice: hotel.weekendPrice ?? "",
    });
  };

  const save = async () => {
    if (!editorDraft.name || editorDraft.name.trim() === "") {
      alert("Hotel name required.");
      return;
    }
    const payload = {
      name: editorDraft.name.trim(),
      stars: Number(editorDraft.stars) || 3,
      pricePerNight:
        editorDraft.pricePerNight === ""
          ? 0
          : Number(editorDraft.pricePerNight),
      distance: editorDraft.distance || "",
      image: editorDraft.image || "",
      weekendNights: Number(editorDraft.weekendNights) || 0,
      weekendPrice:
        editorDraft.weekendPrice === "" ? "" : Number(editorDraft.weekendPrice),
    };
    if (editorMode === "add") {
      if (editorCity === "Makkah") {
        const res = await addMakkahHotel(payload);
        if (res.ok) {
          await refreshMakkah();
          alert("Hotel added to Makkah.");
          setEditorDraft({
            id: "",
            name: "",
            stars: 3,
            pricePerNight: "",
            distance: "",
            image: "",
            weekendNights: 0,
            weekendPrice: "",
          });
        } else alert("Unable to add.");
      } else {
        const res = await addMadinahHotel(payload);
        if (res.ok) {
          await refreshMadinah();
          alert("Hotel added to Madinah.");
          setEditorDraft({
            id: "",
            name: "",
            stars: 3,
            pricePerNight: "",
            distance: "",
            image: "",
            weekendNights: 0,
            weekendPrice: "",
          });
        } else alert("Unable to add.");
      }
    } else {
      if (!editorDraft.id) {
        alert("Invalid hotel id.");
        return;
      }
      if (editorCity === "Makkah") {
        const res = await updateMakkahHotel(editorDraft.id, payload);
        if (res.ok) {
          await refreshMakkah();
          alert("Hotel updated.");
        } else alert("Unable to update.");
      } else {
        const res = await updateMadinahHotel(editorDraft.id, payload);
        if (res.ok) {
          await refreshMadinah();
          alert("Hotel updated.");
        } else alert("Unable to update.");
      }
    }
  };

  const remove = async () => {
    if (!editorDraft.id) {
      alert("No hotel selected to delete.");
      return;
    }
    if (!window.confirm("Are you sure to delete this hotel?")) return;

    if (editorCity === "Makkah") {
      const res = await deleteMakkahHotel(editorDraft.id);
      if (res.ok) {
        await refreshMakkah();
        alert("Deleted.");
        setEditorDraft({
          id: "",
          name: "",
          stars: 3,
          pricePerNight: "",
          distance: "",
          image: "",
          weekendNights: 0,
          weekendPrice: "",
        });
      } else alert("Unable to delete.");
    } else {
      const res = await deleteMadinahHotel(editorDraft.id);
      if (res.ok) {
        await refreshMadinah();
        alert("Deleted.");
        setEditorDraft({
          id: "",
          name: "",
          stars: 3,
          pricePerNight: "",
          distance: "",
          image: "",
          weekendNights: 0,
          weekendPrice: "",
        });
      } else alert("Unable to delete.");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 md:pt-20">
      <div
        className="absolute inset-0 bg-black opacity-40"
        onClick={() => setOpen(false)}
      />
      <div className="relative bg-white w-[98%] sm:w-[95%] md:w-3/4 lg:w-1/2 max-h-[90vh] overflow-auto rounded shadow-lg p-4 z-50">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-lg">Manage Hotels</h3>
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <select
              value={editorCity}
              onChange={(e) => setEditorCity(e.target.value)}
              className="p-1 border rounded text-sm"
            >
              <option value="Makkah">Makkah</option>
              <option value="Madinah">Madinah</option>
            </select>

            <button
              onClick={() => {
                setEditorMode("add");
                setEditorDraft({
                  id: "",
                  name: "",
                  stars: 3,
                  pricePerNight: "",
                  distance: "",
                  image: "",
                  weekendNights: 0,
                  weekendPrice: "",
                });
              }}
              className="px-2 py-1 border rounded text-sm"
            >
              New
            </button>

            <button
              onClick={() => setOpen(false)}
              className="px-2 py-1 border rounded text-sm"
            >
              Close
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="mb-2">
              <input
                placeholder="Filter list (name / star / distance)"
                className="w-full p-2 border rounded text-sm"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
              />
            </div>

            <div className="space-y-2 max-h-[45vh] overflow-auto pr-2">
              {filtered.map((h) => (
                <div
                  key={h.id}
                  className="p-2 border rounded flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2"
                >
                  <div>
                    <div className="font-medium text-sm">{h.name}</div>
                    <div className="text-xs text-gray-600">
                      {h.stars}★ — {h.distance} — SAR {h.pricePerNight}
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => openEdit(editorCity, h)}
                      className="px-2 py-1 border rounded text-xs w-full sm:w-auto"
                    >
                      Edit
                    </button>

                    <button
                      onClick={async () => {
                        if (!window.confirm("Delete this hotel?")) return;
                        if (editorCity === "Makkah") {
                          const res = await deleteMakkahHotel(h.id);
                          if (res.ok) {
                            await refreshMakkah();
                            alert("Deleted.");
                          } else alert("Unable to delete.");
                        } else {
                          const res = await deleteMadinahHotel(h.id);
                          if (res.ok) {
                            await refreshMadinah();
                            alert("Deleted.");
                          } else alert("Unable to delete.");
                        }
                      }}
                      className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-medium">
              {editorMode === "add" ? "Add New Hotel" : "Edit Hotel"}
            </div>

            <input
              placeholder="Hotel name"
              value={editorDraft.name}
              onChange={(e) =>
                setEditorDraft((s) => ({ ...s, name: e.target.value }))
              }
              className="w-full p-2 border rounded mb-2 text-sm"
            />

            <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 mb-2">
              <select
                value={editorDraft.stars}
                onChange={(e) =>
                  setEditorDraft((s) => ({
                    ...s,
                    stars: Number(e.target.value),
                  }))
                }
                className="p-2 border rounded text-sm w-full"
              >
                <option value={5}>5★</option>
                <option value={4}>4★</option>
                <option value={3}>3★</option>
                <option value={2}>2★</option>
                <option value={1}>1★</option>
              </select>

              <input
                placeholder="Price per night (SAR)"
                value={editorDraft.pricePerNight}
                onChange={(e) =>
                  setEditorDraft((s) => ({
                    ...s,
                    pricePerNight: e.target.value,
                  }))
                }
                className="w-full p-2 border rounded text-sm sm:col-span-2"
              />

              <input
                placeholder="Weekend night price (SAR)"
                type="number"
                min={0}
                value={editorDraft.weekendPrice}
                onChange={(e) =>
                  setEditorDraft((s) => ({
                    ...s,
                    weekendPrice: e.target.value,
                  }))
                }
                className="w-full p-2 border rounded text-sm sm:col-span-3"
              />
            </div>

            <input
              placeholder="Distance (e.g., 350m)"
              value={editorDraft.distance}
              onChange={(e) =>
                setEditorDraft((s) => ({ ...s, distance: e.target.value }))
              }
              className="w-full p-2 border rounded mb-2 text-sm"
            />

            <input
              placeholder="Image path (optional)"
              value={editorDraft.image}
              onChange={(e) =>
                setEditorDraft((s) => ({ ...s, image: e.target.value }))
              }
              className="w-full p-2 border rounded mb-2 text-sm"
            />

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={save}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm w-full sm:w-auto"
              >
                {editorMode === "add" ? "Add Hotel" : "Save Changes"}
              </button>

              {editorMode === "edit" && (
                <button
                  onClick={remove}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm w-full sm:w-auto"
                >
                  Delete Hotel
                </button>
              )}

              <button
                onClick={() => {
                  setEditorMode("add");
                  setEditorDraft({
                    id: "",
                    name: "",
                    stars: 3,
                    pricePerNight: "",
                    distance: "",
                    image: "",
                    weekendNights: 0,
                    weekendPrice: "",
                  });
                }}
                className="px-3 py-1 border rounded text-sm"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 text-right">
          <button
            onClick={() => setOpen(false)}
            className="px-3 py-1 border rounded text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
