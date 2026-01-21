import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './Context/AuthContext.jsx';
import { login } from "./services/authService.js";

// ═══════════════════════════════════════════════════════════════════════════
// CACHE SAFETY: Validate environment variables before any cache operations
// This prevents infinite reset loops during configuration issues
// ═══════════════════════════════════════════════════════════════════════════
const validateEnvironmentConfig = () => {
  const email = import.meta.env.VITE_AUTH_EMAIL;
  const password = import.meta.env.VITE_AUTH_SECRET_KEY;
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const wsUrl = import.meta.env.VITE_WS_URL;

  const missingVars = [];
  if (!email) missingVars.push('VITE_AUTH_EMAIL');
  if (!password) missingVars.push('VITE_AUTH_SECRET_KEY');
  if (!apiUrl) missingVars.push('VITE_API_BASE_URL');
  if (!wsUrl) missingVars.push('VITE_WS_URL');

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

// ═══════════════════════════════════════════════════════════════════════════
// CACHE VALIDATION: Only clear cache if environment is properly configured
// ═══════════════════════════════════════════════════════════════════════════
const validateCachedData = () => {
  // Don't trigger cache operations if env vars aren't configured
  if (!validateEnvironmentConfig()) {
    console.warn('⚠️ Skipping cache validation due to missing environment config');
    return;
  }

  try {
    // Validate selectedDevice exists and matches available devices
    const selectedDevice = localStorage.getItem('selectedDevice');
    if (selectedDevice) {
      // Basic validation - device ID should be a non-empty string
      if (typeof selectedDevice !== 'string' || selectedDevice.trim() === '') {
        console.warn('⚠️ Invalid selectedDevice in cache, clearing...');
        localStorage.removeItem('selectedDevice');
      }
    }

    // Validate JWT token format (basic check)
    const jwtToken = localStorage.getItem('jwtToken');
    if (jwtToken && jwtToken.length < 20) {
      console.warn('⚠️ Invalid JWT token in cache, clearing...');
      localStorage.removeItem('jwtToken');
    }

  } catch (error) {
    console.error('Error validating cache:', error);
  }
};

// Run cache validation on startup
validateCachedData();

// ✅ Auto-login credentials from environment variables
const email = import.meta.env.VITE_AUTH_EMAIL;
const password = import.meta.env.VITE_AUTH_SECRET_KEY;

const AutoLogin = ({ children }) => {
  const { setAuth } = useAuth();
  const [loginAttempted, setLoginAttempted] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [envError, setEnvError] = React.useState(null);

  React.useEffect(() => {
    if (loginAttempted) return;

    setLoginAttempted(true);

    // ═══════════════════════════════════════════════════════════════════════
    // CACHE SAFETY: Check if env vars are defined before attempting login
    // ═══════════════════════════════════════════════════════════════════════
    if (!email || !password) {
      console.error('❌ Cannot auto-login: Missing VITE_AUTH_EMAIL or VITE_AUTH_SECRET_KEY');
      setEnvError('Missing authentication credentials in environment configuration');
      setIsLoading(false);
      return;
    }

    const performLogin = async () => {
      try {
        console.log("🔑 Attempting auto login...");
        console.log("📧 Email:", email);
        console.log("🔐 SecretKey length:", password.length);

        const authData = await login(email, password);

        console.log("✅ Auto login successful. Ready for connection.");

        // Store JWT token in localStorage
        try { localStorage.setItem('jwtToken', authData.jwtToken); } catch (e) { console.warn('Failed to persist jwtToken', e); }

        // Store in AuthContext
        setAuth({ userId: authData.userId || email, jwtToken: authData.jwtToken });

        if (authData.refreshToken) {
          try { localStorage.setItem('refreshToken', authData.refreshToken); } catch (e) { console.warn('Failed to persist refreshToken', e); }
        }

      } catch (error) {
        console.error("❌ Auto login failed. Cannot connect to services.");
        console.error("Auto login error details:", error.message);

        if (error.message.includes("Invalid credentials")) {
          console.error("🔧 Credentials may be incorrect or expired. Please verify from Protonest dashboard");
        }

        // Clear any existing tokens from localStorage
        try { localStorage.removeItem('jwtToken'); localStorage.removeItem('refreshToken'); } catch (e) { console.warn('Failed to remove tokens', e); }

        setAuth({ userId: null, jwtToken: null });
      } finally {
        setIsLoading(false);
      }
    };

    performLogin();
  }, [setAuth, loginAttempted]);

  // Show environment configuration error
  if (envError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Configuration Error</h2>
          <p className="text-sm text-slate-600 mb-4">{envError}</p>
          <div className="bg-slate-50 rounded-lg p-4 text-left">
            <p className="text-xs font-semibold text-slate-700 mb-2">Required environment variables:</p>
            <ul className="text-xs text-slate-600 space-y-1 font-mono">
              <li>VITE_AUTH_EMAIL</li>
              <li>VITE_AUTH_SECRET_KEY</li>
              <li>VITE_API_BASE_URL</li>
              <li>VITE_WS_URL</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-700 font-medium">Authenticating with Protonest API...</p>
          <p className="text-emerald-600 text-sm mt-2">Connecting to factory systems...</p>
        </div>
      </div>
    );
  }

  return children;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <AutoLogin>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AutoLogin>
  </AuthProvider>
);
