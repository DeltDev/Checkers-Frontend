
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "";

/** Keep in sync with the `target` in vite.config.ts (the backend's launch port). */
export const DEV_API_TARGET = "http://localhost:5099";
