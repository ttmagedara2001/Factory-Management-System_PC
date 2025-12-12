import { Client } from "@stomp/stompjs";

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

  // ✅ Pass the JWT as a query parameter
  // const wsUrl = `ws://localhost:8091/ws?token=${encodedToken}`;
  const wsUrl = `wss://api.protonestconnect.co/ws?token=${encodedToken}`;
  // const wsUrl = `wss://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/ws?token=${encodedToken}`;

  console.log(
    "🔌 WebSocket URL built:",
    wsUrl.replace(encodedToken, "***TOKEN***")
  );

  return wsUrl;
};

// Create STOMP client (will be configured when connect() is called)
let client = null;

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
  }

  /**
   * Initialize STOMP client with JWT token
   * @param {string} token - JWT token
   */
  _initializeClient(token) {
    if (this.client) {
      console.log("[WebSocketClient] Client already initialized");
      return;
    }

    const wsUrl = buildWebSocketUrl(token);
    if (!wsUrl) {
      throw new Error("Failed to build WebSocket URL - invalid token");
    }

    this.client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: (frame) => {
        console.log("✅ WebSocket Connected:", frame);
        this.isReady = true;

        // If we have a device already set, subscribe to it
        if (this.currentDeviceId) {
          this._subscribeToDeviceTopics(this.currentDeviceId);
        }

        // Call user's connect callback
        if (this.connectCallback) {
          this.connectCallback();
        }
      },

      onStompError: (frame) => {
        console.error("❌ Broker reported error:", frame.headers["message"]);
        console.error("Details:", frame.body);
      },

      onWebSocketError: (event) => {
        console.error("🚫 WebSocket error", event);
      },

      onWebSocketClose: (event) => {
        console.warn("🔻 WebSocket closed", event);
        this.isReady = false;
        if (this.disconnectCallback) {
          this.disconnectCallback();
        }
      },

      debug: (msg) => console.log("🪵 Debug:", msg),
    });

    // Activate the client
    this.client.activate();
    console.log("[WebSocketClient] STOMP client activated");
  }

  /**
   * Subscribe to device topics dynamically
   * Format: protonest/<deviceId>/<topic>/<suffix>
   * @param {string} deviceId - Device ID to subscribe to
   */
  _subscribeToDeviceTopics(deviceId) {
    const self = this;

    // Define all stream sensor suffixes to subscribe to
    const streamSensors = [
      "vibration",
      "pressure",
      "temperature",
      "humidity",
      "noise",
      "aqi",
      "pm25",
      "co2",
      "units",
    ];

    // Subscribe to each stream sensor topic individually
    streamSensors.forEach((sensor) => {
      const streamTopic = `protonest/${deviceId}/stream/${sensor}`;
      const streamSub = this.client.subscribe(streamTopic, (message) => {
        const data = JSON.parse(message.body);
        console.log(`📡 [${deviceId}] Received ${sensor} data:`, data);

        // Extract value from message payload and call Dashboard callback
        if (self.dataCallback) {
          // Message structure: {payload: {vibration: "5.2"}, timestamp: "..."}
          const payload = data.payload || data;

          // Factory sensor mapping
          const sensorMap = {
            vibration: "vibration",
            pressure: "pressure",
            temperature: "temperature",
            temp: "temperature",
            units: "units",
            humidity: "humidity",
            moisture: "humidity",
            noise: "noiseLevel",
            airQuality: "airQuality",
            aqi: "aqi",
            pm25: "pm25",
            co2: "co2",
          };

          // Extract sensor value from payload (since we subscribed to individual topic)
          // The topic tells us which sensor this is
          const sensorType = sensorMap[sensor] || sensor;
          let value = null;

          // Try to find the sensor value in payload
          if (payload[sensor] !== undefined) {
            value = payload[sensor];
          } else if (payload.value !== undefined) {
            value = payload.value;
          } else {
            // Fallback: Check all possible sensor fields
            for (const [key, mappedType] of Object.entries(sensorMap)) {
              if (payload[key] !== undefined && mappedType === sensorType) {
                value = payload[key];
                break;
              }
            }
          }

          if (value !== null) {
            console.log(
              `🎯 [${deviceId}] Calling Dashboard callback: ${sensorType} = ${value}`
            );
            self.dataCallback({
              sensorType: sensorType,
              value: value,
              timestamp: data.timestamp || new Date().toISOString(),
            });
          } else {
            console.warn(
              `⚠️ [${deviceId}] Could not extract value for ${sensor} from message:`,
              data
            );
          }
        } else {
          console.warn(
            `⚠️ [${deviceId}] No callback registered yet - ${sensor} data will be lost:`,
            data
          );
        }
      });
      this.subscriptions.set(`stream-${deviceId}-${sensor}`, streamSub);
      console.log(`🔔 Subscribed to ${streamTopic}`);
    });

    // Define all state suffixes to subscribe to
    const stateSuffixes = ["machine_control", "ventilation_mode"];

    // Subscribe to each state topic individually
    stateSuffixes.forEach((stateSuffix) => {
      const stateTopic = `protonest/${deviceId}/state/${stateSuffix}`;
      const stateSub = this.client.subscribe(stateTopic, (message) => {
        const data = JSON.parse(message.body);
        console.log(`🔧 [${deviceId}] ${stateSuffix} received:`, data);

        // Extract payload (handle nested structure)
        const payload = data.payload || data;

        // Extract value based on which state suffix we're subscribed to
        let value = null;

        if (stateSuffix === "ventilation_mode") {
          value =
            payload.ventilation_mode ||
            payload.ventilationMode ||
            payload.value;
          if (value !== undefined && value !== null) {
            value = String(value).toLowerCase();
          }
        } else if (stateSuffix === "machine_control") {
          value =
            payload.machine_control ||
            payload.machineControl ||
            payload.motor ||
            payload.motorControl ||
            payload.value;
          if (value !== undefined && value !== null) {
            value = String(value).toUpperCase();
          }
        }

        // Call Dashboard callback with state data
        if (self.dataCallback && value !== null && value !== undefined) {
          console.log(
            `🎯 [${deviceId}] Calling Dashboard callback: ${stateSuffix} = ${value}`
          );
          self.dataCallback({
            sensorType: stateSuffix,
            value: value,
            timestamp: data.timestamp || new Date().toISOString(),
          });
        }
      });
      this.subscriptions.set(`state-${deviceId}-${stateSuffix}`, stateSub);
      console.log(`🔔 Subscribed to ${stateTopic}`);
    });
  }

  /**
   * Unsubscribe from all device topics
   * @param {string} deviceId - Device ID to unsubscribe from
   */
  _unsubscribeFromDeviceTopics(deviceId) {
    // Unsubscribe from all subscriptions that match this deviceId
    const keysToDelete = [];

    for (const [key, subscription] of this.subscriptions.entries()) {
      if (key.includes(deviceId)) {
        subscription.unsubscribe();
        keysToDelete.push(key);
        console.log(`🔕 Unsubscribed from ${key}`);
      }
    }

    // Delete all unsubscribed keys
    keysToDelete.forEach((key) => this.subscriptions.delete(key));
  }

  /**
   * Connect to WebSocket (initializes client with token)
   * @param {string} token - JWT token
   */
  async connect(token) {
    if (!token) {
      console.error(
        "[WebSocketClient] ❌ Cannot connect: No JWT token provided"
      );
      console.error(
        "🔧 Please ensure auto-login is successful and JWT token is stored in localStorage"
      );
      console.error(
        "💡 Check main.jsx AutoLogin component and authService.js login function"
      );
      throw new Error("JWT token required for WebSocket connection");
    }

    if (token === "MOCK_TOKEN_FOR_TESTING") {
      console.error("[WebSocketClient] ❌ Cannot connect: Mock token detected");
      console.error(
        "🔧 Auto-login failed. Please verify credentials in main.jsx"
      );
      console.error("📧 Email: ratnaabinayansn@gmail.com");
      console.error(
        "🔐 Password should be your ProtoNest secretKey, not login password"
      );
      throw new Error("Valid JWT token required - mock token rejected");
    }

    this.jwtToken = token;

    // Initialize client if not already done
    if (!this.client) {
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
   * Send machine control command
   */
  sendMachineCommand(deviceIdParam, control, mode = null) {
    if (!this.isConnected) {
      console.warn("[WebSocketClient] Cannot send command - not connected");
      return false;
    }

    const destination = `protonest/${deviceIdParam}/state/machine_control`;
    const payload = { machine_control: control.toUpperCase() };

    if (mode) {
      payload.ventilation_mode = mode.toLowerCase();
    }

    try {
      this.client.publish({
        destination,
        body: JSON.stringify(payload),
      });
      console.log(`[WebSocketClient] 📤 Sent machine command:`, payload);
      return true;
    } catch (error) {
      console.error(
        "[WebSocketClient] ❌ Failed to send machine command:",
        error
      );
      return false;
    }
  }

  /**
   * Send ventilation mode command
   */
  sendVentilationCommand(deviceIdParam, mode) {
    if (!this.isConnected) {
      console.warn("[WebSocketClient] Cannot send command - not connected");
      return false;
    }

    const destination = `protonest/${deviceIdParam}/state/ventilation_mode`;
    const payload = { ventilation_mode: mode.toLowerCase() };

    try {
      this.client.publish({
        destination,
        body: JSON.stringify(payload),
      });
      console.log(`[WebSocketClient] 📤 Sent ventilation command:`, payload);
      return true;
    } catch (error) {
      console.error("[WebSocketClient] ❌ Failed to send pump command:", error);
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

    window.sendMachineCommand = (control, mode = null) => {
      if (!this.currentDeviceId) {
        console.error("❌ No device selected. Subscribe to a device first.");
        return false;
      }
      return this.sendMachineCommand(this.currentDeviceId, control, mode);
    };

    window.sendVentilationCommand = (mode) => {
      if (!this.currentDeviceId) {
        console.error("❌ No device selected. Subscribe to a device first.");
        return false;
      }
      return this.sendVentilationCommand(this.currentDeviceId, mode);
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

      const destination = `protonest/${this.currentDeviceId}/stream/${sensorType}`;
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
      console.log("   Current Device:", this.currentDeviceId || "None");
      console.log(
        "   Active Subscriptions:",
        Array.from(this.subscriptions.keys())
      );
    };

    console.log("");
    console.log("🧪 Testing Mode Enabled!");
    console.log('   sendMachineCommand("RUN")');
    console.log('   sendMachineCommand("STOP")');
    console.log('   sendVentilationCommand("auto")');
    console.log('   simulateSensorData("vibration", 5.2)');
    console.log('   simulateSensorData("temperature", 28.5)');
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
