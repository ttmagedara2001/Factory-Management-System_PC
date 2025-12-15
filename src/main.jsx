import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './Context/AuthContext.jsx';
import { login } from "./services/authService.js";

// ✅ Auto-login credentials
// Replace these with your actual Protonest credentials
const email = "ratnaabinayansn@gmail.com";
const password = "6M3@pwYvBGRVJLN"; // This is the secretKey from Protonest dashboard

const AutoLogin = ({ children }) => {
  const { setAuth } = useAuth();
  const [loginAttempted, setLoginAttempted] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (loginAttempted) return;
    
    setLoginAttempted(true);
    
    const performLogin = async () => {
      try {
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🔑 STEP 1: Starting Auto Login...");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📧 Email:", email);
        console.log("🔐 SecretKey length:", password.length);
        console.log("🌐 API Endpoint: https://api.protonestconnect.co/api/v1/user/get-token");
        
        const authData = await login(email, password);
        
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("✅ STEP 2: Authentication Successful!");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🎫 JWT Token received:", authData.jwtToken ? `${authData.jwtToken.substring(0, 20)}...` : 'NONE');
        console.log("🔄 Refresh Token:", authData.refreshToken ? 'YES' : 'NO');
        
        // Store JWT token in localStorage for WebSocket client
        localStorage.setItem('jwtToken', authData.jwtToken);
        console.log("💾 JWT Token saved to localStorage");
        
        // Store in AuthContext
        setAuth({ userId: authData.userId || email, jwtToken: authData.jwtToken });
        console.log("✅ Auth state updated in AuthContext");
        
        if (authData.refreshToken) {
          localStorage.setItem('refreshToken', authData.refreshToken);
          console.log("💾 Refresh Token saved to localStorage");
        }
        
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("✅ STEP 3: Ready for WebSocket Connection");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🔌 WebSocket URL: wss://api.protonestconnect.co/ws?token=***");
        console.log("");
        
      } catch (error) {
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.error("❌ AUTHENTICATION FAILED");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.error("Error details:", error.message);
        
        if (error.message.includes("Invalid credentials")) {
          console.error("🔧 Credentials may be incorrect or expired.");
          console.error("📋 Expected: email + secretKey (not login password)");
          console.error("🌐 Verify from: https://api.protonestconnect.co");
        }
        
        if (error.message.includes("Network Error") || error.message.includes("timeout")) {
          console.error("🌐 Network error. Check:");
          console.error("   - Internet connection");
          console.error("   - API availability: https://api.protonestconnect.co");
        }
        
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("");
        
        // Clear any existing tokens
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userId');
        
        // Set null auth state to signal failure
        setAuth({ userId: null, jwtToken: null });
        
        console.warn("⚠️ WebSocket and API connections will not work until proper login");
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
