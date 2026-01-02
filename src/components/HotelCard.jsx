import React from "react";

export default function HotelCard({ title, hotel, setHotel }) {
  // number-friendly handler
  const handleNumberInput =
    (field, min = 0) =>
    (e) => {
      const raw = e.target.value;
      if (raw === "") {
        setHotel((s) => ({ ...s, [field]: "" }));
        return;
      }
      const v = Math.max(min, Number(raw));
      setHotel((s) => ({ ...s, [field]: isNaN(v) ? "" : v }));
    };

  const clampWeekend = (val) => {
    const nights = Number(hotel.nights) || 0;
    const w = Number(val) || 0;
    return Math.max(0, Math.min(w, nights));
  };

  return (
    <div className="p-3 rounded-xl shadow-md bg-gradient-to-br from-white via-indigo-50 to-pink-50 border border-gray-200">
      {title && (
        <h3 className="font-bold text-lg mb-2 bg-gradient-to-r from-indigo-600 via-pink-500 to-purple-600 text-transparent bg-clip-text">
          {title}
        </h3>
      )}

      <input
        className="w-full p-2 border rounded-lg mb-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
        placeholder="Hotel name"
        value={hotel.name}
        onChange={(e) => setHotel((s) => ({ ...s, name: e.target.value }))}
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        {/* Nights */}
        <input
          type="number"
          className="p-2 border rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-indigo-200"
          placeholder="Nights"
          value={hotel.nights === "" ? "" : hotel.nights}
          onChange={(e) => {
            handleNumberInput("nights", 1)(e);
            const newN = e.target.value === "" ? "" : Number(e.target.value);
            if (newN !== "") {
              setHotel((s) => ({
                ...s,
                weekendNights: clampWeekend(s.weekendNights),
              }));
            }
          }}
          min={1}
        />

        {/* Price per night */}
        <input
          type="number"
          className="p-2 border rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-emerald-200"
          placeholder="Price/night (SAR)"
          value={hotel.pricePerNight || ""}
          onChange={handleNumberInput("pricePerNight", 0)}
        />

        {/* Weekend nights */}
        <input
          type="number"
          className="p-2 border rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-indigo-200"
          placeholder="Weekend nights"
          value={hotel.weekendNights || ""}
          onChange={(e) =>
            setHotel((s) => ({
              ...s,
              weekendNights:
                e.target.value === ""
                  ? ""
                  : clampWeekend(Number(e.target.value)),
            }))
          }
          min={0}
          max={hotel.nights || undefined}
        />

        {/* Weekend night price */}
        <input
          type="number"
          className="p-2 border rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-rose-200"
          placeholder="Weekend price (SAR)"
          value={hotel.weekendPrice || ""}
          onChange={handleNumberInput("weekendPrice", 0)}
        />
      </div>

      <div className="mt-3 text-right font-semibold text-gray-700">
        Subtotal: SAR{" "}
        {(() => {
          const nights = Number(hotel.nights) || 0;
          const base = Number(hotel.pricePerNight) || 0;
          const wN = Number(hotel.weekendNights) || 0;
          const wP =
            hotel.weekendPrice === "" || hotel.weekendPrice === null
              ? base
              : Number(hotel.weekendPrice) || base;
          return nights * base + wN * wP;
        })()}
      </div>
    </div>
  );
}
