// src/components/TicketsVisa.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getAllAirlines } from "../services/airlineService";

const STORAGE_KEY = "umrah_airline_search";

export default function TicketsVisa({
  pax,
  setPax,
  ticketPrice,
  setTicketPrice,
  ticketCurrency,
  setTicketCurrency,
  defaultVisaSAR,
  setDefaultVisaSAR,
  transportTotal,
  setTransportTotal,
  rates,
  setRates,
  profit,
  setProfit,
  profitCurrency,
  setProfitCurrency,
  // now coming from parent:
  selectedAirline,
  setSelectedAirline,
  vehicle,
  setVehicle,
}) {
  // helper to use visa value
  const visaVal = defaultVisaSAR;

  const handleNum =
    (setter, min = 0) =>
    (e) => {
      const v = e.target.value === "" ? "" : Number(e.target.value);
      if (v === "") return setter("");
      setter(Math.max(min, Number(v)));
    };

  // --- Airline dropdown state (local UI) ---
  const [airlines, setAirlines] = useState([]);
  const [airlineQuery, setAirlineQuery] = useState("");
  const [showList, setShowList] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // TRANSPORT sector fields local state
  const [s1, setS1] = useState(""); // JED-MAK
  const [s2, setS2] = useState(""); // MAK-MED
  const [s3, setS3] = useState(""); // MED-MAK
  const [s4, setS4] = useState(""); // MAK-JED

  const [autoTotal, setAutoTotal] = useState(true);
  const [manualTotal, setManualTotal] = useState("");

  // Local fallback for profit values handled by parent props (already present)

  useEffect(() => {
    loadAirlines();

    // init airlineQuery from localStorage if present
    const initial = localStorage.getItem(STORAGE_KEY);
    if (initial) setAirlineQuery(initial);

    // storage listener for sync
    function onStorage(e) {
      if (e.key === STORAGE_KEY) {
        const val = e.newValue || "";
        if (val !== airlineQuery) setAirlineQuery(val);
      }
    }
    window.addEventListener("storage", onStorage);

    function onCustom(e) {
      const val = (e && e.detail) || "";
      if (val !== airlineQuery) setAirlineQuery(val);
    }
    window.addEventListener("airlineSearch", onCustom);

    // click outside to close
    function handleClick(e) {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target)) {
        setShowList(false);
      }
    }
    document.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("airlineSearch", onCustom);
      document.removeEventListener("click", handleClick);
    };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, airlineQuery);
    } catch (err) {
      console.error("Failed to write search to localStorage", err);
    }
    const ev = new CustomEvent("airlineSearch", { detail: airlineQuery });
    window.dispatchEvent(ev);
  }, [airlineQuery]);

  function loadAirlines() {
    try {
      const all = getAllAirlines();
      setAirlines(all || []);
    } catch (err) {
      console.error("Failed to load airlines", err);
      setAirlines([]);
    }
  }

  const filtered = airlines.filter((a) => {
    const q = airlineQuery.trim().toLowerCase();
    if (!q) return true;
    return a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q);
  });

  function handleSelectAirline(a) {
    // use parent setter
    setSelectedAirline(a);
    setAirlineQuery(`${a.name} (${a.code})`);
    setShowList(false);
  }

  function clearSelectedAirline() {
    setSelectedAirline(null);
    setAirlineQuery("");
  }

  function openManageAirlinesPage() {
    navigate("/manage-airlines");
  }

  // Transport auto-sum effect
  useEffect(() => {
    if (autoTotal) {
      const sum =
        (Number(s1) || 0) +
        (Number(s2) || 0) +
        (Number(s3) || 0) +
        (Number(s4) || 0);
      setTransportTotal(Number(sum));
      setManualTotal(""); // clear manual if auto
    } else {
      if (manualTotal !== "") {
        setTransportTotal(Number(manualTotal) || 0);
      }
    }
  }, [s1, s2, s3, s4, autoTotal, manualTotal, setTransportTotal]);

  // Small helper: convert profit (in selected currency) to SAR using rates
  function profitToSAR(amount, currency) {
    const a = Number(amount) || 0;
    if (!a) return 0;
    if (!rates) return a; // fallback
    if (currency === "SAR") return a;
    if (currency === "USD") {
      return a * Number(rates.USD_to_SAR || 3.75);
    }
    if (currency === "PKR") {
      const pkrPerSar = Number(rates.SAR_to_PKR || 75);
      return a / pkrPerSar;
    }
    return a;
  }

  // Expose a small preview: visa (SAR) + profit converted (SAR) shown to user
  const visaNumber = Number(visaVal) || 0;
  const profitNumber = Number(profit) || 0;
  const profitInSAR = profitToSAR(profitNumber, profitCurrency);

  return (
    <div className="p-5 rounded-xl shadow-lg mt-0 bg-gradient-to-br from-indigo-50 via-white to-pink-50 border border-transparent bg-white/60 backdrop-blur-md">
      <h3 className="font-semibold mb-3 text-xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-pink-500 to-purple-600">
        Tickets & Transport
      </h3>

      {/* Pax + Ticket Price */}
      <div className="flex flex-col md:flex-row gap-4 md:items-center">
        <div>
          <label className="block text-sm font-medium text-gray-600">Pax</label>
          <input
            type="number"
            value={pax}
            onChange={(e) => {
              const v = e.target.value === "" ? "" : Number(e.target.value);
              setPax(v === "" ? "" : Math.max(1, v));
            }}
            className="p-2 border rounded-lg w-24 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        {/* --- AIRLINE SELECT --- */}
        <div className="w-full md:w-auto">
          <label className="block text-sm font-medium text-gray-600">
            Airline
          </label>

          <div
            className="flex flex-col gap-2 md:flex-row md:items-center"
            ref={dropdownRef}
          >
            <div className="relative w-full md:w-64">
              <input
                type="text"
                value={airlineQuery}
                onChange={(e) => {
                  setAirlineQuery(e.target.value);
                  setShowList(true);
                }}
                onFocus={() => setShowList(true)}
                placeholder="Search airline by name or code (e.g. PIA)"
                className="p-2 border rounded-lg w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-200"
                aria-label="Search airline"
              />

              {showList && (
                <div className="absolute left-0 right-0 mt-1 bg-white border rounded-lg max-h-48 overflow-auto shadow-lg z-30">
                  {filtered.length === 0 && (
                    <div className="p-3 text-sm text-gray-500">
                      No airlines found
                    </div>
                  )}

                  {filtered.map((a) => (
                    <button
                      type="button"
                      key={a.id}
                      onClick={() => handleSelectAirline(a)}
                      className="w-full text-left px-3 py-2 hover:bg-indigo-50 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-sm">{a.name}</div>
                        <div className="text-xs text-gray-500">
                          Code: {a.code}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Manage */}
            <div>
              <button
                type="button"
                onClick={openManageAirlinesPage}
                title="Manage Airlines"
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm shadow-sm hover:opacity-95 transition"
              >
                Manage
              </button>
            </div>
          </div>

          {selectedAirline && (
            <div className="mt-2 text-sm text-gray-700">
              Selected Airline: <strong>{selectedAirline.name}</strong> (
              {selectedAirline.code}){" "}
              <button
                onClick={clearSelectedAirline}
                className="ml-2 text-xs text-indigo-600"
                type="button"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600">
            Ticket
          </label>
          <div className="flex gap-2 items-center flex-shrink-0">
            <input
              type="number"
              value={ticketPrice}
              onChange={(e) =>
                setTicketPrice(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              className="p-2 border rounded-lg w-28 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
            <select
              value={ticketCurrency}
              onChange={(e) => setTicketCurrency(e.target.value)}
              className="p-2 border rounded-lg w-full md:w-20 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="SAR">SAR</option>
              <option value="USD">USD</option>
              <option value="PKR">PKR</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transport */}
      <div className="mt-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mt-3 items-center">
          {/* S1 */}
          <div>
            <label className="text-xs invisible">.</label>
            <input
              type="number"
              value={s1}
              onChange={(e) =>
                setS1(e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="JED → MAK"
              className="p-2 border rounded-lg w-full text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
              min={0}
            />
          </div>

          {/* S2 */}
          <div>
            <label className="text-xs invisible">.</label>
            <input
              type="number"
              value={s2}
              onChange={(e) =>
                setS2(e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="MAK → MED"
              className="p-2 border rounded-lg w-full text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
              min={0}
            />
          </div>

          {/* S3 */}
          <div>
            <label className="text-xs invisible">.</label>
            <input
              type="number"
              value={s3}
              onChange={(e) =>
                setS3(e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="MED → MAK"
              className="p-2 border rounded-lg w-full text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
              min={0}
            />
          </div>

          {/* S4 */}
          <div>
            <label className="text-xs invisible">.</label>
            <input
              type="number"
              value={s4}
              onChange={(e) =>
                setS4(e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="MAK → JED"
              className="p-2 border rounded-lg w-full text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
              min={0}
            />
          </div>

          {/* Vehicle (now from parent) */}
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <select
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
              className="p-2 border rounded-lg w-full text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="CAR">CAR</option>
              <option value="H1">H1</option>
              <option value="GMC">GMC</option>
              <option value="HIACE">HIACE</option>
              <option value="COASTER">COASTER</option>
            </select>
          </div>

          {/* Auto Total */}
          <div className="flex items-center">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoTotal"
                checked={autoTotal}
                onChange={(e) => setAutoTotal(e.target.checked)}
                className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
            </div>

            <input
              type="number"
              value={autoTotal ? transportTotal || 0 : manualTotal}
              onChange={(e) => {
                const val = e.target.value === "" ? "" : Number(e.target.value);
                setManualTotal(val === "" ? "" : Number(val));
                if (!autoTotal) {
                  setTransportTotal(val === "" ? 0 : Number(val));
                }
              }}
              placeholder="Total"
              className="p-2 border rounded-lg w-full text-sm mt-2 md:mt-0 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
              min={0}
            />
          </div>
        </div>
      </div>

      {/* Visa + Profit (NEW) */}
      <div className="mt-5 flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <label className="font-medium text-gray-700">Visa (SAR)</label>
          <input
            type="number"
            value={visaVal}
            onChange={(e) =>
              setDefaultVisaSAR(
                e.target.value === "" ? "" : Number(e.target.value)
              )
            }
            className="p-2 border rounded-lg w-full md:w-32 shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-100"
          />
        </div>

        {/* NEW: Profit input */}
        <div className="flex items-center gap-2">
          <label className="font-medium text-gray-700">Profit</label>

          <input
            type="number"
            value={profit}
            onChange={(e) =>
              setProfit(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="p-2 border rounded-lg w-full md:w-28 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-100"
            placeholder="amount"
            min={0}
          />

          <select
            value={profitCurrency}
            onChange={(e) => setProfitCurrency(e.target.value)}
            className="p-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-100"
          >
            <option value="SAR">SAR</option>
            <option value="USD">USD</option>
            <option value="PKR">PKR</option>
          </select>
        </div>
      </div>

      {/* Currency Rates */}
      <div className="mt-5">
        <div className="flex flex-col md:flex-row gap-6">
          <h4 className="font-medium text-gray-700 whitespace-nowrap">
            Currency Rates:
          </h4>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">
                1 SAR = PKR
              </label>
              <input
                type="number"
                value={rates.SAR_to_PKR}
                onChange={(e) =>
                  setRates((s) => ({
                    ...s,
                    SAR_to_PKR: Number(e.target.value),
                  }))
                }
                className="p-2 border rounded-lg w-full md:w-28 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">
                1 USD = SAR
              </label>
              <input
                type="number"
                value={rates.USD_to_SAR}
                onChange={(e) =>
                  setRates((s) => ({
                    ...s,
                    USD_to_SAR: Number(e.target.value),
                  }))
                }
                className="p-2 border rounded-lg w-28 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
