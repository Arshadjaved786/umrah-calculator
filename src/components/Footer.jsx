// src/components/Footer.jsx
import React from "react";
import { useApp } from "../contexts/AppContext";
import QRGenerator from "./QR/QRGenerator";
import { slugify } from "../utils/slugify";
import { downloadQrAsPng } from "../services/qrService";

export default function Footer() {
  const { agency, footer } = useApp();

  const slug = agency?.slug
    ? slugify(agency.slug)
    : agency?.name
    ? slugify(agency.name)
    : "agency";

  const profilePath = `${window.location.origin}/agency/${slug}`;

  const addressText =
    footer?.googleMapsLink || agency?.address || "Address not set";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(profilePath);
      alert("Link copied");
    } catch {
      alert("Copy failed");
    }
  }

  async function handleDownload() {
    try {
      await downloadQrAsPng(profilePath, `${slug}-qr.png`, "1200x1200");
    } catch {
      alert("Download failed");
    }
  }

  function handleOpen() {
    window.open(profilePath, "_blank", "noopener");
  }

  function Icon({ href, title, children }) {
    if (!href) return null;

    return (
      <a
        href={href}
        title={title}
        target="_blank"
        rel="noreferrer"
        className="
          flex items-center justify-center
          w-11 h-11 rounded-xl
          bg-white/30 backdrop-blur-md border border-white/40
          shadow-md
          hover:shadow-xl hover:bg-white/50
          transition-all duration-200
          hover:scale-110 hover:-translate-y-0.5
        "
      >
        {children}
      </a>
    );
  }

  return (
    <footer
      className="
    mt-10
    bg-gradient-to-r from-emerald-400 via-green-300 to-teal-400
    text-gray-900 py-6 px-4
  "
    >
      <div
        className="
  max-w-5xl mx-auto
  flex flex-col md:flex-row
  items-stretch md:items-center
  justify-between
  gap-6
"
      >
        {/* LEFT — address */}
        <div className="flex-1 flex items-center justify-center md:justify-start">
          <div
            className="
  text-sm sm:text-lg font-semibold tracking-wide
  bg-emerald-100/60

 px-3 py-2 rounded-lg backdrop-blur-md
  text-center md:text-left
  break-words
"
          >
            {addressText}
          </div>
        </div>

        {/* RIGHT AREA */}
        <div
          className="
  flex flex-col md:flex-row
  items-center
  gap-6
"
        >
          {/* Social Icons */}
          <div className="flex flex-wrap justify-center md:justify-start gap-3">
            {/* WhatsApp */}
            <Icon
              href={
                footer?.whatsapp
                  ? `https://wa.me/${String(footer.whatsapp).replace(
                      /\D/g,
                      ""
                    )}`
                  : null
              }
              title="WhatsApp"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <path d="M21 11.5C21 6.8 16.7 3 12 3S3 6.8 3 11.5c0 1.8.7 3.5 1.8 4.8L3.5 20.5l3.9-1.1c1.2.8 2.6 1.1 4.1 1.1 4.7 0 9.1-3.8 9.1-9z" />
                <path d="M16.2 14.2c-.6.5-1.3.8-2.1.8-1.1 0-2.1-.8-3-1.6-.9-.8-1.7-1.8-1.7-2.9 0-.8.3-1.5.8-2.1" />
              </svg>
            </Icon>

            {/* Facebook */}
            <Icon href={footer?.facebook} title="Facebook">
              <svg
                viewBox="0 0 24 24"
                className="w-6 h-6 text-blue-700"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <path d="M15 8h-1.5c-.8 0-1.5.7-1.5 1.5V11h3l-.5 3h-2.5v7h-3v-7H7v-3h2v-1.5C9 6.8 10.8 5 13 5h2v3z" />
              </svg>
            </Icon>

            {/* YouTube */}
            <Icon href={footer?.youtube} title="YouTube">
              <svg
                viewBox="0 0 24 24"
                className="w-7 h-7 text-red-600"
                fill="currentColor"
              >
                <path d="M10 15.5V8.5L16 12l-6 3.5z" />
              </svg>
            </Icon>

            {/* Instagram */}
            <Icon href={footer?.instagram} title="Instagram">
              <svg
                viewBox="0 0 24 24"
                className="w-6 h-6 text-pink-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="3.2" />
                <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
              </svg>
            </Icon>

            {/* TikTok */}
            <Icon href={footer?.tiktok} title="TikTok">
              <svg
                viewBox="0 0 24 24"
                className="w-6 h-6 text-black"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <path d="M12.5 7.5V12.5C12.5 13.3 11.8 14 11 14c-.8 0-1.5-.7-1.5-1.5S10.2 11 11 11H16V7.5h-3.5z" />
                <path d="M18 7V2.5" />
              </svg>
            </Icon>
          </div>

          {/* QR + Actions */}
          <div
            className="
  flex flex-col sm:flex-row
  items-center
  gap-4
  bg-white/20 backdrop-blur-lg p-3 rounded-xl shadow-lg
"
          >
            <QRGenerator
              value={profilePath}
              size={110}
              showCopy={false}
              showDownload={false}
              showLink={false}
              showActions={false}
            />

            <div className="flex flex-col gap-2">
              <button
                onClick={handleDownload}
                className="
  px-3 py-2 rounded-lg text-sm
  bg-white/70 backdrop-blur-md text-gray-900
  hover:bg-white hover:scale-[1.04]
  transition shadow
  w-full sm:w-auto
"
              >
                Download QR
              </button>

              <button
                onClick={handleCopy}
                className="
  px-3 py-2 rounded-lg text-sm
  bg-white/70 backdrop-blur-md text-gray-900
  hover:bg-white hover:scale-[1.04]
  transition shadow
  w-full sm:w-auto
"
              >
                Copy Link
              </button>

              <button
                onClick={handleOpen}
                className="
  px-3 py-2 rounded-lg text-sm
  bg-white/70 backdrop-blur-md text-gray-900
  hover:bg-white hover:scale-[1.04]
  transition shadow
  w-full sm:w-auto
"
              >
                Open
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
