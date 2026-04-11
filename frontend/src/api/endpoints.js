export const ENDPOINTS = {
  HEALTH: "/health",
  REGISTER: "/auth/register",
  VERIFY_EMAIL_OTP: "/auth/verify-email-otp",
  RESEND_EMAIL_OTP: "/auth/resend-email-otp",
  FORGOT_PASSWORD_REQUEST_OTP: "/auth/forgot-password/request-otp",
  FORGOT_PASSWORD_RESET: "/auth/forgot-password/reset",
  LOGIN: "/auth/login",
  ME: "/auth/me",
  REFRESH: "/auth/refresh",
  LOGOUT: "/auth/logout",
  ITEMS: "/items",
  TASKS: "/tasks",
  HABITS: "/habits",
  HABITS_TRACK: (id) => `/habits/${id}/track`,
  NOTES: "/notes",
  NOTES_QUIZ: (id) => `/notes/${id}/quiz`, // ← NEW
};
