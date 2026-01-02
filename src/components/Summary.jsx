import React from "react";

function fmt(n) {
  return Number(n).toLocaleString();
}

function fmtUSD(n) {
  return Number(n).toFixed(2);
}

export default function Summary({
  perPersonTotalSAR,
  totalSAR,
  totalPKR,
  totalUSD,
  pax,
  savePackage,
}) {
  return (
    <div
      className="
      p-5 
      rounded-xl 
      shadow-lg 
      mt-5 
      border 
      bg-white/70 
      backdrop-blur-md
      border-transparent 
      bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50
    "
    >
      {/* Title */}
      <h2
        className="
          text-xl 
          font-extrabold 
          mb-4 
          bg-gradient-to-r from-indigo-600 via-pink-500 to-purple-600 
          text-transparent 
          bg-clip-text
        "
      >
        Calculator Summary
      </h2>

      {/* PER PERSON */}
      <div className="mb-6">
        <div className="text-sm font-medium text-gray-500 mb-1 tracking-wide">
          Per Person Total
        </div>

        <div className="flex flex-col sm:flex-row sm:items-baseline gap-3 sm:gap-8">
          {/* PKR */}
          <div className="text-xl font-semibold text-gray-900">
            <span className="text-gray-500 text-sm">PKR</span>{" "}
            {fmt(totalSAR ? perPersonTotalSAR * (totalPKR / totalSAR) : 0)}
          </div>

          {/* SAR */}
          <div className="text-xl font-semibold text-gray-900 text-center sm:text-left">
            <span className="text-gray-500 text-sm">SAR</span>{" "}
            {fmt(perPersonTotalSAR)}
          </div>

          {/* USD */}
          <div className="text-xl font-semibold text-gray-900 text-center sm:text-left">
            <span className="text-gray-500 text-sm">USD</span>{" "}
            {fmtUSD((perPersonTotalSAR / totalSAR) * totalUSD)}
          </div>
        </div>
      </div>

      {/* TOTAL FOR ALL PAX */}
      <div className="mb-6">
        <div className="text-sm font-medium text-gray-500 mb-1 tracking-wide">
          Total ({pax} pax)
        </div>

        <div className="flex flex-col sm:flex-row sm:items-baseline gap-3 sm:gap-8">
          {/* PKR */}
          <div className="text-xl font-semibold text-gray-900 text-center sm:text-left">
            <span className="text-gray-500 text-sm">PKR</span> {fmt(totalPKR)}
          </div>

          {/* SAR */}
          <div className="text-xl font-semibold text-gray-900 text-center sm:text-left">
            <span className="text-gray-500 text-sm">SAR</span> {fmt(totalSAR)}
          </div>

          {/* USD */}
          <div className="text-xl font-semibold text-gray-900 text-center sm:text-left">
            <span className="text-gray-500 text-sm">USD</span>{" "}
            {fmtUSD(totalUSD)}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={savePackage}
        className="
          mt-2 
          px-6 
          py-2.5 
          rounded-lg 
          text-white 
          font-semibold 
          shadow-md 
          bg-gradient-to-r from-green-600 to-emerald-500 
          hover:from-green-700 hover:to-emerald-600 
          transition 
          w-full
        "
      >
        Save Package
      </button>
    </div>
  );
}
