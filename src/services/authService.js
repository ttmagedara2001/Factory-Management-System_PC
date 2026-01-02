import axios from "axios";

// Import shared API URL utility
import { getApiUrl } from "./api.js";
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

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📡 HTTP Response from /get-token API");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("✅ Status Code:", response.status, response.statusText);
      console.log("📋 Response Data:", JSON.stringify(response.data, null, 2));
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

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
        console.log(
          "🎫 JWT Token (first 30 chars):",
          jwtToken.substring(0, 30) + "..."
        );
        console.log("🔄 Refresh Token:", refreshToken ? "YES" : "NO");
        console.log("");

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

// ============================================
// NOTE: Token refresh is handled automatically by the axios
// interceptor in api.js (lines 168-206). When a 400/401 error
// occurs with an "Invalid token" message, the interceptor will
// automatically call /get-new-token and retry the request.
// 
// This centralized approach ensures:
// 1. No duplicate token refresh logic
// 2. Transparent retry of failed requests
// 3. Automatic logout if refresh fails
// ============================================
