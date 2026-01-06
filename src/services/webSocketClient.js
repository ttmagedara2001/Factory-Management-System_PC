import { Client } from "@stomp/stompjs";
import {
  incrementUnits,
  addProductToLog,
  getProductionData,
} from "./productionService.js";

// WebSocket URL from environment variables
const WS_BASE_URL = import.meta.env.VITE_WS_URL;

// ✅ Fallback JWT token - used only when primary authentication fails
const FALLBACK_JWT_TOKEN = import.meta.env.VITE_FALLBACK_JWT_TOKEN || null;

// Get JWT token from localStorage (set by login process)
const getJwtToken = () => {
  const token = localStorage.getItem("jwtToken");
  if (!token) {
    console.warn("⚠️ No JWT token found in localStorage. Please login first.");
  }
  return token;
};

// Build WebSocket URL with JWT token
const buildWebSocketUrl = (jwtToken) => {
  if (!jwtToken) {
    console.error("❌ Cannot build WebSocket URL: No JWT token available");
    return null;
  }

  // ✅ Encode the token for safe URL usage
  const encodedToken = encodeURIComponent(jwtToken);

  // ✅ Build URL from environment variable
  const wsUrl = `${WS_BASE_URL}?token=${encodedToken}`;

  console.log(
    "🔌 WebSocket URL built:",
    wsUrl.replace(encodedToken, "***TOKEN***")
  );

  return wsUrl;
};

// Create STOMP client (will be configured when connect() is called)
let client = null;

/**
 * ✅ Auto-generate timestamp if not provided in the message
 * @param {Object} data - The incoming message data
 * @returns {string} - ISO timestamp string
 */
const generateTimestamp = (data) => {
  if (data && data.timestamp) {
    return data.timestamp;
  }
  return new Date().toISOString();
};

/**
 * ✅ Normalize incoming message data with automatic timestamp
 * @param {Object} data - The raw message data
 * @returns {Object} - Normalized data with timestamp guaranteed
 */
const normalizeMessageData = (data) => {
  return {
    ...data,
    timestamp: generateTimestamp(data),
  };
};

/**
 * WebSocket Client Wrapper Class for Dashboard Integration
 * Provides methods to work with the existing STOMP client
 */
class WebSocketClient {
  constructor() {
    this.client = null;
    this.currentDeviceId = null;
    this.subscriptions = new Map();
    this.dataCallback = null;
    this.connectCallback = null;
    this.disconnectCallback = null;
    this.isReady = false;
    this.jwtToken = null;
    this.isAuthenticated = false; // Track if connection was successfully authenticated
    this.connectionAttempts = 0; // Track connection attempts
    this.usingFallbackToken = false; // Track if using fallback token
  }

