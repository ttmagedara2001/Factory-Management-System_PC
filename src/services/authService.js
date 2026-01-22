// ============================================
// AUTHENTICATION SERVICE - Cookie-Based Auth
// ============================================
// Uses fetch with credentials: 'include' for HttpOnly cookie handling
// The server sets authentication cookies on successful login
// ============================================

import { getApiUrl } from "./api.js";
const API_URL = getApiUrl();

// ═══════════════════════════════════════════════════════════════════════════
// Environment Configuration
// ═══════════════════════════════════════════════════════════════════════════
const AUTH_EMAIL = import.meta.env.VITE_AUTH_EMAIL;
const AUTH_SECRET_KEY = import.meta.env.VITE_AUTH_SECRET_KEY;

/**
 * Validate that required environment variables are configured
 * @returns {boolean} True if all required vars are present
 */
export const validateEnvironmentConfig = () => {
  const missingVars = [];
  if (!AUTH_EMAIL) missingVars.push('VITE_AUTH_EMAIL');
  if (!AUTH_SECRET_KEY) missingVars.push('VITE_AUTH_SECRET_KEY');
  if (!API_URL) missingVars.push('VITE_API_BASE_URL');
  if (!import.meta.env.VITE_WS_URL) missingVars.push('VITE_WS_URL');

  if (missingVars.length > 0) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ ENVIRONMENT CONFIGURATION ERROR');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Missing environment variables:', missingVars.join(', '));
    console.error('\n💡 TO FIX THIS:');
    console.error('   1. Create a .env file in the project root');
    console.error('   2. Add the required variables (see .env.example)');
    console.error('   3. Restart the development server\n');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return false;
  }

  return true;
};

/**
 * Get the list of missing environment variables
 * @returns {string[]} Array of missing variable names
 */
export const getMissingEnvVars = () => {
  const missingVars = [];
  if (!AUTH_EMAIL) missingVars.push('VITE_AUTH_EMAIL');
  if (!AUTH_SECRET_KEY) missingVars.push('VITE_AUTH_SECRET_KEY');
  if (!API_URL) missingVars.push('VITE_API_BASE_URL');
  if (!import.meta.env.VITE_WS_URL) missingVars.push('VITE_WS_URL');
  return missingVars;
};

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
      // Base URL is /api/v1, endpoint includes /user/ prefix
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

      // Handle response body - may be empty for cookie-only auth
      const responseText = await response.text();
      
      // If response is empty, assume success (cookies were set)
      if (!responseText || responseText.trim() === '') {
        console.log("✅ Login successful (cookie-only response)");
        console.log("🍪 HttpOnly cookies set - authentication ready");
        return { 
          userId: cleanEmail,
          jwtToken: null,
          refreshToken: null
        };
      }

      // Try to parse JSON response
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.warn("⚠️ Response is not JSON, treating as success:", responseText.substring(0, 100));
        return { 
          userId: cleanEmail,
          jwtToken: null,
          refreshToken: null
        };
      }

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

/**
 * Auto-login using environment variables
 * This is the main entry point for automatic authentication
 * 
 * @returns {Promise<{success: boolean, userId?: string, error?: string}>}
 */
export const autoLogin = async () => {
  console.log("🔑 Attempting auto login...");
  
  // Validate environment configuration
  if (!validateEnvironmentConfig()) {
    return {
      success: false,
      error: 'Missing authentication credentials in environment configuration',
      missingVars: getMissingEnvVars()
    };
  }

  console.log("📧 Email:", AUTH_EMAIL);
  console.log("🔐 SecretKey length:", AUTH_SECRET_KEY?.length || 0);

  try {
    const authData = await login(AUTH_EMAIL, AUTH_SECRET_KEY);
    
    console.log("✅ Auto login successful. Ready for connection.");

    // Store JWT token in localStorage (optional, cookies are primary)
    if (authData.jwtToken) {
      try { 
        localStorage.setItem('jwtToken', authData.jwtToken); 
      } catch (e) { 
        console.warn('Failed to persist jwtToken', e); 
      }
    }

    if (authData.refreshToken) {
      try { 
        localStorage.setItem('refreshToken', authData.refreshToken); 
      } catch (e) { 
        console.warn('Failed to persist refreshToken', e); 
      }
    }

    return {
      success: true,
      userId: authData.userId,
      jwtToken: authData.jwtToken
    };

  } catch (error) {
    console.error("❌ Auto login failed. Cannot connect to services.");
    console.error("Auto login error details:", error.message);

    if (error.message.includes("Invalid credentials")) {
      console.error("🔧 Credentials may be incorrect or expired. Please verify from Protonest dashboard");
    }

    // Clear any existing tokens from localStorage
    try { 
      localStorage.removeItem('jwtToken'); 
      localStorage.removeItem('refreshToken'); 
    } catch (e) { 
      console.warn('Failed to remove tokens', e); 
    }

    return {
      success: false,
      error: error.message
    };
  }
};
