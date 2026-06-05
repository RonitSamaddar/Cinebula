/**
 * TV connection store — persists deviceId from QR scan.
 * Used as user identifier for all backend requests.
 */

import { create } from "zustand";

interface TVState {
  deviceId: string | null;
  setDeviceId: (id: string) => void;
  disconnect: () => void;
}

export const useTVStore = create<TVState>((set) => ({
  deviceId: null,

  setDeviceId: (id) => {
    localStorage.setItem("cinebula_device_id", id);
    set({ deviceId: id });
  },

  disconnect: () => {
    localStorage.removeItem("cinebula_device_id");
    set({ deviceId: null });
  },
}));
