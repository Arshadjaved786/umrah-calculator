import React, { useState, useEffect } from "react";
import { useApp } from "../contexts/AppContext";
import { useNavigate } from "react-router-dom";

/**
 * FooterForm.jsx (Updated)
 * -------------------------
 * - Footer save ہونے کے بعد saveFooter() ہمیں profilePath واپس دیتا ہے
 * - ہم فوراً اسی صفحے پر ایک چھوٹا QR preview دکھاتے ہیں
 * - پھر user چاہے dashboard پر جائے یا QR download کرے
 */

export default function FooterForm() {
  const { footer, saveFooter, agency } = useApp();
  const navigate = useNavigate();

  const initial = footer || {
    whatsapp: agency?.contact || "",
    facebook: "",
    instagram: "",
    website: "",
    googleMapsLink: "",
    shortNote: "",
    youtube: "",
    tiktok: "",
  };

  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState({});
  const [savedUrl, setSavedUrl] = useState(null); // NEW → QR preview link

  useEffect(() => {
    setDraft(footer || initial);
  }, [footer]);

  function handleChange(field, value) {
    setDraft((s) => ({ ...s, [field]: value }));
  }

  function validate(values) {
    const e = {};

    if (values.whatsapp && !/^[\d+\s\-]{6,20}$/.test(values.whatsapp)) {
      e.whatsapp = "Valid phone number لکھیں (digits only)";
    }

    if (values.website && !/^https?:\/\//i.test(values.website)) {
      e.website = "Website http:// یا https:// سے شروع ہونا چاہیے";
    }

    if (values.youtube && !/^https?:\/\//i.test(values.youtube)) {
      e.youtube = "YouTube link http:// یا https:// سے شروع ہونا چاہیے";
    }

    if (values.tiktok && !/^https?:\/\//i.test(values.tiktok)) {
      e.tiktok = "TikTok link http:// یا https:// سے شروع ہونا چاہیے";
    }

    return e;
  }

  useEffect(() => {
    setErrors(validate(draft));
  }, [draft]);

  function save() {
    const validation = validate(draft);
    setErrors(validation);

    if (Object.keys(validation).length > 0) {
      const first = Object.keys(validation)[0];
      const el = document.querySelector(`[name="${first}"]`);
      if (el) el.focus();
      return;
    }

    // saveFooter returns profilePath (public URL)
    const url = saveFooter(draft);
    setSavedUrl(url);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white rounded shadow p-6">
        <h2 className="text-xl font-semibold text-indigo-600 mb-2">
          Footer / Profile Details
        </h2>

        <p className="text-sm font-semibold mb-4 bg-gradient-to-r from-red-500 via-red-600 to-pink-500 bg-clip-text text-transparent">
          This information will appear on your QR Profile Page and in the
          footer.
        </p>

        {/* ------------------------ FORM FIELDS ------------------------ */}
        {!savedUrl && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-700 block mb-1">
                  WhatsApp / Phone
                </label>
                <input
                  name="whatsapp"
                  placeholder="+92300xxxxxxx"
                  className={`w-full p-2 border rounded ${
                    errors.whatsapp ? "border-red-400" : "border-gray-300"
                  }`}
                  value={draft.whatsapp}
                  onChange={(e) => handleChange("whatsapp", e.target.value)}
                />
                {errors.whatsapp && (
                  <p className="text-xs text-red-500 mt-1">{errors.whatsapp}</p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-700 block mb-1">
                  Website
                </label>
                <input
                  name="website"
                  placeholder="https://example.com"
                  className={`w-full p-2 border rounded ${
                    errors.website ? "border-red-400" : "border-gray-300"
                  }`}
                  value={draft.website}
                  onChange={(e) => handleChange("website", e.target.value)}
                />
                {errors.website && (
                  <p className="text-xs text-red-500 mt-1">{errors.website}</p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-700 block mb-1">
                  Instagram
                </label>
                <input
                  name="instagram"
                  placeholder="https://instagram.com/yourpage"
                  className="w-full p-2 border rounded border-gray-300"
                  value={draft.instagram}
                  onChange={(e) => handleChange("instagram", e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm text-gray-700 block mb-1">
                  Facebook
                </label>
                <input
                  name="facebook"
                  placeholder="https://facebook.com/yourpage"
                  className="w-full p-2 border rounded border-gray-300"
                  value={draft.facebook}
                  onChange={(e) => handleChange("facebook", e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm text-gray-700 block mb-1">
                  YouTube
                </label>
                <input
                  name="youtube"
                  placeholder="https://youtube.com/channel/…"
                  className={`w-full p-2 border rounded ${
                    errors.youtube ? "border-red-400" : "border-gray-300"
                  }`}
                  value={draft.youtube}
                  onChange={(e) => handleChange("youtube", e.target.value)}
                />
                {errors.youtube && (
                  <p className="text-xs text-red-500 mt-1">{errors.youtube}</p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-700 block mb-1">
                  TikTok
                </label>
                <input
                  name="tiktok"
                  placeholder="https://tiktok.com/@yourpage"
                  className={`w-full p-2 border rounded ${
                    errors.tiktok ? "border-red-400" : "border-gray-300"
                  }`}
                  value={draft.tiktok}
                  onChange={(e) => handleChange("tiktok", e.target.value)}
                />
                {errors.tiktok && (
                  <p className="text-xs text-red-500 mt-1">{errors.tiktok}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="text-sm text-gray-700 block mb-1">
                  Google Maps Link
                </label>
                <input
                  name="googleMapsLink"
                  placeholder="https://maps.google.com/?q=..."
                  className="w-full p-2 border rounded border-gray-300"
                  value={draft.googleMapsLink}
                  onChange={(e) =>
                    handleChange("googleMapsLink", e.target.value)
                  }
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm text-gray-700 block mb-1">
                  Short Note (optional)
                </label>
                <textarea
                  name="shortNote"
                  rows={3}
                  placeholder="Short note or tagline"
                  className="w-full p-2 border rounded border-gray-300"
                  value={draft.shortNote}
                  onChange={(e) => handleChange("shortNote", e.target.value)}
                />
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
                Save & Continue
              </button>

              <button
                onClick={() => navigate("/")}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Skip
              </button>
            </div>
          </>
        )}

        {/* ------------------------ QR PREVIEW AFTER SAVE ------------------------ */}
        {savedUrl && (
          <div className="mt-6 text-center">
            <h3 className="text-lg font-semibold text-green-600 mb-2">
              Footer Saved Successfully!
            </h3>

            <p className="text-sm text-blue-600 font-semibold mb-4">
              This is your QR Profile Link. Now anyone can scan it to view your
              contact and social links.
            </p>

            <div className="flex justify-center mt-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
                  savedUrl
                )}&size=200x200`}
                alt="QR"
                className="border p-2 rounded bg-white"
              />
            </div>

            <p className="text-xs mt-3 text-indigo-600 underline break-all">
              {savedUrl}
            </p>

            <button
              onClick={() => navigate("/")}
              className="mt-5 px-6 py-2 bg-indigo-600 text-white rounded shadow hover:bg-indigo-700"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
