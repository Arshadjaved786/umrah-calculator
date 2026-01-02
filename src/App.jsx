import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  Outlet,
} from "react-router-dom";

import { useApp } from "./contexts/AppContext";

import Onboarding from "./pages/Onboarding";
import UmrahCalculator from "./pages/UmrahCalculator";
import AgencyForm from "./components/AgencyForm";
import FooterForm from "./pages/FooterForm";
import AgencyPublic from "./pages/AgencyPublic";
import ManageAirlinesPage from "./pages/ManageAirlinesPage";
import ManageAirportsPage from "./pages/ManageAirportsPage";
import AirportSearch from "./components/AirportSearch";

// ⭐ نئی import (Trip Planner Page)
import TripPlanner from "./pages/TripPlanner";

/** NavButton — equal width, gradient backgrounds */
function NavButton({ to, label, gradientClass, textClass = "text-white" }) {
  return (
    <Link
      to={to}
      className={`${gradientClass} ${textClass} px-3 py-2 rounded-md shadow-sm hover:opacity-95 transition w-full md:w-28 text-center text-sm font-medium`}
    >
      {label}
    </Link>
  );
}

/**
 * HeaderWithSearch:
 * - Title (left), AirportSearch (center, wider), nav buttons (right, fixed width)
 */
function HeaderWithSearch() {
  return (
    <header className="bg-white shadow">
      <div className="w-full mx-auto px-4 py-2 flex flex-col gap-3 md:flex-row md:items-center">
        {/* Left Title: fixed left */}
        <div className="flex-shrink-0">
          <Link
            to="/"
            className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 via-pink-500 to-purple-600 text-transparent bg-clip-text"
          >
            Umrah Calculator
          </Link>
        </div>

        {/* Center Search: grows and centered, wider max width */}
        <div className="flex-1 flex justify-center">
          <div className="w-full max-w-full px-0 md:px-4">
            <AirportSearch />
          </div>
        </div>

        {/* Nav Buttons: fixed-size buttons, won't shrink */}
        <nav className="flex flex-wrap justify-center md:justify-end gap-2 w-full md:w-auto">
          <NavButton
            to="/"
            label="Dashboard"
            gradientClass="bg-gradient-to-r from-blue-500 to-blue-700"
          />

          <NavButton
            to="/trip-planner"
            label="Trip Planner"
            gradientClass="bg-gradient-to-r from-teal-400 to-teal-600"
          />

          <NavButton
            to="/agency"
            label="Agency"
            gradientClass="bg-gradient-to-r from-yellow-300 to-yellow-500"
            textClass="text-black"
          />

          <NavButton
            to="/footer"
            label="Footer"
            gradientClass="bg-gradient-to-r from-rose-400 to-rose-600"
          />

          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-700 text-white rounded-md shadow-sm hover:opacity-95 transition"
          >
            Reset
          </button>
        </nav>
      </div>
    </header>
  );
}

function MainLayout() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col overflow-x-hidden">
      {/* Header */}
      <HeaderWithSearch />

      {/* Content */}
      <main className="flex-1 w-full p-2">
        <div className="w-full">
          {/* pages render here */}
          <Outlet />
        </div>
      </main>

      <footer className="bg-white border-t mt-4">
        <div className="w-full p-4 text-sm text-gray-600">
          © Umrah Calculator
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  const ctx = useApp();

  if (!ctx) return <div className="p-6">Loading application...</div>;
  const { auth } = ctx;

  return (
    <BrowserRouter>
      <Routes>
        {/* 🔓 PUBLIC QR ROUTE (NO HEADER / NO NAV) */}
        <Route path="/agency/:slug" element={<AgencyPublic />} />

        {/* Onboarding System */}
        {!auth || !auth.isLoggedIn ? (
          <Route path="*" element={<Onboarding />} />
        ) : !auth.onboardedAgency ? (
          <Route path="*" element={<AgencyForm />} />
        ) : !auth.onboardedFooter ? (
          <Route path="*" element={<FooterForm />} />
        ) : (
          <Route element={<MainLayout />}>
            {/* Home → Umrah Calculator */}
            <Route path="/" element={<UmrahCalculator />} />

            {/* ⭐ نیا فیچر — Trip Planner */}
            <Route path="/trip-planner" element={<TripPlanner />} />

            {/* Old Routes */}

            <Route path="/agency" element={<AgencyForm />} />
            <Route path="/footer" element={<FooterForm />} />

            <Route path="/manage-airlines" element={<ManageAirlinesPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
}
