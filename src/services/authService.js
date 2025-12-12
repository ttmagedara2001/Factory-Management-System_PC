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

const API_URL = getApiUrl();

// Authentication and get JWT + refresh token
export const login = async (email, password) => {
  try {
    // Validate input before making request
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    // Clean and validate email format
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail.includes("@")) {
      throw new Error("Invalid email format");
    }

    console.log("🔄 Making secure authentication request to:", API_URL);
    console.log(
      "📋 IMPORTANT: Using secretKey as password (not login password)"
    );

    // Based on API documentation, use exact payload structure
    const payload = {
      email: cleanEmail,
      password: cleanPassword, // This should be the secretKey from Protonest dashboard
    };

    console.log("🔄 Attempting /get-token with documented payload structure:", {
      email: cleanEmail,
      passwordType: "secretKey",
      passwordLength: cleanPassword.length,
    });

    try {
      const response = await axios.post(`${API_URL}/get-token`, payload, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
        timeout: 10000,
      });

      console.log("📡 API Response from /get-token (Success):", response.data);

      // Check for successful response according to API docs
      if (response.data.status === "Success") {
        const jwtToken = response.data.data?.jwtToken;
        const refreshToken = response.data.data?.refreshToken;

        if (!jwtToken) {
          throw new Error("No JWT token in response data");
        }

        console.log(
          "✅ Login successful via /get-token. JWT token received securely."
        );
        return { jwtToken, refreshToken, userId: cleanEmail };
      } else {
        throw new Error(
          `Authentication failed: ${
            response.data.message || "Unexpected response status"
          }`
        );
      }
    } catch (error) {
      // Enhanced error logging based on API documentation
      if (error.response?.status === 400) {
        const serverResponse = error.response.data;

        console.error("❌ Authentication failed (400):", {
          serverResponse: JSON.stringify(serverResponse, null, 2),
          possibleCauses: [
            "Invalid email format - check email address",
            "Invalid credentials - verify email is registered",
            "Wrong secretKey - check Protonest dashboard for correct secretKey",
            "User not found - email not registered in system",
            "Email not verified - check email verification status",
          ],
        });

        // Provide specific error message based on server response
        if (serverResponse?.data === "Invalid email format") {
          throw new Error(
            "Invalid email format. Please check the email address."
          );
        } else if (serverResponse?.data === "Invalid credentials") {
          throw new Error(
            "Invalid credentials. Please verify the email and secretKey from Protonest dashboard."
          );
        } else if (serverResponse?.data === "User not found") {
          throw new Error(
            "User not found. Please check if the email is registered in the system."
          );
        } else if (serverResponse?.data === "Email not verified") {
          throw new Error(
            "Email not verified. Please verify your email address first."
          );
        } else {
          throw new Error(
            `Authentication failed: ${
              serverResponse?.data || "Please verify email and secretKey"
            }`
          );
        }
      } else if (error.response?.status === 500) {
        console.error("❌ Server error (500):", error.response.data);
        throw new Error("Internal server error. Please try again later.");
      } else {
        console.error(
          `❌ Unexpected error (${error.response?.status}):`,
          error.response?.data
        );
        throw error;
      }
    }
  } catch (error) {
    // Final error logging
    console.error("❌ Login process failed:", {
      message: error.message,
      email: email?.trim(),
      hasPassword: !!password,
      passwordLength: password?.length || 0,
    });
    throw error;
  }
};

// Token refresh function using /get-new-token endpoint
export const refreshToken = async (refreshToken) => {
  try {
    if (!refreshToken) {
      throw new Error("Refresh token is required");
    }

    console.log("🔄 Attempting token refresh with /get-new-token endpoint");

    const response = await axios.post(
      `${API_URL}/get-new-token`,
      {}, // Empty body
      {
        headers: {
          "X-Refresh-Token": refreshToken,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 10000,
      }
    );

    console.log("📡 Token refresh response:", response.data);

    if (response.data.status === "Success") {
      const newJwtToken =
        response.data.data?.jwtToken || response.data.jwtToken;
      const newRefreshToken =
        response.data.data?.refreshToken || response.data.refreshToken;

      if (newJwtToken) {
        console.log("✅ Token refresh successful");
        return { jwtToken: newJwtToken, refreshToken: newRefreshToken };
      } else {
        throw new Error("No JWT token in refresh response");
      }
    } else {
      throw new Error(
        `Token refresh failed: ${response.data.message || "Unknown error"}`
      );
    }
  } catch (error) {
    console.error("❌ Token refresh failed:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};
