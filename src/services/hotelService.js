// src/services/hotelService.js
import localforage from "localforage";
import makkahData from "../data/makkahHotels.json";
import madinahData from "../data/madinahHotels.json";

const store = localforage.createInstance({
  name: "umrah_data_store",
});

// --- Read functions (use cache if present) ---
export async function getMakkahHotels(force = false) {
  try {
    if (!force) {
      const cached = await store.getItem("makkah_hotels");
      if (cached && Array.isArray(cached) && cached.length > 0) {
        return cached;
      }
    }
    await store.setItem("makkah_hotels", makkahData);
    return makkahData;
  } catch (err) {
    return makkahData;
  }
}

export async function getMadinahHotels(force = false) {
  try {
    if (!force) {
      const cached = await store.getItem("madinah_hotels");
      if (cached && Array.isArray(cached) && cached.length > 0) {
        return cached;
      }
    }
    await store.setItem("madinah_hotels", madinahData);
    return madinahData;
  } catch (err) {
    return madinahData;
  }
}

// --- Write helpers: add / update / delete for Makkah ---
export async function addMakkahHotel(hotel) {
  try {
    const list = (await getMakkahHotels()) || [];
    // ensure unique id
    const id = hotel.id || `mkh-${Date.now()}`;
    const next = [...list, { ...hotel, id }];
    await store.setItem("makkah_hotels", next);
    return { ok: true, hotel: { ...hotel, id } };
  } catch (err) {
    return { ok: false, error: err };
  }
}

export async function updateMakkahHotel(id, patch) {
  try {
    const list = (await getMakkahHotels()) || [];
    const next = list.map((h) => (h.id === id ? { ...h, ...patch } : h));
    await store.setItem("makkah_hotels", next);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err };
  }
}

export async function deleteMakkahHotel(id) {
  try {
    const list = (await getMakkahHotels()) || [];
    const next = list.filter((h) => h.id !== id);
    await store.setItem("makkah_hotels", next);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err };
  }
}

// --- Write helpers: add / update / delete for Madinah ---
export async function addMadinahHotel(hotel) {
  try {
    const list = (await getMadinahHotels()) || [];
    const id = hotel.id || `mdn-${Date.now()}`;
    const next = [...list, { ...hotel, id }];
    await store.setItem("madinah_hotels", next);
    return { ok: true, hotel: { ...hotel, id } };
  } catch (err) {
    return { ok: false, error: err };
  }
}

export async function updateMadinahHotel(id, patch) {
  try {
    const list = (await getMadinahHotels()) || [];
    const next = list.map((h) => (h.id === id ? { ...h, ...patch } : h));
    await store.setItem("madinah_hotels", next);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err };
  }
}

export async function deleteMadinahHotel(id) {
  try {
    const list = (await getMadinahHotels()) || [];
    const next = list.filter((h) => h.id !== id);
    await store.setItem("madinah_hotels", next);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err };
  }
}

// --- Cache utilities ---
export async function clearHotelCache() {
  try {
    await store.removeItem("makkah_hotels");
    await store.removeItem("madinah_hotels");
    return true;
  } catch (err) {
    return false;
  }
}
