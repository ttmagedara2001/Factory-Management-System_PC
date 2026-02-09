import { Client } from "@stomp/stompjs";

// ============================================
// WEBSOCKET CLIENT - Cookie-Based Authentication
// ============================================
// Simple STOMP WebSocket client that relies on HttpOnly cookies
// Cookies are automatically sent by the browser after login
// ============================================

const WS_URL = import.meta.env.VITE_WS_URL;

/**
 * WebSocket Client for Real-Time Dashboard
 */
class WebSocketClient {
  constructor() {
    this.client = null;
    this.currentDeviceId = null;
    this.dataCallback = null;
    this.connectCallback = null;
    this.disconnectCallback = null;
    this.subscriptions = new Map();
    this.isReady = false;
  }

  /**
   * Connect to WebSocket server
   * Cookies are sent automatically (set by login)
   */
  connect() {
    if (this.client?.connected) {
      console.log("[WS] Already connected");
      return;
    }

    if (!WS_URL) {
      console.error("❌ VITE_WS_URL not configured");
      return;
    }

    console.log("[WS] Connecting to:", WS_URL);

    const self = this;

    this.client = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: () => {
        console.log("✅ WebSocket connected");
        self.isReady = true;

        // Auto-subscribe if device was set before connection
        if (self.currentDeviceId) {
          self._subscribe(self.currentDeviceId);
        }

        if (self.connectCallback) {
          self.connectCallback();
        }
      },

      onStompError: (frame) => {
        console.error("❌ STOMP error:", frame.headers["message"]);
        console.error("Details:", frame.body);
      },

      onWebSocketError: (event) => {
        console.error("🚫 WebSocket error", event);
      },

      onWebSocketClose: (event) => {
        console.warn("🔻 WebSocket closed", event);
        self.isReady = false;

        if (self.disconnectCallback) {
          self.disconnectCallback();
        }
      },

      debug: (msg) => {
        // Uncomment for debugging:
        // console.log("🪵", msg);
      },
    });

    this.client.activate();
  }

  /**
   * Subscribe to device topics
   * @param {string} deviceId - Device ID (case-sensitive)
   */
  _subscribe(deviceId) {
    if (!this.client?.connected) {
      console.warn("[WS] Not connected, will subscribe when ready");
      return;
    }

    const self = this;

    // 🔔 Stream topic - sensor data
    const streamTopic = `/topic/stream/${deviceId}`;
    if (!this.subscriptions.has(streamTopic)) {
      const sub = this.client.subscribe(streamTopic, (message) => {
        try {
          const data = JSON.parse(message.body);
          console.log("📡 Stream:", data);
          self._handleData(data);
        } catch (err) {
          console.error("Error parsing stream:", err);
        }
      });
      this.subscriptions.set(streamTopic, sub);
      console.log("🔔 Subscribed to", streamTopic);
    }

    // 🔔 State topic - control/state data
    const stateTopic = `/topic/state/${deviceId}`;
    if (!this.subscriptions.has(stateTopic)) {
      const sub = this.client.subscribe(stateTopic, (message) => {
        try {
          const data = JSON.parse(message.body);
          console.log("📡 State:", data);
          self._handleData(data);
        } catch (err) {
          console.error("Error parsing state:", err);
        }
      });
      this.subscriptions.set(stateTopic, sub);
      console.log("🔔 Subscribed to", stateTopic);
    }
  }

  /**
   * Unsubscribe from all topics for a device
   */
  _unsubscribe(deviceId) {
    const keysToRemove = [];

    this.subscriptions.forEach((sub, topic) => {
      if (topic.includes(deviceId)) {
        try {
          sub.unsubscribe();
          console.log("🔕 Unsubscribed from", topic);
        } catch (err) {
          console.warn("Error unsubscribing:", err);
        }
        keysToRemove.push(topic);
      }
    });

    keysToRemove.forEach((key) => this.subscriptions.delete(key));
  }

  /**
   * Handle incoming data and forward to callback
   */
  _handleData(data) {
    if (!this.dataCallback || typeof data !== "object") return;

    // Add timestamp if missing
    const timestamp = data.timestamp || new Date().toISOString();

    // Forward each key as a sensor update
    Object.keys(data).forEach((key) => {
      if (key === "timestamp" || key === "deviceId") return;

      let value = data[key];
      // Convert string numbers
      if (typeof value === "string" && !isNaN(Number(value))) {
        value = Number(value);
      }

      this.dataCallback({
        sensorType: key,
        value: value,
        timestamp: timestamp,
      });
    });
  }

  /**
   * Subscribe to a device
   * @param {string} deviceId - Device ID (case-sensitive)
   * @param {Function} callback - Data handler
   */
  subscribeToDevice(deviceId, callback) {
    // Unsubscribe from previous device
    if (this.currentDeviceId && this.currentDeviceId !== deviceId) {
      this._unsubscribe(this.currentDeviceId);
    }

    this.currentDeviceId = deviceId;
    this.dataCallback = callback;

    if (this.isReady) {
      this._subscribe(deviceId);
    }

    // Return cleanup function
    return () => {
      if (this.currentDeviceId === deviceId) {
        this._unsubscribe(deviceId);
        this.currentDeviceId = null;
      }
    };
  }

  /**
   * Check if connected
   */
  get isConnected() {
    return this.client?.connected || false;
  }

  /**
   * Register connect callback
   */
  onConnect(callback) {
    this.connectCallback = callback;
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
   * Send command to device
   */
  sendCommand(topic, payload) {
    if (!this.isConnected || !this.currentDeviceId) {
      console.warn("[WS] Cannot send - not connected or no device");
      return false;
    }

    // Ensure topic has the correct fmc/ prefix (but avoid double prefix)
    const formattedTopic = topic.startsWith("fmc/") ? topic.substring(4) : topic;
    const destination = `/app/device/${this.currentDeviceId}/state/fmc/${formattedTopic}`;

    try {
      this.client.publish({
        destination,
        body: JSON.stringify({
          deviceId: this.currentDeviceId,
          ...payload,
          timestamp: new Date().toISOString(),
        }),
        headers: { "content-type": "application/json" },
      });
      console.log("📤 Sent command to", destination);
      return true;
    } catch (error) {
      console.error("❌ Failed to send command:", error);
      return false;
    }
  }

  /**
   * Send ventilation command
   */
  sendVentilationCommand(state, mode = "manual") {
    return this.sendCommand("ventilation", {
      ventilation: state.toLowerCase(),
      mode: mode.toLowerCase(),
    });
  }

  /**
   * Send machine control command
   */
  sendMachineControlCommand(command) {
    return this.sendCommand("machineControl", {
      machineControl: command.toLowerCase(),
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    if (this.currentDeviceId) {
      this._unsubscribe(this.currentDeviceId);
    }

    if (this.client) {
      this.client.deactivate();
      this.isReady = false;
      console.log("[WS] Disconnected");
    }
  }
}

// Export singleton
export const webSocketClient = new WebSocketClient();

// Dev mode helper
if (typeof window !== "undefined" && import.meta.env?.DEV) {
  window.webSocketClient = webSocketClient;
}
