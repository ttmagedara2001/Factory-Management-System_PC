import { Client } from "@stomp/stompjs";

// WebSocket URL from environment variables
const WS_BASE_URL = import.meta.env.VITE_WS_URL || "wss://api.protonestconnect.co/ws";

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
        console.log("✅ WebSocket Connected:", frame);
        this.isReady = true;

        // Subscribe to MQTTX-style topics for the current device
        if (this.currentDeviceId) {
          // /topic/stream/{deviceId}
          const streamTopic = `/topic/stream/${this.currentDeviceId}`;
          this.client.subscribe(streamTopic, (message) => {
            const data = JSON.parse(message.body);
            console.log("📡 Received:", data);
            // Forward to dashboard dataCallback if available
            if (this.dataCallback && typeof data === "object") {
              // If the message is a batch of sensor values, update all
              Object.keys(data).forEach((sensorType) => {
                if (sensorType !== "timestamp") {
                  this.dataCallback({
                    sensorType,
                    value: data[sensorType],
                    timestamp: data.timestamp || new Date().toISOString(),
                  });
                }
              });
            }
          });
          console.log(`🔔 Subscribed to ${streamTopic}`);

          // /topic/state/{deviceId}
          const stateTopic = `/topic/state/${this.currentDeviceId}`;
          this.client.subscribe(stateTopic, (message) => {
            const data = JSON.parse(message.body);
            console.log("📡 Received:", data);
            // Forward to dashboard dataCallback if available
            if (this.dataCallback && typeof data === "object") {
              Object.keys(data).forEach((sensorType) => {
                if (sensorType !== "timestamp") {
                  this.dataCallback({
                    sensorType,
                    value: data[sensorType],
                    timestamp: data.timestamp || new Date().toISOString(),
                  });
                }
              });
            }
          });
          console.log(`🔔 Subscribed to ${stateTopic}`);
        }

        // If we have a device already set, subscribe to per-sensor topics as before
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
   * @param {string} deviceId - Device ID to subscribe to
   */
  _subscribeToDeviceTopics(deviceId) {
    const self = this;

    // Define the sensors to subscribe to (as per user request)
    const streamSensors = [
      "vibration",
      "pressure",
      "temperature",
      "noise",
      "humidity",
      "co2",
      "units", // production units count
    ];

    // Subscribe to each sensor topic: protonest/<deviceId>/stream/fmc/<sensor>
    streamSensors.forEach((sensor) => {
      const streamTopic = `protonest/${deviceId}/stream/fmc/${sensor}`;
      const streamSub = this.client.subscribe(streamTopic, (message) => {
        const data = JSON.parse(message.body);
        console.log(`📡 [${deviceId}] Received ${sensor} data:`, data);

        if (self.dataCallback) {
          // Accept both {payload: {...}, ...} and flat {sensor: ...}
          const payload = data.payload || data;
          let value = null;
          if (payload[sensor] !== undefined) {
            value = payload[sensor];
          } else if (payload.value !== undefined) {
            value = payload.value;
          } else if (
            typeof payload === "object" &&
            Object.keys(payload).length === 1 &&
            payload[sensor] !== undefined
          ) {
            value = payload[sensor];
          }

          // Convert to number for numeric sensors
          const numericSensors = [
            "vibration",
            "pressure",
            "temperature",
            "noise",
            "humidity",
            "co2",
            "units",
          ];
          if (value !== null && numericSensors.includes(sensor)) {
            const numValue = Number(value);
            if (!isNaN(numValue)) {
              value = numValue;
            }
          }

          if (value !== null) {
            self.dataCallback({
              sensorType: sensor,
              value: value,
              timestamp: data.timestamp || new Date().toISOString(),
            });
          } else {
            console.warn(
              `⚠️ [${deviceId}] Could not extract value for ${sensor} from message:`,
              data
            );
          }
        }
      });
      this.subscriptions.set(`stream-${deviceId}-${sensor}`, streamSub);
      console.log(`🔔 Subscribed to ${streamTopic}`);
    });

    // Subscribe to ventilation state topic: protonest/<deviceId>/state/fmc/ventilation
    const ventilationTopic = `protonest/${deviceId}/state/fmc/ventilation`;
    const ventilationSub = this.client.subscribe(
      ventilationTopic,
      (message) => {
        const data = JSON.parse(message.body);
        console.log(`🌀 [${deviceId}] Ventilation state received:`, data);
        const payload = data.payload || data;
        if (self.dataCallback) {
          const ventilationValue = payload.ventilation ?? payload.value;
          if (ventilationValue !== undefined) {
            self.dataCallback({
              sensorType: "ventilation",
              value: ventilationValue,
              timestamp: data.timestamp || new Date().toISOString(),
            });
          }
        }
      }
    );
    this.subscriptions.set(`state-${deviceId}-ventilation`, ventilationSub);
    console.log(`🔔 Subscribed to ${ventilationTopic}`);

    // Subscribe to machineControl state topic: protonest/<deviceId>/state/fmc/machineControl
    const machineControlTopic = `protonest/${deviceId}/state/fmc/machineControl`;
    const machineControlSub = this.client.subscribe(
      machineControlTopic,
      (message) => {
        const data = JSON.parse(message.body);
        console.log(`⚙️ [${deviceId}] MachineControl state received:`, data);
        const payload = data.payload || data;
        if (self.dataCallback) {
          const machineControlValue = payload.machineControl ?? payload.value;
          if (machineControlValue !== undefined) {
            self.dataCallback({
              sensorType: "machineControl",
              value: machineControlValue,
              timestamp: data.timestamp || new Date().toISOString(),
            });
          }
        }
      }
    );
    this.subscriptions.set(
      `state-${deviceId}-machineControl`,
      machineControlSub
    );
    console.log(`🔔 Subscribed to ${machineControlTopic}`);
  }

  /**
   * Unsubscribe from device topics
   * @param {string} deviceId - Device ID to unsubscribe from
   */
  _unsubscribeFromDeviceTopics(deviceId) {
    const streamKey = `stream-${deviceId}`;
    const stateKey = `state-${deviceId}`;

    if (this.subscriptions.has(streamKey)) {
      this.subscriptions.get(streamKey).unsubscribe();
      this.subscriptions.delete(streamKey);
      console.log(`🔕 Unsubscribed from /topic/stream/${deviceId}`);
    }

    if (this.subscriptions.has(stateKey)) {
      this.subscriptions.get(stateKey).unsubscribe();
      this.subscriptions.delete(stateKey);
      console.log(`🔕 Unsubscribed from /topic/state/${deviceId}`);
    }
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

    const destination = `fmc/ventilation`;
    const payload = {
      ventilation: ventilation.toLowerCase(),
      mode: mode.toLowerCase(),
    };

    try {
      this.client.publish({
        destination,
        body: JSON.stringify(payload),
      });
      console.log(`[WebSocketClient] 📤 Sent ventilation command:`, payload);
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

    const destination = `fmc/machineControl`;
    const payload = { machineControl: command.toLowerCase() };

    try {
      this.client.publish({
        destination,
        body: JSON.stringify(payload),
      });
      console.log(
        `[WebSocketClient] 📤 Sent machine control command:`,
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
