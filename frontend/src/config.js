export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
  ? import.meta.env.VITE_BACKEND_URL.replace("localhost", window.location.hostname).replace("127.0.0.1", window.location.hostname)
  : `http://${window.location.hostname}:4000`;
