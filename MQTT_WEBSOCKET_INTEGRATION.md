# MQTT to WebSocket Integration Issue - Analysis & Solution

## Problem Identified

Your dashboard **cannot see** data published from MQTTX because of a **protocol mismatch**:

### Current Architecture

```
IoT Device (MQTTX) → MQTT Broker (mqtt.protonest.co:8883) → ❌ NOT CONNECTED ❌ → WebSocket/STOMP Broker (wss://api.protonestconnect.co/ws) → Dashboard
```

### What's Happening

1. **IoT Devices/MQTTX publish to**: `mqtt.protonest.co:8883` (MQTT Protocol)

   - Topic: `protonest/demo/stream/temperature`
   - Payload: `{"temperature":"30C"}`
   - Protocol: **MQTT over SSL/TLS**

2. **Dashboard subscribes to**: `wss://api.protonestconnect.co/ws` (WebSocket/STOMP Protocol)
   - Topic: `protonest/device_001/stream/temperature`
   - Expected Payload: `{payload: {temperature: "30C"}, timestamp: "..."}`
   - Protocol: **WebSocket STOMP**

### Why Data Doesn't Appear

- **MQTT broker** and **WebSocket STOMP broker** are **separate systems**
- Publishing to MQTT broker doesn't automatically forward to WebSocket broker
- There's no bridge connecting them in your current setup

---

## Solutions

### Solution 1: Backend Bridge (Recommended for Production)

**Setup a backend service** that:

1. Subscribes to MQTT broker (`mqtt.protonest.co:8883`)
2. Receives messages from IoT devices
3. Forwards them to WebSocket/STOMP broker (`wss://api.protonestconnect.co/ws`)

**Architecture**:

```
IoT Device → MQTT Broker → Backend Bridge Service → WebSocket/STOMP Broker → Dashboard
```

**Implementation** (Node.js example):

```javascript
const mqtt = require("mqtt");
const Stomp = require("@stomp/stompjs");
const WebSocket = require("ws");

// MQTT Client (subscribe to IoT devices)
const mqttClient = mqtt.connect("mqtts://mqtt.protonest.co", {
  port: 8883,
  username: "your-username",
  password: "your-password",
});

// STOMP Client (publish to dashboard)
const stompClient = new Stomp.Client({
  brokerURL: "wss://api.protonestconnect.co/ws?token=YOUR_JWT",
  webSocketFactory: () =>
    new WebSocket("wss://api.protonestconnect.co/ws?token=YOUR_JWT"),
});

// When MQTT message arrives, forward to STOMP
mqttClient.on("message", (topic, message) => {
  const payload = JSON.parse(message.toString());

  // Transform MQTT message to STOMP format
  const stompMessage = {
    payload: payload,
    timestamp: new Date().toISOString(),
  };

  // Publish to STOMP broker
  stompClient.publish({
    destination: topic,
    body: JSON.stringify(stompMessage),
  });

  console.log(`Bridged: ${topic} →`, payload);
});

// Subscribe to all device topics on MQTT
mqttClient.subscribe("protonest/+/stream/#");
mqttClient.subscribe("protonest/+/state/#");

stompClient.activate();
```

---

### Solution 2: Dashboard Direct MQTT Connection (Quick Fix)

**Modify the dashboard** to connect directly to the MQTT broker instead of WebSocket/STOMP.

**Steps**:

#### 1. Install MQTT.js in your React project

```bash
npm install mqtt
```

#### 2. Create new MQTT client service

Create `src/services/mqttClient.js`:

