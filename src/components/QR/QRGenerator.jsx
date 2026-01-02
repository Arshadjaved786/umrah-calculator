import React, { useState, useEffect } from "react";
import { buildQrUrl, downloadQrAsPng } from "../../services/qrService";

/**
 * QRGenerator.jsx (updated)
 *
 * Props:
 * - value (string)         -> required
 * - size (number)          -> px default 300
 * - fileName (string)      -> download name
 * - showCopy (bool)        -> default true
 * - showDownload (bool)    -> default true
 * - showLink (bool)        -> show textual link (default true)
 * - showActions (bool)     -> show Open/Copy/Download buttons (default true)
 * - className (string)
 */

export default function QRGenerator({
  value,
  size = 300,
  fileName = "qr.png",
  showCopy = true,
  showDownload = true,
  showLink = true,
  showActions = true,
  className = "",
}) {
  const [src, setSrc] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pxSize = `${size}x${size}`;

  useEffect(() => {
    if (!value) {
      setSrc("");
      setLoading(false);
      setError("No value provided for QR");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = buildQrUrl(value, pxSize);
      setSrc(url);
    } catch (err) {
      console.error("QR build failed", err);
      setError("QR بنانے میں مسئلہ ہوا");
      setSrc("");
    } finally {
      setLoading(false);
    }
  }, [value, pxSize]);

  async function handleDownload() {
    if (!value) return;
    try {
      setLoading(true);
      // download at higher resolution for print
      await downloadQrAsPng(value, fileName, "800x800");
    } catch (err) {
      console.error("Download failed", err);
      setError("Download ناکام ہوا");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      alert("Link copied to clipboard");
    } catch (err) {
      console.error("Copy failed", err);
      setError("Copy نہیں ہو سکا");
    }
  }

  return (
    <div className={`qr-generator ${className}`}>
      <div className="flex items-center gap-3">
        <div
          className="bg-white border p-1 rounded flex items-center justify-center"
          style={{
            width: size,
            height: size,
            minWidth: size,
            minHeight: size,
          }}
          aria-hidden={loading || !!error}
        >
          {loading ? (
            <div className="text-xs text-gray-500">Loading...</div>
          ) : error ? (
            <div className="text-xs text-red-500 text-center">{error}</div>
          ) : (
            <img
              src={src}
              alt="QR code"
              className="w-full h-full object-contain"
              style={{ imageRendering: "pixelated" }}
            />
          )}
        </div>

        <div className="flex-1">
          {showLink && (
            <div className="text-sm text-gray-700 break-words">
              <div className="font-medium">Profile Link</div>
              <a
                href={value}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-indigo-600 underline"
              >
                {value}
              </a>
            </div>
          )}

          {showActions && (
            <div className="mt-2 flex items-center gap-2">
              {showDownload && (
                <button
                  onClick={handleDownload}
                  className="px-3 py-1 bg-gray-100 border rounded text-sm hover:bg-gray-200"
                  type="button"
                  aria-label="Download QR"
                >
                  Download QR
                </button>
              )}

              {showCopy && (
                <button
                  onClick={handleCopy}
                  className="px-3 py-1 border rounded text-sm hover:bg-gray-50"
                  type="button"
                  aria-label="Copy link"
                >
                  Copy Link
                </button>
              )}

              <button
                onClick={() => window.open(value, "_blank", "noopener")}
                className="px-3 py-1 border rounded text-sm hover:bg-gray-50"
                type="button"
                aria-label="Open link"
              >
                Open
              </button>
            </div>
          )}

          {error && <div className="text-xs text-red-500 mt-2">{error}</div>}
        </div>
      </div>
    </div>
  );
}
