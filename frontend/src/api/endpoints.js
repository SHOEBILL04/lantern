export const ENDPOINTS = {
  HEALTH: "/health",
  REGISTER: "/auth/register",
  LOGIN: "/auth/login",
  ME: "/auth/me",
  REFRESH: "/auth/refresh",
  LOGOUT: "/auth/logout",
  ITEMS: "/items",
  HABITS: "/habits",
  HABITS_TRACK: (id) => `/habits/${id}/track`,
};
