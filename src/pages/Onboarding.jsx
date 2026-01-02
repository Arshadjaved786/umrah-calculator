import React, { useState } from "react";
import { useApp } from "../contexts/AppContext";
import usePWAInstall from "../hooks/usePWAInstall";

export default function Onboarding() {
  const { auth, login } = useApp();
  const { canInstall, install } = usePWAInstall();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  function submit(e) {
    e.preventDefault();

    if (form.email.length < 3 || form.password.length < 3) {
      alert("Please enter valid email & password.");
      return;
    }

    // Mock login
    login({ userId: form.email });
    // Redirect logic App.jsx میں handle ہو رہا ہے
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-5">
      <div className="bg-white shadow-lg rounded p-6 w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-2 text-indigo-600 text-center">
          Welcome — Login to Start
        </h2>

        <p className="text-sm text-gray-500 text-center mb-4">
          Mobile: Menu (⋮) → Add to Home Screen
          <br />
          Desktop: Chrome may show Install icon after repeated use
        </p>

        {/* 🔽 INSTALL APP BUTTON (صرف پہلی بار) */}
        {canInstall && (
          <div className="mb-4">
            <button
              onClick={install}
              className="
                w-full py-3 rounded-xl
                bg-gradient-to-r from-green-500 to-emerald-600
                text-white font-semibold
                shadow-md
                active:scale-95
                transition
              "
            >
              Install App
            </button>

            <p className="text-xs text-gray-500 text-center mt-2">
              iPhone users: Share → Add to Home Screen
            </p>
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            className="border p-2 w-full rounded"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <input
            type="password"
            placeholder="Password"
            className="border p-2 w-full rounded"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
