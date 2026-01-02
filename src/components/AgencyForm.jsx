import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../contexts/AppContext";
import { useNavigate } from "react-router-dom";

/**
 * AgencyForm.jsx
 * - Clean English UI
 * - Logo upload + preview + remove
 * - Basic validation (Name and Contact required)
 * - Save button disabled when validation fails
 *
 * Props:
 * - onClose: function to close modal/view (optional)
 *
 * Note: logo is stored as base64 string in agency.logo on client-side.
 */

export default function AgencyForm({ onClose }) {
  const { agency, saveAgency } = useApp();
  const navigate = useNavigate();

  const initial = agency || {
    name: "",
    owner: "",
    contact: "",
    email: "",
    address: "",
    logo: null, // base64 string
  };

  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  useEffect(() => {
    setDraft(agency || initial);
    setErrors({});
  }, [agency]);

  // Basic validation
  function validate(values) {
    const e = {};
    if (!values.name || values.name.trim().length < 2) {
      e.name = "Name is required (min 2 characters)";
    }
    if (!values.contact || values.contact.trim().length < 5) {
      e.contact = "Contact is required";
    }
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      e.email = "Please enter a valid email address";
    }
    return e;
  }

  useEffect(() => {
    setErrors(validate(draft));
  }, [draft]);

  function handleChange(field, value) {
    setDraft((s) => ({ ...s, [field]: value }));
  }

  function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    // Accept only images
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file only.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setDraft((s) => ({ ...s, logo: reader.result }));
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    setDraft((s) => ({ ...s, logo: null }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function save() {
    const validation = validate(draft);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      const firstKey = Object.keys(validation)[0];
      const el = document.querySelector(`[name="${firstKey}"]`);
      if (el) el.focus();
      return;
    }

    // === IMPORTANT: use saveAgency from context (not setAgency) ===
    saveAgency(draft);

    // اگر modal ہے تو close
    if (typeof onClose === "function") {
      onClose();
    } else {
      // ورنہ dashboard پر لے جائیں
      navigate("/dashboard");
    }
  }

  return (
    <div className="mb-6 p-5 bg-white rounded-lg shadow-md border border-gray-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-indigo-600 mb-1">
            Agency Details
          </h2>
          <p className="text-sm text-gray-500">
            Fill agency info and click Save — logo is optional.
          </p>
        </div>

        {/* Logo preview small */}
        <div className="flex items-center gap-2">
          {draft.logo ? (
            <div className="flex items-center gap-2">
              <img
                src={draft.logo}
                alt="Agency logo"
                className="w-16 h-16 rounded object-cover border"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded bg-gray-100 border flex items-center justify-center text-xs text-gray-400">
              No Logo
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        <div>
          <label className="text-sm text-gray-700 block mb-1">Name *</label>
          <input
            name="name"
            placeholder="Name"
            className={`w-full p-2 border rounded ${
              errors.name ? "border-red-400" : "border-gray-200"
            }`}
            value={draft.name}
            onChange={(e) => handleChange("name", e.target.value)}
          />
          {errors.name && (
            <p className="text-xs text-red-500 mt-1">{errors.name}</p>
          )}
        </div>

        <div>
          <label className="text-sm text-gray-700 block mb-1">Owner</label>
          <input
            name="owner"
            placeholder="Owner"
            className="w-full p-2 border rounded border-gray-200"
            value={draft.owner}
            onChange={(e) => handleChange("owner", e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-gray-700 block mb-1">Contact *</label>
          <input
            name="contact"
            placeholder="Contact"
            className={`w-full p-2 border rounded ${
              errors.contact ? "border-red-400" : "border-gray-200"
            }`}
            value={draft.contact}
            onChange={(e) => handleChange("contact", e.target.value)}
          />
          {errors.contact && (
            <p className="text-xs text-red-500 mt-1">{errors.contact}</p>
          )}
        </div>

        <div>
          <label className="text-sm text-gray-700 block mb-1">Email</label>
          <input
            name="email"
            placeholder="Email"
            className={`w-full p-2 border rounded ${
              errors.email ? "border-red-400" : "border-gray-200"
            }`}
            value={draft.email}
            onChange={(e) => handleChange("email", e.target.value)}
          />
          {errors.email && (
            <p className="text-xs text-red-500 mt-1">{errors.email}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="text-sm text-gray-700 block mb-1">Address</label>
          <textarea
            name="address"
            placeholder="Address (optional)"
            className="w-full p-2 border rounded border-gray-200"
            value={draft.address}
            onChange={(e) => handleChange("address", e.target.value)}
            rows={3}
          />
        </div>

        {/* Logo upload */}
        <div className="md:col-span-2">
          <label className="text-sm text-gray-700 block mb-2">
            Logo (optional)
          </label>

          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="block"
              aria-label="Upload logo image"
            />

            {draft.logo && (
              <div className="flex items-center gap-2">
                <img
                  src={draft.logo}
                  alt="Logo preview"
                  className="w-20 h-20 object-cover rounded border"
                />
                <button
                  type="button"
                  onClick={removeLogo}
                  className="px-3 py-1 border rounded text-sm hover:bg-gray-100 transition"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Note: Logo is stored client-side as base64 — upload to backend if
            you want server storage.
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={save}
          className={`px-4 py-2 rounded text-white transition ${
            Object.keys(errors).length === 0
              ? "bg-green-600 hover:bg-green-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
          disabled={Object.keys(errors).length > 0}
        >
          Save
        </button>

        <button
          onClick={() => {
            if (typeof onClose === "function") {
              onClose();
            } else {
              navigate("/dashboard");
            }
          }}
          className="px-4 py-2 border rounded hover:bg-gray-100 transition"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={() => {
            const w = window.open("", "_blank", "width=600,height=800");
            if (!w) return alert("Popup blocked — allow popups to preview.");
            const html = `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; padding:20px;">
                <h2>${draft.name || "Agency"}</h2>
                <p><strong>Owner:</strong> ${draft.owner || "-"}</p>
                <p><strong>Contact:</strong> ${draft.contact || "-"}</p>
                <p><strong>Email:</strong> ${draft.email || "-"}</p>
                <p><strong>Address:</strong> ${draft.address || "-"}</p>
                ${
                  draft.logo
                    ? `<img src="${draft.logo}" style="width:120px;height:120px;object-fit:cover;border:1px solid #ddd;margin-top:10px;" />`
                    : ""
                }
              </div>
            `;
            w.document.write(html);
            w.document.close();
          }}
          className="px-3 py-2 border rounded hover:bg-gray-100 transition text-sm"
        >
          Preview
        </button>
      </div>
    </div>
  );
}
