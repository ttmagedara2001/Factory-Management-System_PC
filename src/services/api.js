import axios from "axios";

// Environment-based API URL selection
const getApiUrl = () => {
  const isDev = import.meta.env.DEV;
  const useLocal = import.meta.env.VITE_USE_LOCAL_API === "true";

  if (isDev && useLocal) {
    return "http://localhost:8091/api/v1/user";
  }
  return "https://api.protonestconnect.co/api/v1/user";
};

const BASE_URL = getApiUrl();

console.log("🔧 API Base URL:", BASE_URL);

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000, // 15 second timeout
});

// Request Interceptor: Adds X-Token header if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("jwtToken");
    if (token && token !== "MOCK_TOKEN_FOR_TESTING") {
      config.headers["X-Token"] = token;
    }

    console.log("📤 API Request:", {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      hasToken: !!token && token !== "MOCK_TOKEN_FOR_TESTING",
      payload: config.data || undefined,
    });

    return config;
  },
  (error) => {
    console.error("❌ Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response Interceptor: Handles Token Refresh and various errors
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
      // Only log detailed errors for non-400 or first-time 400 errors
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
            console.error(
              "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            );
            console.error("❌ Device does not belong to your account");
            console.error("\n💡 TO FIX THIS:");
            console.error("   1. Go to: https://api.protonestconnect.co");
            console.error("   2. Find your device ID in your dashboard");
            console.error("   3. Update 'defaultDeviceId' in Dashboard.jsx\n");
            console.error(
              "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            );
            window.__deviceAuthErrorShown = true;
          }
          // Silent return for subsequent auth errors
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

      // Don't retry 405 errors - they need code changes
      return Promise.reject(error);
    }

    // Handle token refresh for 400/401 errors (but not for auth endpoints)
    if (
      (error.response?.status === 400 || error.response?.status === 401) &&
      !originalRequest?.url?.includes("/get-token") && // Don't try refresh on login endpoints
      (error.response?.data?.data === "Invalid token" ||
        error.response?.data?.message?.includes("token")) &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) throw new Error("No refresh token available");

        console.log("🔄 Attempting token refresh...");

        const response = await axios.post(
          `${BASE_URL}/get-new-token`,
          {},
          {
            headers: { "X-Refresh-Token": refreshToken },
            timeout: 10000,
          }
        );

        if (response.data.status === "Success") {
          const { jwtToken } = response.data.data;
          localStorage.setItem("jwtToken", jwtToken);
          originalRequest.headers["X-Token"] = jwtToken;

          console.log("✅ Token refreshed successfully");
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error("❌ Token refresh failed:", refreshError.message);
        localStorage.clear();
        window.location.href = "/";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
