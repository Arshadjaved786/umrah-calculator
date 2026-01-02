// src/pages/AgencyPublic.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import { slugify } from "../utils/slugify";

/**
 * AgencyPublic.jsx (updated)
 * - slug سے central agencies list یا current agency میں تلاش کرے گا
 * - login/session پر depend نہیں کرے گا
 * - mobile-friendly buttons: WhatsApp, Call, Maps, Website
 * - social links دکھائے گا: Instagram, Facebook, YouTube, TikTok
 */

export default function AgencyPublic() {
  const { slug } = useParams();
  const {
    agencies = [],
    agency: currentAgency,
    footer: currentFooter,
  } = useApp();

  const [item, setItem] = useState(null); // final agency object
  const [footer, setFooter] = useState(null);

  useEffect(() => {
    // normalize incoming slug
    const target = String(slug || "").toLowerCase();

    // 1) تلاش کریں central agencies array میں
    let found =
      (Array.isArray(agencies) &&
        agencies.find((a) => String(a.slug || "").toLowerCase() === target)) ||
      null;

    // 2) fallback: اگر central میں نہ ملے تو current agency (context) دیکھیں
    if (!found && currentAgency) {
      const curSlug = String(
        currentAgency.slug || slugify(currentAgency.name || "")
      ).toLowerCase();
      if (curSlug === target) {
        found = currentAgency;
      }
    }

    // 3) اگر مل گیا تو footers کو central object سے یا provided footer سے merge کریں
    if (found) {
      setItem(found);
      // footer props may be stored inside agency or in currentFooter
      const mergedFooter = {
        whatsapp:
          found.whatsapp || found.contact || currentFooter?.whatsapp || "",
        facebook: found.facebook || currentFooter?.facebook || "",
        instagram: found.instagram || currentFooter?.instagram || "",
        website: found.website || currentFooter?.website || "",
        googleMapsLink:
          found.googleMapsLink ||
          currentFooter?.googleMapsLink ||
          found.address ||
          "",
        shortNote: found.shortNote || currentFooter?.shortNote || "",
        youtube: found.youtube || currentFooter?.youtube || "",
        tiktok: found.tiktok || currentFooter?.tiktok || "",
      };
      setFooter(mergedFooter);
    } else {
      setItem(null);
      setFooter(null);
    }
  }, [slug, agencies, currentAgency, currentFooter]);

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="bg-white p-6 rounded shadow text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Profile not found</h2>
          <p className="text-sm text-gray-600">
            یہ پروفائل دستیاب نہیں۔ ممکن ہے slug غلط ہو یا ابھی share نہیں کیا
            گیا۔
          </p>
        </div>
      </div>
    );
  }

  // prepare links
  const phone = (footer?.whatsapp || item.contact || "").toString();
  const cleanPhone = phone.replace(/\D/g, "");
  const whatsappLink = cleanPhone ? `https://wa.me/${cleanPhone}` : null;
  const telLink = cleanPhone ? `tel:${cleanPhone}` : null;
  const mapsLink =
    footer?.googleMapsLink ||
    (item.address
      ? `https://maps.google.com/?q=${encodeURIComponent(item.address)}`
      : null);
  const websiteLink = footer?.website || item.website || null;

  // share fallback
  const profileUrl = `${
    window.location.origin
  }/public/agency/${encodeURIComponent(
    item.slug || slugify(item.name || "agency")
  )}`;

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.name,
          text: `${item.name} - Contact`,
          url: profileUrl,
        });
      } catch (err) {
        // user cancelled or error
      }
    } else {
      // fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(profileUrl);
        alert("Link copied to clipboard");
      } catch (err) {
        alert("Unable to share. Please copy the link: " + profileUrl);
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6">
        {/* header */}
        <div className="text-center">
          {item.logo ? (
            <img
              src={item.logo}
              alt="logo"
              className="w-24 h-24 mx-auto rounded-lg object-cover border"
            />
          ) : (
            <div className="w-24 h-24 mx-auto rounded-lg border bg-gray-100 flex items-center justify-center text-xs text-gray-400">
              No Logo
            </div>
          )}

          <h1 className="mt-3 text-xl font-semibold text-gray-800">
            {item.name}
          </h1>
          {footer?.shortNote && (
            <p className="text-gray-500 text-sm mt-1">{footer.shortNote}</p>
          )}
        </div>

        {/* contact buttons */}
        <div className="mt-6 flex flex-col gap-3">
          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="w-full bg-green-600 text-white text-center py-2 rounded"
            >
              WhatsApp
            </a>
          )}

          {telLink && (
            <a
              href={telLink}
              className="w-full bg-gray-800 text-white text-center py-2 rounded"
            >
              Call
            </a>
          )}

          {websiteLink && (
            <a
              href={websiteLink}
              target="_blank"
              rel="noreferrer"
              className="w-full bg-indigo-600 text-white text-center py-2 rounded"
            >
              Visit Website
            </a>
          )}

          {mapsLink && (
            <a
              href={mapsLink}
              target="_blank"
              rel="noreferrer"
              className="w-full bg-gray-700 text-white text-center py-2 rounded"
            >
              View on Maps
            </a>
          )}

          <button
            onClick={handleShare}
            className="w-full bg-gray-100 text-gray-800 text-center py-2 rounded"
          >
            Share Profile
          </button>
        </div>

        {/* social links */}
        <div className="mt-6">
          <h3 className="text-sm text-gray-500 mb-2">Social Links</h3>
          <div className="flex items-center gap-3 flex-wrap">
            {footer?.instagram && (
              <a
                href={footer.instagram}
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-gray-100 rounded"
              >
                Instagram
              </a>
            )}
            {footer?.facebook && (
              <a
                href={footer.facebook}
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-gray-100 rounded"
              >
                Facebook
              </a>
            )}
            {footer?.youtube && (
              <a
                href={footer.youtube}
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-gray-100 rounded text-red-600"
              >
                YouTube
              </a>
            )}
            {footer?.tiktok && (
              <a
                href={footer.tiktok}
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-gray-100 rounded"
              >
                TikTok
              </a>
            )}
          </div>
        </div>

        {/* address */}
        {item.address && (
          <div className="mt-6">
            <h3 className="text-sm text-gray-500 mb-1">Address</h3>
            <p className="text-gray-700 text-sm">{item.address}</p>
          </div>
        )}
      </div>
    </div>
  );
}
