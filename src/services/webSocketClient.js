import { Client } from "@stomp/stompjs";

// WebSocket URL from environment variables
const WS_BASE_URL = import.meta.env.VITE_WS_URL;

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
        console.log(
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        );
        console.log("✅ STOMP WebSocket Connected Successfully!");
        console.log(
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        );
        console.log("📋 Connection Frame:", frame);
        this.isReady = true;

        // If we have a device already set, subscribe to its topics
        if (this.currentDeviceId) {
          console.log(`📡 Auto-subscribing to device: ${this.currentDeviceId}`);
          this._subscribeToDeviceTopics(this.currentDeviceId);
        } else {
          console.log(
            "⚠️ No device selected yet. Will subscribe when device is selected."
          );
        }

        // Call user's connect callback
        if (this.connectCallback) {
          this.connectCallback();
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
   * @param {string} deviceId - Device ID to subscribe to
   */
  _subscribeToDeviceTopics(deviceId) {
    const self = this;

    // ═══════════════════════════════════════════════════════════════════════
    // STOMP Topic Subscriptions - Backend bridges MQTT to these topics
    // ═══════════════════════════════════════════════════════════════════════

    // 1. Subscribe to /topic/stream/{deviceId} - receives all sensor data
    const streamTopic = `/topic/stream/${deviceId}`;
    if (!this.subscriptions.has(`topic-stream-${deviceId}`)) {
      const streamSub = this.client.subscribe(streamTopic, (message) => {
        try {
          const data = JSON.parse(message.body);
          console.log(`📡 [/topic/stream/${deviceId}] Received:`, data);

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
                  timestamp: data.timestamp || new Date().toISOString(),
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
          const data = JSON.parse(message.body);
          console.log(`📡 [/topic/state/${deviceId}] Received:`, data);

          if (self.dataCallback && typeof data === "object") {
            Object.keys(data).forEach((key) => {
              if (key !== "timestamp" && key !== "deviceId") {
                self.dataCallback({
                  sensorType: key,
                  value: data[key],
                  timestamp: data.timestamp || new Date().toISOString(),
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
    // Per-sensor STOMP topic subscriptions (if backend publishes per-sensor)
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
      // Try STOMP-compatible topic format
      const sensorTopic = `/topic/protonest/${deviceId}/stream/fmc/${sensor}`;
      const subKey = `topic-sensor-${deviceId}-${sensor}`;

      if (!this.subscriptions.has(subKey)) {
        const sensorSub = this.client.subscribe(sensorTopic, (message) => {
          try {
            const data = JSON.parse(message.body);
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
                  timestamp: data.timestamp || new Date().toISOString(),
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

    // Subscribe to ventilation and machineControl state topics
    const stateTypes = ["ventilation", "machineControl"];
    stateTypes.forEach((stateType) => {
      const stateTypeTopic = `/topic/protonest/${deviceId}/state/fmc/${stateType}`;
      const subKey = `topic-state-${deviceId}-${stateType}`;

      if (!this.subscriptions.has(subKey)) {
        const sub = this.client.subscribe(stateTypeTopic, (message) => {
          try {
            const data = JSON.parse(message.body);
            console.log(`📡 [${stateTypeTopic}] Received:`, data);

            if (self.dataCallback) {
              const payload = data.payload || data;
              const value = payload[stateType] ?? payload.value;
              if (value !== undefined) {
                self.dataCallback({
                  sensorType: stateType,
                  value: value,
                  timestamp: data.timestamp || new Date().toISOString(),
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
   */
  async connect(token) {
    if (!token) {
      console.error(
        "[WebSocketClient] ❌ Cannot connect: No JWT token provided"
      );
      throw new Error("JWT token required for WebSocket connection");
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
