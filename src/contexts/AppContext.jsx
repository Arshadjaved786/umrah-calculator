import React, { createContext, useContext } from "react";
import useLocalStorage from "../hooks/useLocalStorage";
import { slugify, randomSlug } from "../utils/slugify";

const AppContext = createContext();

export function AppProvider({ children }) {
  // AUTH state stored in localStorage
  const [auth, setAuth] = useLocalStorage("auth", {
    isLoggedIn: false,
    onboardedAgency: false,
    onboardedFooter: false,
    userId: null,
  });

  // CURRENT agency data stored in localStorage (single agency being edited)
  const [agency, setAgency] = useLocalStorage("agency", null);

  // FOOTER (profile/contact/social) stored in localStorage (current)
  const [footer, setFooter] = useLocalStorage("footer", null);

  // CENTRAL agencies list (shared store)
  const [agencies, setAgencies] = useLocalStorage("umrah_agencies", []);

  // ---------- helpers ----------
  function ensureUniqueSlug(baseSlug) {
    const clean = slugify(baseSlug) || randomSlug("ag");
    let candidate = clean;
    let i = 1;
    const exists = (s) =>
      agencies.some((a) => a && a.slug && String(a.slug).toLowerCase() === s);
    while (exists(candidate)) {
      candidate = `${clean}-${i}`;
      i += 1;
    }
    return candidate;
  }

  function buildProfilePath(slug) {
    return `${window.location.origin}/public/agency/${encodeURIComponent(
      slug
    )}`;
  }

  // ---------- auth ----------
  function login({ userId }) {
    setAuth({
      isLoggedIn: true,
      onboardedAgency: agency ? true : false,
      onboardedFooter: footer ? true : false,
      userId,
    });
  }

  function logout() {
    setAuth({
      isLoggedIn: false,
      onboardedAgency: false,
      onboardedFooter: false,
      userId: null,
    });
  }

  // ---------- Save / Update Agency ----------
  // data: object with agency fields (name, logo, contact, address, slug optional)
  function saveAgency(data) {
    if (!data) return null;

    // determine slug
    const raw = data.slug
      ? String(data.slug)
      : data.name
      ? String(data.name)
      : "";
    const slug = ensureUniqueSlug(raw || randomSlug("ag"));

    const ag = {
      ...data,
      slug,
    };

    // update current agency and auth flag
    setAgency(ag);
    setAuth((prev) => ({ ...prev, onboardedAgency: true }));

    // upsert into central agencies list
    setAgencies((prev = []) => {
      const arr = Array.isArray(prev) ? [...prev] : [];
      const idx = arr.findIndex(
        (x) => x && String(x.slug).toLowerCase() === String(slug).toLowerCase()
      );
      if (idx >= 0) {
        arr[idx] = { ...arr[idx], ...ag };
      } else {
        arr.unshift(ag);
      }
      return arr;
    });

    // return profilePath for convenience
    return buildProfilePath(slug);
  }

  // ---------- Save Footer (profile/contact/social) ----------
  // This merges footer into current agency, saves footer, updates central store and returns profilePath
  function saveFooter(data) {
    if (!data) return null;

    // save current footer state
    setFooter(data);
    setAuth((prev) => ({ ...prev, onboardedFooter: true }));

    // merge footer into current agency object (prefer existing agency fields)
    const current = agency || {};
    const mergedAgency = {
      ...current,
      // keep core agency fields, but ensure contact/social shallow-merge
      ...(current || {}),
      // footer fields override or add
      ...{
        // common keys we expect in footer: whatsapp, facebook, instagram, website, googleMapsLink, shortNote, youtube, tiktok
        whatsapp: data.whatsapp || current.whatsapp || current.contact || "",
        facebook: data.facebook || current.facebook || "",
        instagram: data.instagram || current.instagram || "",
        website: data.website || current.website || "",
        googleMapsLink: data.googleMapsLink || current.googleMapsLink || "",
        shortNote: data.shortNote || current.shortNote || "",
        youtube: data.youtube || current.youtube || "",
        tiktok: data.tiktok || current.tiktok || "",
      },
    };

    // ensure slug exists
    const baseSlug = mergedAgency.slug || mergedAgency.name || randomSlug("ag");
    const slug = ensureUniqueSlug(baseSlug);

    mergedAgency.slug = slug;

    // set as current agency
    setAgency(mergedAgency);

    // upsert into central agencies list
    setAgencies((prev = []) => {
      const arr = Array.isArray(prev) ? [...prev] : [];
      const idx = arr.findIndex(
        (x) => x && String(x.slug).toLowerCase() === String(slug).toLowerCase()
      );
      if (idx >= 0) {
        arr[idx] = { ...arr[idx], ...mergedAgency };
      } else {
        arr.unshift(mergedAgency);
      }
      return arr;
    });

    // return profile URL so caller can show QR / preview
    return buildProfilePath(slug);
  }

  // Edit helpers (optional)
  function updateAgency(data) {
    if (!data) return;
    // keep slug if present, else try to keep existing
    const slug =
      data.slug || agency?.slug || ensureUniqueSlug(data.name || "ag");
    const updated = { ...(agency || {}), ...data, slug };

    setAgency(updated);

    // update central store
    setAgencies((prev = []) => {
      const arr = Array.isArray(prev) ? [...prev] : [];
      const idx = arr.findIndex(
        (x) => x && String(x.slug).toLowerCase() === String(slug).toLowerCase()
      );
      if (idx >= 0) {
        arr[idx] = { ...arr[idx], ...updated };
      } else {
        arr.unshift(updated);
      }
      return arr;
    });
  }

  function updateFooter(data) {
    if (!data) return;
    setFooter(data);
    // also merge into agency and central list
    updateAgency({
      whatsapp: data.whatsapp,
      facebook: data.facebook,
      instagram: data.instagram,
      website: data.website,
      googleMapsLink: data.googleMapsLink,
      shortNote: data.shortNote,
      youtube: data.youtube,
      tiktok: data.tiktok,
    });
  }

  return (
    <AppContext.Provider
      value={{
        auth,
        login,
        logout,
        saveAgency,
        saveFooter,
        updateAgency,
        updateFooter,
        agency,
        footer,
        agencies, // expose central list
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// hook to use context
export const useApp = () => {
  const ctx = useContext(AppContext);
  return ctx;
};
