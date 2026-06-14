import { create } from "zustand";

export type ConnectionStatus = "idle" | "connecting" | "live" | "offline" | "error";

type ConnectionState = {
  status: ConnectionStatus;
  lastError: string | null;
  setStatus: (s: ConnectionStatus, err?: string | null) => void;
};

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: "idle",
  lastError: null,
  setStatus: (status, err = null) => set({ status, lastError: err }),
}));
