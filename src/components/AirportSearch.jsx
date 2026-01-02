// src/components/AirportSearch.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { searchAirports } from "../services/airportService";
import { useNavigate } from "react-router-dom";

/**
 * Professional AirportSearch
 * - overlay dropdown (absolute) so it doesn't push page content
 * - debounce input
 * - keyboard navigation (up/down/enter/esc)
 * - click outside to close
 * - limited results + scrollable dropdown
 */

function useDebounce(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function AirportSearch({ className = "" }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 200);

  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const MAX_RESULTS = 10;

  // Do a compact, fast search using the service then improve ordering:
  const performSearch = useCallback(
    (q) => {
      if (!q || !q.trim()) {
        setResults([]);
        return;
      }
      try {
        const raw = searchAirports(q).slice(0, 200); // safety cap
        // simple ranking: exact startsWith (iata/name/country) first, then includes
        const ql = q.trim().toLowerCase();
        const starts = [];
        const includes = [];
        raw.forEach((r) => {
          const name = (r.name || "").toLowerCase();
          const iata = (r.iata || "").toLowerCase();
          const country = (r.country || "").toLowerCase();
          if (iata === ql || name.startsWith(ql) || country.startsWith(ql)) {
            starts.push(r);
          } else if (
            name.includes(ql) ||
            iata.includes(ql) ||
            country.includes(ql)
          ) {
            includes.push(r);
          } else {
            includes.push(r); // fallback
          }
        });
        const ordered = [...starts, ...includes].slice(0, MAX_RESULTS);
        setResults(ordered);
        setOpen(ordered.length > 0);
        setHighlightIndex(-1);
      } catch (err) {
        setResults([]);
        setOpen(false);
      }
    },
    [MAX_RESULTS]
  );

  useEffect(() => {
    if (!debouncedQuery || !debouncedQuery.trim()) {
      setResults([]);
      setOpen(false);
      setHighlightIndex(-1);
      return;
    }
    performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);

  // click outside closes dropdown
  useEffect(() => {
    function onDoc(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setHighlightIndex(-1);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // keyboard handling
  function onKeyDown(e) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      if (results.length) setOpen(true);
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(-1, i - 1));
    } else if (e.key === "Enter") {
      if (open && highlightIndex >= 0 && results[highlightIndex]) {
        selectAirport(results[highlightIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlightIndex(-1);
    }
  }

  function selectAirport(a) {
    // navigate to manage or details page — change as your app requires
    // Example: navigate to a search result page or fill input and close
    setQuery(`${a.name} (${a.iata})`);
    setOpen(false);
    setHighlightIndex(-1);
    // If you want to navigate on selection, uncomment:
    // navigate(`/airport/${a.id}`);
  }

  return (
    <div ref={containerRef} className={`w-full relative m-0 p-0 ${className}`}>
      <div
        className="
  flex flex-col sm:flex-row
  items-stretch sm:items-center
  gap-2
  bg-white rounded-lg shadow-sm border p-2
"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          onFocus={() => {
            if (results.length) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search airport by name, country, or IATA (e.g. 'JED', 'Karachi')"
          className="
  w-full sm:flex-1
  px-3 py-2
  border rounded-md text-sm h-10
  focus:outline-none
"
          aria-autocomplete="list"
          aria-expanded={open}
        />

        <button
          onClick={() => navigate("/manage-airports")}
          className="
  w-full sm:w-auto
  px-4 py-2
  border rounded-md hover:bg-gray-100
  text-sm h-10
  flex items-center justify-center
"
        >
          Manage
        </button>
      </div>

      {/* Dropdown: absolute overlay so it doesn't push content */}
      {open && results.length > 0 && (
        <div
          className="absolute left-2 right-2 md:left-0 md:right-0 mt-1 z-50"
          style={{ top: "calc(100% + 6px)" }}
        >
          <div
            className="
  bg-white border rounded shadow-lg
  max-h-[50vh] md:max-h-[600px]
  overflow-y-auto
"
          >
            {results.map((a, idx) => {
              const isActive = idx === highlightIndex;
              return (
                <div
                  key={a.id || `${a.iata}-${idx}`}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  onMouseLeave={() => setHighlightIndex(-1)}
                  onClick={() => selectAirport(a)}
                  className={`cursor-pointer p-3 flex justify-between items-center ${
                    isActive ? "bg-indigo-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div>
                    <div className="font-semibold text-sm">{a.name}</div>
                    <div className="text-xs text-gray-600">{a.country}</div>
                  </div>
                  <div className="font-bold text-sm ml-4">{a.iata}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
