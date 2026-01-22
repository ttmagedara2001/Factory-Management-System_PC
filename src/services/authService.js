// ============================================
// AUTHENTICATION SERVICE - Cookie-Based Auth
// ============================================
// Uses fetch with credentials: 'include' for HttpOnly cookie handling
// The server sets authentication cookies on successful login
// ============================================

import { getApiUrl } from "./api.js";
const API_URL = getApiUrl();

/**
 * Login and authenticate with the Protonest API
 * Uses fetch with credentials: 'include' to handle HttpOnly cookies
 * 
 * @param {string} email - User email
 * @param {string} password - Secret key from Protonest dashboard
 * @returns {Promise<{userId: string}>} User ID on success
 */
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
    console.log("📋 IMPORTANT: Using secretKey as password (not login password)");

    console.log("🔄 Attempting /user/get-token with documented payload structure:", {
      email: cleanEmail,
      passwordType: "secretKey",
      passwordLength: cleanPassword.length,
    });

    try {
      // ═══════════════════════════════════════════════════════════════════════
      // COOKIE-BASED AUTH: Use fetch with credentials: 'include'
      // This allows the browser to receive and store HttpOnly cookies
      // Note: Base URL already includes /user, so endpoint is just /get-token
      // ═══════════════════════════════════════════════════════════════════════
      const response = await fetch(`${API_URL}/user/get-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include', // ⭐ REQUIRED for HttpOnly cookies
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 400) {
          console.error("❌ Authentication failed (400):", {
            serverResponse: JSON.stringify(errorData, null, 2),
            possibleCauses: [
              "Invalid email format - check email address",
              "Invalid credentials - verify email is registered",
              "Wrong secretKey - check Protonest dashboard for correct secretKey",
              "User not found - email not registered in system",
              "Email not verified - check email verification status",
            ],
          });

          if (errorData?.data === "Invalid email format") {
            throw new Error("Invalid email format. Please check the email address.");
          } else if (errorData?.data === "Invalid credentials") {
            throw new Error("Invalid credentials. Please verify the email and secretKey from Protonest dashboard.");
          } else if (errorData?.data === "User not found") {
            throw new Error("User not found. Please check if the email is registered in the system.");
          } else if (errorData?.data === "Email not verified") {
            throw new Error("Email not verified. Please verify your email address first.");
          } else {
            throw new Error(`Authentication failed: ${errorData?.data || "Please verify email and secretKey"}`);
          }
        } else if (response.status === 500) {
          console.error("❌ Server error (500):", errorData);
          throw new Error("Internal server error. Please try again later.");
        } else {
          throw new Error(`Login failed with status ${response.status}`);
        }
      }

      const data = await response.json();

      // Check for successful response
      if (data.status === "Success") {
        console.log("✅ Login successful, cookies stored by browser");
        console.log("🍪 HttpOnly cookies set - authentication ready");
        
        // Note: With cookie-based auth, we don't need to store tokens
        // The browser automatically handles HttpOnly cookies
        // We may still receive tokens in response for backwards compatibility
        const jwtToken = data.data?.jwtToken;
        const refreshToken = data.data?.refreshToken;

        if (jwtToken) {
          console.log("🎫 JWT Token also received (first 30 chars):", jwtToken.substring(0, 30) + "...");
        }

        return { 
          userId: cleanEmail,
          jwtToken: jwtToken || null,
          refreshToken: refreshToken || null
        };
      } else {
        throw new Error(`Authentication failed: ${data.message || "Unexpected response status"}`);
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error("❌ Network error - could not reach API server");
        throw new Error("Network error. Please check your internet connection.");
      }
      throw error;
    }
  } catch (error) {
    console.error("❌ Login process failed:", {
      message: error.message,
      email: email?.trim(),
      hasPassword: !!password,
      passwordLength: password?.length || 0,
    });
    throw error;
  }
};
