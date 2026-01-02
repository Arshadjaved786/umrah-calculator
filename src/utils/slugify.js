/**
 * slugify.js
 *
 * استعمال:
 * import { slugify } from "../utils/slugify";
 * const slug = slugify("Visa Nest Global Consultants");
 *
 * نتیجہ:
 * "visa-nest-global-consultants"
 */

export function slugify(text) {
  if (!text) return "";

  return String(text)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // space → dash
    .replace(/[^a-z0-9\-]/g, "") // باقی symbols ختم
    .replace(/\-+/g, "-"); // کئی dashes کو ایک dash بنا دیں
}

/**
 * randomSlug()
 * اگر نام نہ ہو تو random id بھی بنا سکتے ہیں
 */
export function randomSlug(prefix = "ag") {
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${rand}`;
}
