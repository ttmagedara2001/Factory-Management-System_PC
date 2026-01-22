import axios from "axios";

// Backend API URL from environment variables
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Named helper to allow other modules to read the base API URL
export function getApiUrl() {
  return BASE_URL;
}

// ============================================
// NOTE: API business logic functions (getStreamDataForDevice,
// getStateDetailsForDevice, updateStateDetails, etc.) are
// centralized in deviceService.js. This file only provides:
// 1. The axios instance with interceptors
// 2. The base URL helper function
// ============================================

console.log("🔧 API Base URL:", BASE_URL);

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
  // ✅ Use HttpOnly cookies for authentication
  withCredentials: true,
});

// Request Interceptor: Adds cookies automatically (withCredentials: true)
api.interceptors.request.use(
  (config) => {
    // Note: X-Token header removed - using HttpOnly cookies instead
    // Cookies are sent automatically with withCredentials: true

    console.log("📤 API Request:", {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      withCredentials: config.withCredentials,
      payload: config.data || undefined,
    });

    return config;
  },
  (error) => {
    console.error("❌ Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response Interceptor: Handles Token Refresh (cookie-based) and various errors
api.interceptors.response.use(
  (response) => {
    console.log("📥 API Response:", {
      status: response.status,
      url: response.config.url,
      method: response.config.method?.toUpperCase(),
    });
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Log API errors for debugging (suppress repetitive 400 errors)
    if (error.response) {
      const is400Error = error.response.status === 400;
      const errorData =
        error.response.data?.data || error.response.data?.message;

      if (
        !is400Error ||
        (!window.__api400ErrorLogged &&
          errorData !== "Device does not belong to the user")
      ) {
        console.error("❌ API Error Response:", {
          status: error.response.status,
          statusText: error.response.statusText,
          url: originalRequest?.url,
          method: originalRequest?.method?.toUpperCase(),
          data: error.response.data,
          allowHeader: error.response.headers?.allow,
        });

        if (is400Error) {
          window.__api400ErrorLogged = true;
        }
      }

      // Enhanced logging for 400 errors
      if (error.response.status === 400) {
        const errorData =
          error.response.data?.data || error.response.data?.message;

        // Special handling for device ownership errors - show once
        if (errorData === "Device does not belong to the user") {
          if (!window.__deviceAuthErrorShown) {
            console.error("\n🚫 DEVICE AUTHORIZATION ERROR");
            console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            console.error("❌ Device does not belong to your account");
            console.error("\n💡 TO FIX THIS:");
            console.error("   1. Go to: https://api.protonestconnect.co");
            console.error("   2. Find your device ID in your dashboard");
            console.error("   3. Update 'defaultDeviceId' in Dashboard.jsx\n");
            console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
            window.__deviceAuthErrorShown = true;
          }
          return Promise.reject(error);
        }

        // Only log non-auth 400 errors in detail
        if (errorData !== "Device does not belong to the user") {
          console.error("🔍 400 Error:", {
            endpoint: originalRequest?.url,
            message: errorData,
          });
        }
      }
    }

    // Handle 405 Method Not Allowed
    if (error.response?.status === 405) {
      console.error("🚫 Method Not Allowed (405):", {
        attempted: originalRequest?.method?.toUpperCase(),
        endpoint: originalRequest?.url,
        allowed: error.response.headers?.allow || "Not specified",
      });

      return Promise.reject(error);
    }

    // Handle token refresh for 400/401 "Invalid token" errors (cookie-based refresh)
    if (
      (error.response?.status === 400 || error.response?.status === 401) &&
      !originalRequest?.url?.includes("/user/get-token") &&
      (error.response?.data?.data === "Invalid token" ||
        error.response?.data?.message?.includes("token")) &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        console.log("🔄 Attempting cookie-based token refresh...");

        // Cookie-based token refresh: GET /user/get-new-token
        // Base URL is /api/v1, endpoint includes /user/ prefix
        // Server reads refresh token from HttpOnly cookie and sets new JWT cookie
        const response = await axios.get(`${BASE_URL}/user/get-new-token`, {
          withCredentials: true,
          timeout: 10000,
        });

        if (response.data.status === "Success") {
          console.log("✅ Token refreshed successfully (cookie updated)");
          // Retry original request - new token is in cookie
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error("❌ Token refresh failed:", refreshError.message);
        // Clear any local state and redirect to login
        localStorage.clear();
        window.location.href = "/";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
