// src/pages/UmrahCalculator.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { v4 as uuidv4 } from "uuid";

import useLocalStorage from "../hooks/useLocalStorage";
import {
  getMakkahHotels,
  getMadinahHotels,
  clearHotelCache,
} from "../services/hotelService";

import { useApp } from "../contexts/AppContext";

import AgencyForm from "../components/AgencyForm";
import HotelCard from "../components/HotelCard";
import HotelManager from "../components/HotelManager";
import TicketsVisa from "../components/TicketsVisa";
import Summary from "../components/Summary";
import SavedPackages from "../components/SavedPackages";
import Footer from "../components/Footer";
import {
  savePackage as savePkgService,
  listPackages,
} from "../services/packageService";

/**
 * UmrahCalculator page
 * - includes new filters UI for hotels (Makkah + Madinah)
 */

export default function UmrahCalculator() {
  const { agency } = useApp();
  const [showAgencyForm, setShowAgencyForm] = useState(!agency);

  useEffect(() => {
    setShowAgencyForm(!agency);
  }, [agency]);

  // MAIN hotel states
  const [makkah, setMakkah] = useState({
    name: "",
    nights: 3,
    pricePerNight: 0,
    soldOut: false,
    weekendNights: 0,
    weekendPrice: "",
  });
  const [madinah, setMadinah] = useState({
    name: "",
    nights: 2,
    pricePerNight: 0,
    soldOut: false,
    weekendNights: 0,
    weekendPrice: "",
  });

  const [makkahList, setMakkahList] = useState([]);
  const [madinahList, setMadinahList] = useState([]);
  const [loadingHotels, setLoadingHotels] = useState(true);

  const [makkahQuery, setMakkahQuery] = useState("");
  const [madinahQuery, setMadinahQuery] = useState("");

  const [managerOpen, setManagerOpen] = useState(false);

  // --- NEW: filters state for each city (supports multi-filter) ---
  const [makkahFilters, setMakkahFilters] = useState({
    star: "all", // all / 5 /4 /3 /2 /1
    maxPrice: "",
    maxDistance: "", // in meters (user types number)
    sortBy: "relevance", // relevance / price / distance / stars
  });

  const [madinahFilters, setMadinahFilters] = useState({
    star: "all",
    maxPrice: "",
    maxDistance: "",
    sortBy: "relevance",
  });

  // custom dropdown UI state (for Makkah + Madinah search results)
  const [makkahShowList, setMakkahShowList] = useState(false);
  const [madinahShowList, setMadinahShowList] = useState(false);
  const makkahRef = useRef(null);
  const madinahRef = useRef(null);

  // keyboard focus index for dropdown items
  const [makkahFocus, setMakkahFocus] = useState(-1);
  const [madinahFocus, setMadinahFocus] = useState(-1);

  // --- close dropdowns when clicking outside ---
  useEffect(() => {
    function onDocClick(e) {
      if (makkahRef.current && !makkahRef.current.contains(e.target)) {
        setMakkahShowList(false);
      }
      if (madinahRef.current && !madinahRef.current.contains(e.target)) {
        setMadinahShowList(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // ticket / pax / profit states
  const [pax, setPax] = useState(1);
  const [ticketPrice, setTicketPrice] = useState(0);
  const [ticketCurrency, setTicketCurrency] = useState("SAR");
  // selected airline and vehicle lifted to parent so we can save them in package snapshot
  const [selectedAirline, setSelectedAirline] = useState(null);
  const [vehicle, setVehicle] = useState("CAR");

  // NEW: profit amount + currency
  const [profit, setProfit] = useState(0);
  const [profitCurrency, setProfitCurrency] = useState("SAR");

  const [rates, setRates] = useLocalStorage("umrah_rates", {
    SAR_to_PKR: 75,
    USD_to_SAR: 3.75,
  });

  // keep default visa SAR (user can edit it)
  const [defaultVisaSAR, setDefaultVisaSAR] = useLocalStorage(
    "umrah_defaultVisaSAR",
    300
  );

  // TRANSPORT total
  const [transportTotal, setTransportTotal] = useState(0);

  const [packages, setPackages] = useLocalStorage("umrah_packages", []);

  // -------------------------
  // Load hotel lists
  // -------------------------
  const loadLists = async () => {
    setLoadingHotels(true);
    try {
      const mList = await getMakkahHotels();
      const mdList = await getMadinahHotels();
      // 🔴 FINAL SOURCE OF TRUTH: TripPlanner COUNTED data
      try {
        const rawPlan = localStorage.getItem("umrah_last_plan");
        if (rawPlan) {
          const plan = JSON.parse(rawPlan);

          const stays =
            plan.adjustedStays ||
            (plan.segments || []).filter((s) => s.type === "stay");

          const sum = (arr) =>
            arr.reduce((acc, s) => acc + Number(s.countedDays || 0), 0);

          const makkahStays = stays.filter((s) => s.city === "makkah");
          const madinahStays = stays.filter((s) => s.city === "madinah");

          const sumWeekend = (arr) =>
            arr.reduce(
              (acc, s) =>
                acc +
                (Array.isArray(s.weekendDates) ? s.weekendDates.length : 0),
              0
            );

          if (makkahStays.length) {
            setMakkah((s) => ({
              ...s,
              nights: sum(makkahStays),
              weekendNights: sumWeekend(makkahStays),
            }));
          }

          if (madinahStays.length) {
            setMadinah((s) => ({
              ...s,
              nights: sum(madinahStays),
              weekendNights: sumWeekend(madinahStays),
            }));
          }
        }
      } catch (e) {
        console.warn("Failed to read counted nights from umrah_last_plan", e);
      }

      setMakkahList(mList || []);
      setMadinahList(mdList || []);

      if ((!makkah.name || makkah.name === "") && mList.length > 0) {
        const first = mList[0];
        setMakkah((s) => ({
          ...s,
          name: first.name,
          pricePerNight: first.pricePerNight,
        }));
      }
      if ((!madinah.name || madinah.name === "") && mdList.length > 0) {
        const first = mdList[0];
        setMadinah((s) => ({
          ...s,
          name: first.name,
          pricePerNight: first.pricePerNight,
        }));
      }
    } finally {
      setLoadingHotels(false);
    }
  };

  useEffect(() => {
    loadLists();
  }, []);

  // ---------------------------------------------------
  // Filters function (now accepts filters object)
  // ---------------------------------------------------
  function parseDistanceToMeters(dist) {
    // expected formats: "350m", "1.2 km", "1200 m", "0.5km"
    if (!dist) return null;
    const s = String(dist).trim().toLowerCase();
    const num = parseFloat(s.replace(",", ".").replace(/[^\d.]/g, ""));
    if (s.includes("km")) return Math.round(num * 1000);
    if (s.includes("m")) return Math.round(num);
    // fallback treat as meters if numeric
    if (!Number.isNaN(num)) return Math.round(num);
    return null;
  }

  const filterHotels = (list, query, filters) => {
    const q = (query || "").trim().toLowerCase();

    // pre-calc numeric filters
    const maxPrice =
      filters && filters.maxPrice !== "" ? Number(filters.maxPrice) : null;
    const maxDistance =
      filters && filters.maxDistance !== ""
        ? Number(filters.maxDistance)
        : null;
    const starFilter = filters && filters.star ? filters.star : "all";

    let out = (list || []).filter((h) => {
      // star filter
      if (starFilter !== "all") {
        if (String(h.stars) !== String(starFilter)) return false;
      }

      // price filter (if hotel has pricePerNight field)
      if (
        maxPrice !== null &&
        h.pricePerNight !== undefined &&
        h.pricePerNight !== ""
      ) {
        if (Number(h.pricePerNight) > maxPrice) return false;
      }

      // distance filter
      if (maxDistance !== null && h.distance) {
        const d = parseDistanceToMeters(h.distance);
        if (d !== null && d > maxDistance) return false;
      }

      // query matching (name or distance)
      if (!q) return true;
      if (h.name && h.name.toLowerCase().includes(q)) return true;
      if (h.distance && String(h.distance).toLowerCase().includes(q))
        return true;
      return false;
    });

    // sorting
    if (filters && filters.sortBy && filters.sortBy !== "relevance") {
      if (filters.sortBy === "price") {
        out = out.sort(
          (a, b) => Number(a.pricePerNight || 0) - Number(b.pricePerNight || 0)
        );
      } else if (filters.sortBy === "distance") {
        out = out.sort((a, b) => {
          const da = parseDistanceToMeters(a.distance) || 0;
          const db = parseDistanceToMeters(b.distance) || 0;
          return da - db;
        });
      } else if (filters.sortBy === "stars") {
        out = out.sort((a, b) => Number(b.stars || 0) - Number(a.stars || 0));
      }
    }

    return out;
  };

  const filteredMakkah = useMemo(
    () => filterHotels(makkahList, makkahQuery, makkahFilters),
    [makkahList, makkahQuery, makkahFilters]
  );

  const filteredMadinah = useMemo(
    () => filterHotels(madinahList, madinahQuery, madinahFilters),
    [madinahList, madinahQuery, madinahFilters]
  );

  // --- Keyboard + dropdown helpers (same as before) ---
  useEffect(() => {
    if (!makkahShowList) setMakkahFocus(-1);
  }, [makkahShowList, filteredMakkah]);

  useEffect(() => {
    if (!madinahShowList) setMadinahFocus(-1);
  }, [madinahShowList, filteredMadinah]);

  function selectMakkahByIndex(i) {
    const h = filteredMakkah[i];
    if (!h) return;
    setMakkah((s) => ({ ...s, name: h.name, pricePerNight: h.pricePerNight }));
    setMakkahQuery(
      `${h.name} — ${h.stars}★ — ${h.distance} — SAR ${h.pricePerNight}`
    );
    setMakkahShowList(false);
    setMakkahFocus(-1);
  }

  function selectMadinahByIndex(i) {
    const h = filteredMadinah[i];
    if (!h) return;
    setMadinah((s) => ({ ...s, name: h.name, pricePerNight: h.pricePerNight }));
    setMadinahQuery(
      `${h.name} — ${h.stars}★ — ${h.distance} — SAR ${h.pricePerNight}`
    );
    setMadinahShowList(false);
    setMadinahFocus(-1);
  }

  function handleMakkahKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMakkahShowList(true);
      setMakkahFocus((prev) => {
        if (filteredMakkah.length === 0) return -1;
        if (prev === -1) return 0;
        return Math.min(prev + 1, filteredMakkah.length - 1);
      });
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setMakkahFocus((prev) => {
        if (filteredMakkah.length === 0) return -1;
        if (prev <= 0) return 0;
        return prev - 1;
      });
      return;
    }
    if (e.key === "Enter") {
      if (makkahFocus >= 0) {
        e.preventDefault();
        selectMakkahByIndex(makkahFocus);
      }
      return;
    }
    if (e.key === "Escape") {
      setMakkahShowList(false);
      setMakkahFocus(-1);
      return;
    }
  }

  function handleMadinahKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMadinahShowList(true);
      setMadinahFocus((prev) => {
        if (filteredMadinah.length === 0) return -1;
        if (prev === -1) return 0;
        return Math.min(prev + 1, filteredMadinah.length - 1);
      });
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setMadinahFocus((prev) => {
        if (filteredMadinah.length === 0) return -1;
        if (prev <= 0) return 0;
        return prev - 1;
      });
      return;
    }
    if (e.key === "Enter") {
      if (madinahFocus >= 0) {
        e.preventDefault();
        selectMadinahByIndex(madinahFocus);
      }
      return;
    }
    if (e.key === "Escape") {
      setMadinahShowList(false);
      setMadinahFocus(-1);
      return;
    }
  }

  useEffect(() => {
    if (makkahFocus >= 0) {
      const el = document.getElementById(`makkah-item-${makkahFocus}`);
      if (el) el.scrollIntoView({ block: "nearest" });
    }
  }, [makkahFocus]);

  useEffect(() => {
    if (madinahFocus >= 0) {
      const el = document.getElementById(`madinah-item-${madinahFocus}`);
      if (el) el.scrollIntoView({ block: "nearest" });
    }
  }, [madinahFocus]);

  // price calculation
  const makkahNights = Number(makkah.nights) || 0;
  const makkahPrice = Number(makkah.pricePerNight) || 0;

  const madinahNights = Number(madinah.nights) || 0;
  const madinahPrice = Number(madinah.pricePerNight) || 0;

  const makTotal = makkahNights * makkahPrice;
  const madTotal = madinahNights * madinahPrice;

  const ticketPriceInSAR =
    ticketCurrency === "USD"
      ? ticketPrice * rates.USD_to_SAR
      : ticketCurrency === "PKR"
      ? ticketPrice / rates.SAR_to_PKR
      : ticketPrice;

  const visaSAR = Number(defaultVisaSAR) || 0;

  const _profit = Number(profit) || 0;
  let profitInSAR = 0;
  if (_profit > 0) {
    if (profitCurrency === "SAR") {
      profitInSAR = _profit;
    } else if (profitCurrency === "USD") {
      profitInSAR = _profit * Number(rates.USD_to_SAR || 3.75);
    } else if (profitCurrency === "PKR") {
      profitInSAR = _profit / Number(rates.SAR_to_PKR || 75);
    }
  }

  const perPersonTotalSAR =
    (Number(makTotal) || 0) +
    (Number(madTotal) || 0) +
    (Number(ticketPriceInSAR) || 0) +
    (Number(visaSAR) || 0) +
    (Number(transportTotal) || 0) +
    (Number(profitInSAR) || 0);

  const totalSAR = perPersonTotalSAR * Math.max(1, Number(pax || 1));
  const totalPKR = totalSAR * Number(rates.SAR_to_PKR || 75);
  const totalUSD = totalSAR / Number(rates.USD_to_SAR || 3.75);

  // ---------------------------------------------------
  // When user selects a hotel from dropdown (not used by new filters)
  // ---------------------------------------------------
  const handleSelectMakkah = (e) => {
    const id = e.target.value;
    const h = makkahList.find((x) => x.id === id);
    if (h) {
      setMakkah((s) => ({
        ...s,
        name: h.name,
        pricePerNight: h.pricePerNight,
      }));
    }
  };

  const handleSelectMadinah = (e) => {
    const id = e.target.value;
    const h = madinahList.find((x) => x.id === id);
    if (h) {
      setMadinah((s) => ({
        ...s,
        name: h.name,
        pricePerNight: h.pricePerNight,
      }));
    }
  };

  // ---------------------------------------------------
  // SAVE PACKAGE (upgraded -> consolidated snapshot)
  // ---------------------------------------------------
  const savePackage = () => {
    try {
      // کوشش کریں پہلے TripPlanner کی saved itinerary لیں (اگر موجود ہو)
      let itinerary = null;
      try {
        const raw = localStorage.getItem("umrah_last_plan");
        if (raw) itinerary = JSON.parse(raw);
      } catch (e) {
        itinerary = null;
      }

      // build consolidated snapshot
      const snapshot = {
        // meta will be filled by packageService (id, createdAt)
        agency: agency || null,
        itinerary: itinerary || null,

        hotelsSelected: {
          makkah: { ...makkah },
          madinah: { ...madinah },
        },

        flights: {
          ticketPrice: ticketPrice || 0,
          ticketCurrency: ticketCurrency || "SAR",
          selectedAirline: selectedAirline || null, // ⭐ FIXED: airline saving
        },

        visa: {
          visaSAR: Number(defaultVisaSAR || 0),
          type: "e-visa", // ⭐ FIXED: always show e-visa
        },

        transport: {
          transportTotal: Number(transportTotal || 0),
          vehicle: vehicle || "", // ⭐ FIXED: vehicle saving
        },

        pax: Number(pax || 1),
        profit: Number(profit || 0),
        profitCurrency: profitCurrency || "SAR",

        totals: {
          SAR: Number(totalSAR || 0),
          PKR: Number(totalPKR || 0),
          USD: Number(totalUSD || 0),
        },
      };

      // call packageService to save (it will add id + createdAt)
      const saved = savePkgService(snapshot);
      if (saved) {
        // update local state (packages) so UI reflects saved package
        setPackages((prev) => [saved, ...(prev || [])]);
        alert("Package saved!");
      } else {
        alert("Failed to save package. Check browser storage.");
      }
    } catch (err) {
      console.error("savePackage error", err);
      alert("Saving failed. See console for error.");
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-100">
      <main className="w-full px-3 md:px-6 py-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEFT PANEL */}
          <aside className="lg:col-span-6 space-y-4">
            {/* Makkah Hotels */}
            <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-pink-500">
              <h3 className="font-semibold text-lg mb-3">Makkah Hotels</h3>

              {/* Compact combined search + filters + Add */}
              <div className="p-3 bg-gray-50 border rounded mb-3">
                <div
                  className="relative flex flex-col gap-2 md:flex-row md:items-center"
                  ref={makkahRef}
                >
                  <input
                    value={makkahQuery}
                    onChange={(e) => {
                      const q = e.target.value || "";
                      setMakkahQuery(q);
                      setMakkahShowList(true);
                      const match =
                        filteredMakkah.find(
                          (h) =>
                            `${h.name} — ${h.stars}★ — ${h.distance} — SAR ${h.pricePerNight}` ===
                            q.trim()
                        ) || null;
                      if (match) {
                        setMakkah((s) => ({
                          ...s,
                          name: match.name,
                          pricePerNight: match.pricePerNight,
                        }));
                        setMakkahShowList(false);
                      }
                    }}
                    onKeyDown={(e) => {
                      handleMakkahKeyDown(e);
                      if (e.key === "Enter" && makkahFocus < 0) {
                        const q = (makkahQuery || "").trim();
                        const match =
                          filteredMakkah.find(
                            (h) =>
                              `${h.name} — ${h.stars}★ — ${h.distance} — SAR ${h.pricePerNight}` ===
                              q
                          ) ||
                          filteredMakkah[0] ||
                          null;
                        if (match) {
                          setMakkah((s) => ({
                            ...s,
                            name: match.name,
                            pricePerNight: match.pricePerNight,
                          }));
                          setMakkahShowList(false);
                        }
                      }
                    }}
                    placeholder="Search & select hotel..."
                    className="w-full p-2 border rounded text-sm"
                    onFocus={() => setMakkahShowList(true)}
                  />

                  {/* Filters compact UI (before Add) */}
                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <select
                      value={makkahFilters.star}
                      onChange={(e) =>
                        setMakkahFilters((s) => ({
                          ...s,
                          star: e.target.value,
                        }))
                      }
                      className="p-2 border rounded text-sm bg-white"
                      title="Filter by stars"
                    >
                      <option value="all">All ★</option>
                      <option value="5">5★</option>
                      <option value="4">4★</option>
                      <option value="3">3★</option>
                      <option value="2">2★</option>
                      <option value="1">1★</option>
                    </select>

                    <input
                      type="number"
                      placeholder="Max price"
                      value={makkahFilters.maxPrice}
                      onChange={(e) =>
                        setMakkahFilters((s) => ({
                          ...s,
                          maxPrice: e.target.value,
                        }))
                      }
                      className="p-2 border rounded w-full md:w-24 text-sm"
                    />

                    <input
                      type="number"
                      placeholder="Max m"
                      value={makkahFilters.maxDistance}
                      onChange={(e) =>
                        setMakkahFilters((s) => ({
                          ...s,
                          maxDistance: e.target.value,
                        }))
                      }
                      className="p-2 border rounded w-full md:w-20 text-sm"
                    />

                    <select
                      value={makkahFilters.sortBy}
                      onChange={(e) =>
                        setMakkahFilters((s) => ({
                          ...s,
                          sortBy: e.target.value,
                        }))
                      }
                      className="p-2 border rounded text-sm bg-white"
                      title="Sort by"
                    >
                      <option value="relevance">Relevance</option>
                      <option value="price">Price ↑</option>
                      <option value="distance">Distance ↑</option>
                      <option value="stars">Stars ↓</option>
                    </select>
                  </div>

                  <button
                    onClick={() => setManagerOpen(true)}
                    className="px-3 py-2 border rounded text-sm bg-white w-full md:w-auto md:ml-2"
                    type="button"
                  >
                    Add
                  </button>
                </div>

                {/* dropdown results */}
                {makkahShowList && filteredMakkah.length > 0 && (
                  <div className="absolute left-0 right-0 mt-2 bg-white border rounded max-h-64 overflow-auto shadow z-30 md:left-0 md:right-auto md:min-w-[450px]">
                    {filteredMakkah.map((h, index) => (
                      <button
                        key={h.id || index}
                        id={`makkah-item-${index}`}
                        type="button"
                        onClick={() => {
                          setMakkah((s) => ({
                            ...s,
                            name: h.name,
                            pricePerNight: h.pricePerNight,
                          }));
                          setMakkahQuery(
                            `${h.name} — ${h.stars}★ — ${h.distance} — SAR ${h.pricePerNight}`
                          );
                          setMakkahShowList(false);
                          setMakkahFocus(-1);
                        }}
                        onMouseEnter={() => setMakkahFocus(index)}
                        className={`w-full text-left px-3 py-2 flex items-start gap-3 ${
                          index === makkahFocus
                            ? "bg-indigo-50"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">{h.name}</div>
                          <div className="text-xs text-gray-500">
                            {h.stars}★ — {h.distance} — SAR {h.pricePerNight}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <HotelCard title="" hotel={makkah} setHotel={setMakkah} />
            </div>

            {/* Madinah Hotels */}
            <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-emerald-500">
              <h3 className="font-semibold text-lg mb-3">Madinah Hotels</h3>

              {/* Compact combined search + filters + Add */}
              <div className="p-3 bg-gray-50 border rounded mb-3">
                <div
                  className="relative flex flex-col gap-2 md:flex-row md:items-center"
                  ref={madinahRef}
                >
                  <input
                    value={madinahQuery}
                    onChange={(e) => {
                      const q = e.target.value || "";
                      setMadinahQuery(q);
                      setMadinahShowList(true);
                      const match =
                        filteredMadinah.find(
                          (h) =>
                            `${h.name} — ${h.stars}★ — ${h.distance} — SAR ${h.pricePerNight}` ===
                            q.trim()
                        ) || null;
                      if (match) {
                        setMadinah((s) => ({
                          ...s,
                          name: match.name,
                          pricePerNight: match.pricePerNight,
                        }));
                        setMadinahShowList(false);
                      }
                    }}
                    onKeyDown={(e) => {
                      handleMadinahKeyDown(e);
                      if (e.key === "Enter" && madinahFocus < 0) {
                        const q = (madinahQuery || "").trim();
                        const match =
                          filteredMadinah.find(
                            (h) =>
                              `${h.name} — ${h.stars}★ — ${h.distance} — SAR ${h.pricePerNight}` ===
                              q
                          ) ||
                          filteredMadinah[0] ||
                          null;
                        if (match) {
                          setMadinah((s) => ({
                            ...s,
                            name: match.name,
                            pricePerNight: match.pricePerNight,
                          }));
                          setMadinahShowList(false);
                        }
                      }
                    }}
                    placeholder="Search & select hotel..."
                    className="w-full p-2 border rounded text-sm"
                    onFocus={() => setMadinahShowList(true)}
                  />

                  {/* Filters UI */}
                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <select
                      value={madinahFilters.star}
                      onChange={(e) =>
                        setMadinahFilters((s) => ({
                          ...s,
                          star: e.target.value,
                        }))
                      }
                      className="p-2 border rounded text-sm bg-white"
                      title="Filter by stars"
                    >
                      <option value="all">All ★</option>
                      <option value="5">5★</option>
                      <option value="4">4★</option>
                      <option value="3">3★</option>
                      <option value="2">2★</option>
                      <option value="1">1★</option>
                    </select>

                    <input
                      type="number"
                      placeholder="Max price"
                      value={madinahFilters.maxPrice}
                      onChange={(e) =>
                        setMadinahFilters((s) => ({
                          ...s,
                          maxPrice: e.target.value,
                        }))
                      }
                      className="p-2 border rounded w-24 text-sm"
                    />

                    <input
                      type="number"
                      placeholder="Max m"
                      value={madinahFilters.maxDistance}
                      onChange={(e) =>
                        setMadinahFilters((s) => ({
                          ...s,
                          maxDistance: e.target.value,
                        }))
                      }
                      className="p-2 border rounded w-20 text-sm"
                    />

                    <select
                      value={madinahFilters.sortBy}
                      onChange={(e) =>
                        setMadinahFilters((s) => ({
                          ...s,
                          sortBy: e.target.value,
                        }))
                      }
                      className="p-2 border rounded text-sm bg-white"
                      title="Sort by"
                    >
                      <option value="relevance">Relevance</option>
                      <option value="price">Price ↑</option>
                      <option value="distance">Distance ↑</option>
                      <option value="stars">Stars ↓</option>
                    </select>
                  </div>

                  <button
                    onClick={() => setManagerOpen(true)}
                    className="ml-2 px-2 py-1 border rounded text-sm bg-white"
                    type="button"
                  >
                    Add
                  </button>
                </div>

                {/* dropdown results */}
                {madinahShowList && filteredMadinah.length > 0 && (
                  <div className="absolute left-4 right-4 mt-16 bg-white border rounded max-h-64 overflow-auto shadow z-30 md:left-0 md:right-auto md:min-w-[450px]">
                    {filteredMadinah.map((h, index) => (
                      <button
                        key={h.id || index}
                        id={`madinah-item-${index}`}
                        type="button"
                        onClick={() => {
                          setMadinah((s) => ({
                            ...s,
                            name: h.name,
                            pricePerNight: h.pricePerNight,
                          }));
                          setMadinahQuery(
                            `${h.name} — ${h.stars}★ — ${h.distance} — SAR ${h.pricePerNight}`
                          );
                          setMadinahShowList(false);
                          setMadinahFocus(-1);
                        }}
                        onMouseEnter={() => setMadinahFocus(index)}
                        className={`w-full text-left px-3 py-2 flex items-start gap-3 ${
                          index === madinahFocus
                            ? "bg-indigo-50"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">{h.name}</div>
                          <div className="text-xs text-gray-500">
                            {h.stars}★ — {h.distance} — SAR {h.pricePerNight}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <HotelCard title="" hotel={madinah} setHotel={setMadinah} />
            </div>
          </aside>

          {/* RIGHT PANEL */}
          <div className="lg:col-span-6 space-y-4">
            <TicketsVisa
              pax={pax}
              setPax={setPax}
              ticketPrice={ticketPrice}
              setTicketPrice={setTicketPrice}
              ticketCurrency={ticketCurrency}
              setTicketCurrency={setTicketCurrency}
              defaultVisaSAR={defaultVisaSAR}
              setDefaultVisaSAR={setDefaultVisaSAR}
              transportTotal={transportTotal}
              setTransportTotal={setTransportTotal}
              rates={rates}
              setRates={setRates}
              profit={profit}
              setProfit={setProfit}
              profitCurrency={profitCurrency}
              setProfitCurrency={setProfitCurrency}
              selectedAirline={selectedAirline}
              setSelectedAirline={setSelectedAirline}
              vehicle={vehicle}
              setVehicle={setVehicle}
            />

            <Summary
              perPersonTotalSAR={perPersonTotalSAR}
              totalSAR={totalSAR}
              totalPKR={totalPKR}
              totalUSD={totalUSD}
              pax={pax}
              savePackage={savePackage}
            />

            <SavedPackages packages={packages} setPackages={setPackages} />
          </div>
        </div>
      </main>

      <Footer />

      {/* HOTEL MANAGER MODAL */}
      <HotelManager
        open={managerOpen}
        setOpen={setManagerOpen}
        makkahList={makkahList}
        madinahList={madinahList}
        refreshMakkah={loadLists}
        refreshMadinah={loadLists}
      />
    </div>
  );
}