  /**
   * Initialize STOMP client with JWT token
   * @param {string} token - JWT token
   * @param {boolean} isFallback - Whether this is a fallback token attempt
   */
  _initializeClient(token, isFallback = false) {
    // If already authenticated, ignore subsequent initialization attempts
    if (this.isAuthenticated && this.client?.connected) {
      console.log(
        "[WebSocketClient] ✅ Already authenticated, ignoring new token"
      );
      return;
    }

    // Deactivate existing client if switching tokens
    if (this.client) {
      console.log(
        "[WebSocketClient] 🔄 Deactivating existing client for new token..."
      );
      this.client.deactivate();
      this.client = null;
    }

    const wsUrl = buildWebSocketUrl(token);
    if (!wsUrl) {
      throw new Error("Failed to build WebSocket URL - invalid token");
    }

    this.usingFallbackToken = isFallback;
    this.connectionAttempts++;

    console.log(
      `[WebSocketClient] 🔌 Connecting (attempt ${this.connectionAttempts})${
        isFallback ? " with FALLBACK token" : ""
      }...`
    );

    const self = this;

    this.client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: (frame) => {
        console.log(
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        );
        console.log("✅ STOMP WebSocket Connected Successfully!");
        if (self.usingFallbackToken) {
          console.log("📋 Connected using FALLBACK JWT token");
        }
        console.log(
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        );
        console.log("📋 Connection Frame:", frame);

        // Mark as authenticated - subsequent tokens will be ignored
        self.isAuthenticated = true;
        self.isReady = true;

        // If we have a device already set, subscribe to its topics
        if (self.currentDeviceId) {
          console.log(`📡 Auto-subscribing to device: ${self.currentDeviceId}`);
          self._subscribeToDeviceTopics(self.currentDeviceId);
        } else {
          console.log(
            "⚠️ No device selected yet. Will subscribe when device is selected."
          );
        }

        // Call user's connect callback
        if (self.connectCallback) {
          self.connectCallback();
        }
      },

      onStompError: (frame) => {
        console.error(
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        );
        console.error("❌ STOMP Broker Error");
        console.error(
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        );
        console.error("📋 Error Message:", frame.headers["message"]);
        console.error("📋 Error Details (frame.body):", frame.body);
        console.error("📋 All Headers:", frame.headers);
        console.error(
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        );
        console.error("💡 Common causes:");
        console.error(
          "   1. Invalid destination - check /app/ prefix for server messages"
        );
        console.error("   2. Missing deviceId in the message payload");
        console.error(
          "   3. Incorrect payload format (server expects specific JSON structure)"
        );
        console.error("   4. Authorization issue for the destination");
        console.error(
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        );

        // Try fallback token on STOMP error (authentication failure)
        self._tryFallbackConnection("STOMP error");
      },

      onWebSocketError: (event) => {
        console.error("🚫 WebSocket error", event);
        // Try fallback token on WebSocket error
        self._tryFallbackConnection("WebSocket error");
      },

      onWebSocketClose: (event) => {
        console.warn("🔻 WebSocket closed", event);
        self.isReady = false;

        // Only try fallback if not yet authenticated (connection failed before auth)
        if (!self.isAuthenticated) {
          self._tryFallbackConnection("WebSocket closed before authentication");
        }

        if (self.disconnectCallback) {
          self.disconnectCallback();
        }
      },

      debug: (msg) => console.log("🪵 Debug:", msg),
    });

    // Activate the client
    this.client.activate();
    console.log("[WebSocketClient] STOMP client activated");
  }

  /**
   * Try to connect with fallback JWT token if primary connection fails
   * @param {string} reason - Reason for fallback attempt
   */
  _tryFallbackConnection(reason) {
    // Don't try fallback if already authenticated
    if (this.isAuthenticated) {
      console.log(
        "[WebSocketClient] ✅ Already authenticated, no fallback needed"
      );
      return;
    }

    // Don't try fallback if already using fallback token
    if (this.usingFallbackToken) {
      console.error(
        "[WebSocketClient] ❌ Fallback token also failed. Cannot connect."
      );
      return;
    }

    // Check if fallback token is available
    if (!FALLBACK_JWT_TOKEN) {
      console.warn("[WebSocketClient] ⚠️ No fallback JWT token configured");
      return;
    }

    console.log(
      `[WebSocketClient] 🔄 Primary connection failed (${reason}). Trying fallback token...`
    );

    // Small delay before trying fallback
    setTimeout(() => {
      if (!this.isAuthenticated) {
        this._initializeClient(FALLBACK_JWT_TOKEN, true);
      }
    }, 1000);
  }

  /**
   * Subscribe to device topics dynamically
   * Uses the STOMP subscription pattern from reference implementation
   * @param {string} deviceId - Device ID to subscribe to
   */
  _subscribeToDeviceTopics(deviceId) {
    const self = this;

    // ═══════════════════════════════════════════════════════════════════════
    // STOMP Topic Subscriptions - Using /topic/ destination prefix
    // Reference: STOMP protocol standard for pub/sub messaging
    // ═══════════════════════════════════════════════════════════════════════

    // 1. Subscribe to /topic/stream/{deviceId} - receives all sensor data
    const streamTopic = `/topic/stream/${deviceId}`;
    if (!this.subscriptions.has(`topic-stream-${deviceId}`)) {
      const streamSub = this.client.subscribe(streamTopic, (message) => {
        try {
          const rawData = JSON.parse(message.body);
          // ✅ Auto-add timestamp if not provided
          const data = normalizeMessageData(rawData);
          console.log(`📡 [${streamTopic}] Received:`, data);

          if (self.dataCallback && typeof data === "object") {
            // Handle individual sensor message: {"vibration": "8.5"}
            Object.keys(data).forEach((key) => {
              if (key !== "timestamp" && key !== "deviceId") {
                let value = data[key];
                // Convert string numbers to actual numbers
                if (typeof value === "string" && !isNaN(Number(value))) {
                  value = Number(value);
                }
                self.dataCallback({
                  sensorType: key,
                  value: value,
                  timestamp: data.timestamp,
                });
              }
            });
          }
        } catch (err) {
          console.error(`❌ Error parsing stream message:`, err, message.body);
        }
      });
      this.subscriptions.set(`topic-stream-${deviceId}`, streamSub);
      console.log(`🔔 Subscribed to ${streamTopic}`);
    }

    // 2. Subscribe to /topic/state/{deviceId} - receives state/control data
    const stateTopic = `/topic/state/${deviceId}`;
    if (!this.subscriptions.has(`topic-state-${deviceId}`)) {
      const stateSub = this.client.subscribe(stateTopic, (message) => {
        try {
          const rawData = JSON.parse(message.body);
          // ✅ Auto-add timestamp if not provided
          const data = normalizeMessageData(rawData);
          console.log(`📡 [${stateTopic}] Received:`, data);

          if (self.dataCallback && typeof data === "object") {
            Object.keys(data).forEach((key) => {
              if (key !== "timestamp" && key !== "deviceId") {
                self.dataCallback({
                  sensorType: key,
                  value: data[key],
                  timestamp: data.timestamp,
                });
              }
            });
          }
        } catch (err) {
          console.error(`❌ Error parsing state message:`, err, message.body);
        }
      });
      this.subscriptions.set(`topic-state-${deviceId}`, stateSub);
      console.log(`🔔 Subscribed to ${stateTopic}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Per-sensor STOMP topic subscriptions
    // Format: /topic/protonest/{deviceId}/stream/fmc/{sensor}
    // ═══════════════════════════════════════════════════════════════════════
    const streamSensors = [
      "vibration",
      "pressure",
      "temperature",
      "noise",
      "humidity",
      "co2",
      "units",
    ];

    streamSensors.forEach((sensor) => {
      // STOMP-compatible topic format with /topic/ destination prefix
      const sensorTopic = `/topic/protonest/${deviceId}/stream/fmc/${sensor}`;
      const subKey = `topic-sensor-${deviceId}-${sensor}`;

      if (!this.subscriptions.has(subKey)) {
        const sensorSub = this.client.subscribe(sensorTopic, (message) => {
          try {
            const rawData = JSON.parse(message.body);
            // ✅ Auto-add timestamp if not provided
            const data = normalizeMessageData(rawData);
            console.log(`📡 [${sensorTopic}] Received:`, data);

            if (self.dataCallback) {
              const payload = data.payload || data;
              let value = payload[sensor] ?? payload.value ?? null;

              // Convert string to number
              if (typeof value === "string" && !isNaN(Number(value))) {
                value = Number(value);
              }

              if (value !== null) {
                self.dataCallback({
                  sensorType: sensor,
                  value: value,
                  timestamp: data.timestamp,
                });
              }
            }
          } catch (err) {
            console.error(`❌ Error parsing ${sensor} message:`, err);
          }
        });
        this.subscriptions.set(subKey, sensorSub);
        console.log(`🔔 Subscribed to ${sensorTopic}`);
      }
    });

    // Subscribe to ventilation and machineControl state topics (STOMP format)
    const stateTypes = ["ventilation", "machineControl"];
    stateTypes.forEach((stateType) => {
      const stateTypeTopic = `/topic/protonest/${deviceId}/state/fmc/${stateType}`;
      const subKey = `topic-state-${deviceId}-${stateType}`;

      if (!this.subscriptions.has(subKey)) {
        const sub = this.client.subscribe(stateTypeTopic, (message) => {
          try {
            const rawData = JSON.parse(message.body);
            // ✅ Auto-add timestamp if not provided
            const data = normalizeMessageData(rawData);
            console.log(`📡 [${stateTypeTopic}] Received:`, data);

            if (self.dataCallback) {
              const payload = data.payload || data;
              const value = payload[stateType] ?? payload.value;
              if (value !== undefined) {
                self.dataCallback({
                  sensorType: stateType,
                  value: value,
                  timestamp: data.timestamp,
                });
              }
            }
          } catch (err) {
            console.error(`❌ Error parsing ${stateType} message:`, err);
          }
        });
        this.subscriptions.set(subKey, sub);
        console.log(`🔔 Subscribed to ${stateTypeTopic}`);
      }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // Product Topic Subscription - Unit counting via product detection
    // Format: /topic/protonest/{deviceId}/stream/fmc/product
    // Payload: {"productID":"<id>","productName":"<name>"}
    // Each message increments the unit count by 1
    // ═══════════════════════════════════════════════════════════════════════
    const productTopic = `/topic/protonest/${deviceId}/stream/fmc/product`;
    const productSubKey = `topic-product-${deviceId}`;

    if (!this.subscriptions.has(productSubKey)) {
      const productSub = this.client.subscribe(productTopic, (message) => {
        try {
          const rawData = JSON.parse(message.body);
          const data = normalizeMessageData(rawData);
          console.log(`📦 [${productTopic}] Product Received:`, data);

          // Extract product info from payload
          const payload = data.payload || data;
          const productID = payload.productID || payload.productId || "UNKNOWN";
          const productName = payload.productName || "Unknown Product";

          // Add product to log and increment units
          const logEntry = addProductToLog(deviceId, {
            productID,
            productName,
          });
          const newUnitCount = incrementUnits(deviceId);

          console.log(
            `📊 [ProductionService] Unit count increased to: ${newUnitCount}`
          );

          // Notify callback with updated unit count
          if (self.dataCallback) {
            // Send product info
            self.dataCallback({
              sensorType: "product",
              value: { productID, productName, logEntry },
              timestamp: data.timestamp,
            });

            // Send updated unit count
            self.dataCallback({
              sensorType: "units",
              value: newUnitCount,
              timestamp: data.timestamp,
            });
          }
        } catch (err) {
          console.error(`❌ Error parsing product message:`, err, message.body);
        }
      });
      this.subscriptions.set(productSubKey, productSub);
      console.log(`🔔 Subscribed to ${productTopic} (Product Detection)`);
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ Subscribed to all topics for device: ${deviceId}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }

  /**
   * Unsubscribe from device topics
   * @param {string} deviceId - Device ID to unsubscribe from
   */
  _unsubscribeFromDeviceTopics(deviceId) {
    // Unsubscribe from all subscriptions for this device
    const keysToRemove = [];

    this.subscriptions.forEach((sub, key) => {
      if (key.includes(deviceId)) {
        try {
          sub.unsubscribe();
          console.log(`🔕 Unsubscribed from ${key}`);
        } catch (err) {
          console.warn(`⚠️ Error unsubscribing from ${key}:`, err);
        }
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach((key) => this.subscriptions.delete(key));
    console.log(`🔕 Unsubscribed from all topics for device: ${deviceId}`);
  }

  /**
   * Connect to WebSocket (initializes client with token)
   * @param {string} token - JWT token
   * @param {boolean} forceReconnect - Force a new connection even if already connected
   */
  async connect(token, forceReconnect = false) {
    if (!token) {
      console.error(
        "[WebSocketClient] ❌ Cannot connect: No JWT token provided"
      );
      throw new Error("JWT token required for WebSocket connection");
    }

    // If already authenticated with current connection, ignore unless forced
    if (this.isAuthenticated && this.isConnected && !forceReconnect) {
      console.log(
        "[WebSocketClient] ✅ Already authenticated and connected, ignoring new token"
      );
      return Promise.resolve();
    }

    this.jwtToken = token;

    // Reset authentication state for new connection attempt
    if (forceReconnect) {
      this.isAuthenticated = false;
      this.connectionAttempts = 0;
      this.usingFallbackToken = false;
    }

    // Initialize client if not already done or force reconnect
    if (!this.client || forceReconnect) {
      console.log("[WebSocketClient] 🔄 Initializing STOMP client...");
      this._initializeClient(token);
    } else if (!this.isConnected) {
      // Client exists but disconnected - try to reconnect
      console.log("[WebSocketClient] 🔄 Reconnecting...");
      this.client.activate();
    } else {
      console.log("[WebSocketClient] ✅ Already connected");
    }

    return Promise.resolve();
  }

  /**
   * Subscribe to device topics with callback
   * @param {string} deviceIdParam - Device ID to subscribe to
   * @param {Function} callback - Data handler callback
   */
  subscribeToDevice(deviceIdParam, callback) {
    // If switching to a different device, unsubscribe from old one
    if (this.currentDeviceId && this.currentDeviceId !== deviceIdParam) {
      console.log(
        `[WebSocketClient] 🔄 Switching from ${this.currentDeviceId} to ${deviceIdParam}`
      );
      this._unsubscribeFromDeviceTopics(this.currentDeviceId);
    }

    // Update current device and callback
    this.currentDeviceId = deviceIdParam;
    this.dataCallback = callback;
    console.log(
      `[WebSocketClient] Callback registered for device: ${deviceIdParam}`
    );

    // Subscribe to new device if connection is ready
    if (this.isReady && this.isConnected) {
      this._subscribeToDeviceTopics(deviceIdParam);
    } else {
      console.log(
        `[WebSocketClient] Will subscribe to ${deviceIdParam} when connection is ready`
      );
    }

    return true;
  }

  /**
   * Check if connected
   */
  get isConnected() {
    return this.client?.connected || false;
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return this.isConnected;
  }

  /**
   * Get authentication status
   */
  getAuthenticationStatus() {
    return {
      isAuthenticated: this.isAuthenticated,
      usingFallbackToken: this.usingFallbackToken,
      connectionAttempts: this.connectionAttempts,
    };
  }

  /**
   * Register connect callback
   */
  onConnect(callback) {
    this.connectCallback = callback;
    // If already connected, call immediately
    if (this.isConnected) {
      callback();
    }
  }

  /**
   * Register disconnect callback
   */
  onDisconnect(callback) {
    this.disconnectCallback = callback;
  }

  /**
   * Send ventilation command
   * @param {string} ventilation - "on" or "off"
   * @param {string} mode - "manual" or "auto"
   */
  sendVentilationCommand(ventilation, mode = "manual") {
    if (!this.isConnected) {
      console.warn("[WebSocketClient] Cannot send command - not connected");
      return false;
    }

    if (!this.currentDeviceId) {
      console.error(
        "[WebSocketClient] ❌ Cannot send command - no device selected"
      );
      return false;
    }

    // Use /app/ prefix for Spring STOMP message mapping
    // Server expects: /app/device/{deviceId}/state/fmc/ventilation
    const destination = `/app/device/${this.currentDeviceId}/state/fmc/ventilation`;
    const payload = {
      deviceId: this.currentDeviceId,
      ventilation: ventilation.toLowerCase(),
      mode: mode.toLowerCase(),
      timestamp: new Date().toISOString(),
    };

    try {
      this.client.publish({
        destination,
        body: JSON.stringify(payload),
        headers: {
          "content-type": "application/json",
        },
      });
      console.log(
        `[WebSocketClient] 📤 Sent ventilation command to ${destination}:`,
        payload
      );
      return true;
    } catch (error) {
      console.error(
        "[WebSocketClient] ❌ Failed to send ventilation command:",
        error
      );
      return false;
    }
  }

  /**
   * Send machine control command
   * @param {string} command - "run" or "stop"
   */
  sendMachineControlCommand(command) {
    if (!this.isConnected) {
      console.warn("[WebSocketClient] Cannot send command - not connected");
      return false;
    }

    if (!this.currentDeviceId) {
      console.error(
        "[WebSocketClient] ❌ Cannot send command - no device selected"
      );
      return false;
    }

    // Use /app/ prefix for Spring STOMP message mapping
    // Server expects: /app/device/{deviceId}/state/fmc/machineControl
    const destination = `/app/device/${this.currentDeviceId}/state/fmc/machineControl`;
    const payload = {
      deviceId: this.currentDeviceId,
      machineControl: command.toLowerCase(),
      timestamp: new Date().toISOString(),
    };

    try {
      this.client.publish({
        destination,
        body: JSON.stringify(payload),
        headers: {
          "content-type": "application/json",
        },
      });
      console.log(
        `[WebSocketClient] 📤 Sent machine control command to ${destination}:`,
        payload
      );
      return true;
    } catch (error) {
      console.error(
        "[WebSocketClient] ❌ Failed to send machine control command:",
        error
      );
      return false;
    }
  }

  /**
   * Disconnect
   */
  disconnect() {
    if (this.client && this.isConnected) {
      console.log("[WebSocketClient] 🔌 Disconnecting...");

      // Unsubscribe from all topics
      if (this.currentDeviceId) {
        this._unsubscribeFromDeviceTopics(this.currentDeviceId);
      }

      // Deactivate client
      this.client.deactivate();
      this.isReady = false;
    } else {
      console.log("[WebSocketClient] Already disconnected");
    }
  }

  /**
   * Enable testing mode
   */
  enableTestingMode() {
    if (typeof window === "undefined") return;

    window.sendPumpCommand = (power, mode = null) => {
      if (!this.currentDeviceId) {
        console.error("❌ No device selected. Subscribe to a device first.");
        return false;
      }
      return this.sendPumpCommand(this.currentDeviceId, power, mode);
    };

    window.simulateSensorData = (sensorType, value) => {
      if (!this.isConnected) {
        console.error("❌ Not connected");
        return false;
      }

      if (!this.currentDeviceId) {
        console.error("❌ No device selected. Subscribe to a device first.");
        return false;
      }

      // Publish to per-sensor topic used by the app subscriptions
      // (use /stream/fmc/<sensor> to match subscriptions)
      const destination = `protonest/${this.currentDeviceId}/stream/fmc/${sensorType}`;
      const payload = { [sensorType]: String(value) };

      try {
        this.client.publish({
          destination,
          body: JSON.stringify(payload),
        });
        console.log("📤 Simulated:", payload);
        return true;
      } catch (error) {
        console.error("❌ Failed:", error);
        return false;
      }
    };

    window.wsInfo = () => {
      console.log("📊 WebSocket Info:");
      console.log("   Connected:", this.isConnected);
      console.log("   Authenticated:", this.isAuthenticated);
      console.log("   Using Fallback Token:", this.usingFallbackToken);
      console.log("   Connection Attempts:", this.connectionAttempts);
      console.log("   Current Device:", this.currentDeviceId || "None");
      console.log(
        "   Active Subscriptions:",
        Array.from(this.subscriptions.keys())
      );
    };

    console.log("");
    console.log("🧪 Testing Mode Enabled!");
    console.log('   sendPumpCommand("on")');
    console.log('   sendPumpCommand("off")');
    console.log('   simulateSensorData("temp", 25.5)');
    console.log("   wsInfo()");
    console.log("");
  }
}

// Export singleton instance
export const webSocketClient = new WebSocketClient();

// Auto-enable testing mode in development
if (typeof window !== "undefined" && import.meta.env?.DEV) {
  window.webSocketClient = webSocketClient;
  console.log("🔧 Dev Mode: webSocketClient.enableTestingMode()");
}
