import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './Context/AuthContext.jsx';
import { login } from "./services/authService.js";

// ✅ Auto-login credentials from environment variables
// Set these in .env file (see .env.example for template)
const email = import.meta.env.VITE_AUTH_EMAIL ;
const password = import.meta.env.VITE_AUTH_SECRET_KEY ; // This is the secretKey from Protonest dashboard

const AutoLogin = ({ children }) => {
  const { setAuth } = useAuth();
  const [loginAttempted, setLoginAttempted] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (loginAttempted) return;

    setLoginAttempted(true);

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

        // DO NOT set mock token - this causes WebSocket connection failures
        // Instead, show error state and require manual login
        console.warn("⚠️ WebSocket and API connections will not work until proper login");

        // Clear any existing tokens from localStorage
        try { localStorage.removeItem('jwtToken'); localStorage.removeItem('refreshToken'); } catch (e) { console.warn('Failed to remove tokens', e); }

        setAuth({ userId: null, jwtToken: null });
      } finally {
        setIsLoading(false);
      }
    };

    performLogin();
  }, [setAuth, loginAttempted]);

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
