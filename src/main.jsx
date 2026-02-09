import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './Context/AuthContext.jsx';
import { autoLogin, getMissingEnvVars } from "./services/authService.js";

// ═══════════════════════════════════════════════════════════════════════════
// Session tracking key - ensures login happens only ONCE per browser session
// ═══════════════════════════════════════════════════════════════════════════
const SESSION_AUTH_KEY = 'factory_session_authenticated';

/**
 * AutoLogin Component
 * 
 * Flow:
 * 1. First, call /get-token API to authenticate
 * 2. If authentication succeeds, render App (which then connects WebSocket)
 * 3. If authentication fails, show error and do NOT render App
 * 
 * WebSocket topics subscribed after connection:
 * - /topic/stream/<deviceID>
 * - /topic/state/<deviceID>
 */
const AutoLogin = ({ children }) => {
  const { setAuth } = useAuth();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let isMounted = true;

    const performLogin = async () => {
      // ═══════════════════════════════════════════════════════════════════════
      // CHECK: Already authenticated in this session?
      // ═══════════════════════════════════════════════════════════════════════
      const sessionAuthenticated = sessionStorage.getItem(SESSION_AUTH_KEY);
      const storedUserId = localStorage.getItem('userId');

      if (sessionAuthenticated === 'true' && storedUserId) {
        console.log('✅ [Auth] Session already authenticated, skipping /get-token');
        if (isMounted) {
          setAuth({
            userId: storedUserId,
            jwtToken: localStorage.getItem('jwtToken') || null
          });
          setIsAuthenticated(true);
          setIsLoading(false);
        }
        return;
      }

      // ═══════════════════════════════════════════════════════════════════════
      // STEP 1: Call /get-token API to authenticate
      // ═══════════════════════════════════════════════════════════════════════
      console.log('🔐 [Auth] Calling /get-token API...');
      const result = await autoLogin();

      if (!isMounted) return;

      if (result.success) {
        // Login successful - mark session and allow App to render
        sessionStorage.setItem(SESSION_AUTH_KEY, 'true');
        setAuth({
          userId: result.userId,
          jwtToken: result.jwtToken
        });
        setIsAuthenticated(true);
        console.log('✅ [Auth] Authentication successful, proceeding to WebSocket connection');
      } else {
        // Login failed - show error, do NOT render App
        console.error('❌ [Auth] Authentication failed:', result.error);
        sessionStorage.removeItem(SESSION_AUTH_KEY);
        setAuth({ userId: null, jwtToken: null });
        setIsAuthenticated(false);
        setError(result.error || 'Authentication failed');
      }

      setIsLoading(false);
    };

    performLogin();

    return () => {
      isMounted = false;
    };
  }, []);

  // Loading state - waiting for /get-token response
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-700 font-medium">Authenticating with Protonest API...</p>
          <p className="text-emerald-600 text-sm mt-2">Calling /get-token...</p>
        </div>
      </div>
    );
  }

  // Error state - authentication failed
  if (error) {
    const missingVars = getMissingEnvVars();
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Authentication Failed</h2>
          <p className="text-sm text-slate-600 mb-4">{error}</p>
          {missingVars.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-4 text-left">
              <p className="text-xs font-semibold text-slate-700 mb-2">Missing environment variables:</p>
              <ul className="text-xs text-slate-600 space-y-1 font-mono">
                {missingVars.map(v => <li key={v}>{v}</li>)}
              </ul>
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: Authentication successful - render App
  // App will then connect WebSocket and subscribe to:
  // - /topic/stream/<deviceID>
  // - /topic/state/<deviceID>
  // ═══════════════════════════════════════════════════════════════════════════
  if (isAuthenticated) {
    return children;
  }

  return null;
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