```javascript
import mqtt from "mqtt";

class MqttClient {
  constructor() {
    this.client = null;
    this.subscriptions = new Map();
    this.dataCallback = null;
    this.isConnected = false;
  }

  connect() {
    // Connect to MQTT broker
    this.client = mqtt.connect("wss://mqtt.protonest.co", {
      port: 443, // Use WSS port for browser compatibility
      protocol: "wss",
      username: "your-username", // From ProtoNest
      password: "your-password",
      clean: true,
      reconnectPeriod: 5000,
    });

    this.client.on("connect", () => {
      console.log("✅ Connected to MQTT broker");
      this.isConnected = true;
      if (this.connectCallback) this.connectCallback();
    });

    this.client.on("message", (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        this._handleMessage(topic, payload);
      } catch (err) {
        console.error("Failed to parse message:", err);
      }
    });

    this.client.on("error", (err) => {
      console.error("❌ MQTT Error:", err);
    });

    this.client.on("close", () => {
      console.log("🔻 MQTT Disconnected");
      this.isConnected = false;
    });
  }

  subscribeToDevice(deviceId) {
    if (!this.client || !this.isConnected) {
      console.warn("Cannot subscribe - client not ready");
      return;
    }

    // Subscribe to all stream topics
    this.client.subscribe(`protonest/${deviceId}/stream/#`, { qos: 1 });

    // Subscribe to all state topics
    this.client.subscribe(`protonest/${deviceId}/state/#`, { qos: 1 });

    console.log(`🔔 Subscribed to protonest/${deviceId}/#`);
  }

  _handleMessage(topic, payload) {
    // Parse topic: protonest/demo/stream/temperature
    const parts = topic.split("/");
    const deviceId = parts[1];
    const category = parts[2]; // stream or state
    const sensor = parts[3]; // temperature, vibration, etc.

    if (category === "stream" && this.dataCallback) {
      // Extract value from payload
      const value = payload[sensor] || payload.value;

      if (value !== undefined) {
        this.dataCallback({
          sensorType: sensor,
          value: value,
          timestamp: new Date().toISOString(),
        });
      }
    } else if (category === "state" && this.dataCallback) {
      // Handle state updates
      const value = payload.state || payload.status || payload.mode;

      if (value !== undefined) {
        this.dataCallback({
          sensorType: sensor,
          value: value,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  onData(callback) {
    this.dataCallback = callback;
  }

  onConnect(callback) {
    this.connectCallback = callback;
  }

  disconnect() {
    if (this.client) {
      this.client.end();
      this.isConnected = false;
    }
  }
}

export const mqttClient = new MqttClient();
```

#### 3. Update DashboardHome.jsx

Replace `webSocketClient` with `mqttClient`:

```javascript
// Change import
import { mqttClient } from "../services/mqttClient"; // Instead of webSocketClient

// In useEffect for connection
useEffect(() => {
  mqttClient.connect();

  mqttClient.onConnect(() => {
    setWebsocketConnected(true); // Reuse the same state
    setRealtimeActive(true);
  });

  mqttClient.onData((data) => {
    handleSensorData(data);
  });

  return () => {
    mqttClient.disconnect();
  };
}, []);

// In useEffect for device subscription
useEffect(() => {
  if (!selectedDevice || !websocketConnected) return;

  mqttClient.subscribeToDevice(selectedDevice);
}, [selectedDevice, websocketConnected]);
```

---

### Solution 3: Use WebSocket/STOMP in MQTTX (Simplest Test)

**For testing purposes**, publish directly to the WebSocket broker that the dashboard is connected to.

#### In MQTTX:

1. **Change Protocol** from `mqtts://` to WebSocket STOMP
2. **Use this tool instead**: Install **STOMP WebSocket client** or use **Postman**

#### Using Browser Console (Quick Test):

```javascript
// Open browser console on your dashboard page

// Get JWT token
const token = localStorage.getItem("jwtToken");

// Create WebSocket connection
const ws = new WebSocket(`wss://api.protonestconnect.co/ws?token=${token}`);

// When connected, send STOMP frame
ws.onopen = () => {
  // STOMP CONNECT frame
  ws.send("CONNECT\naccept-version:1.2\n\n\0");
};

// When message received
ws.onmessage = (event) => {
  console.log("Received:", event.data);

  // After connection, send data
  if (event.data.includes("CONNECTED")) {
    // STOMP SEND frame
    const message = JSON.stringify({
      payload: { temperature: "30C" },
      timestamp: new Date().toISOString(),
    });

    ws.send(
      `SEND\ndestination:protonest/device_001/stream/temperature\n\n${message}\0`
    );
    console.log("Sent temperature data");
  }
};
```

---

## Current Dashboard Configuration

**File**: `src/services/webSocketClient.js`

```javascript
// Dashboard connects to WebSocket/STOMP broker
const wsUrl = `wss://api.protonestconnect.co/ws?token=${encodedToken}`;

// Subscribes to topics in format:
// protonest/<deviceId>/stream/<sensor>
// protonest/<deviceId>/state/<control>
```

**Expected Message Format**:

```json
{
  "payload": {
    "temperature": "30C"
  },
  "timestamp": "2025-12-12T10:30:00.000Z"
}
```

---

## Recommended Action Plan

### For Production Deployment:

1. ✅ **Implement Solution 1** (Backend Bridge) - Most scalable
2. Set up a Node.js service on the server
3. Bridge MQTT → WebSocket/STOMP
4. Keep IoT devices on MQTT (as designed)
5. Keep dashboard on WebSocket/STOMP (as designed)

### For Testing Now:

1. ✅ **Use Solution 3** (Browser Console Test) - Immediate results
2. Verify dashboard receives data correctly
3. Then decide between Solution 1 or 2 for permanent fix

### If Simplifying Architecture:

1. ✅ **Implement Solution 2** (Dashboard Direct MQTT) - Remove WebSocket dependency
2. Update dashboard to use MQTT.js
3. Connect directly to `mqtt.protonest.co`
4. Simplify to single protocol (MQTT only)

---

## Testing Commands

### Test with MQTTX (Currently won't work):

```bash
Topic: protonest/demo/stream/temperature
Payload: {"temperature":"30C"}
Result: ❌ Dashboard won't see it (different broker)
```

### Test with Browser Console (Will work):

```javascript
// Paste in browser console on dashboard page
const token = localStorage.getItem("jwtToken");
const ws = new WebSocket(`wss://api.protonestconnect.co/ws?token=${token}`);
ws.onopen = () => ws.send("CONNECT\naccept-version:1.2\n\n\0");
ws.onmessage = (e) => {
  if (e.data.includes("CONNECTED")) {
    const msg = JSON.stringify({
      payload: { temperature: "30C" },
      timestamp: new Date().toISOString(),
    });
    ws.send(
      `SEND\ndestination:protonest/device_001/stream/temperature\n\n${msg}\0`
    );
  }
};
```

---

## Summary

**Problem**: MQTT broker ≠ WebSocket/STOMP broker
**Root Cause**: Two separate messaging systems with no bridge
**Impact**: IoT device data doesn't reach dashboard
**Solution**: Choose one of the three solutions based on your needs

Let me know which solution you'd like to implement!
