# WebSocket Setup Guide

## Overview

The Factory Management System now uses WebSocket connections via the ProtoNest MQTT broker to receive real-time sensor data from IoT devices.

## Configuration Steps

### 1. Update Credentials in App.jsx

Open `src/App.jsx` and replace the placeholder credentials on lines ~55-56:

```javascript
const email = "your-email@example.com"; // REPLACE with your ProtoNest email
const secretKey = "your-secret-key-from-protonest-dashboard"; // REPLACE with your secret key
```

**Where to find your Secret Key:**

1. Log in to ProtoNest Dashboard
2. Go to Settings → Security
3. Copy your Secret Key (NOT your login password)

### 2. Topic Structure

The system subscribes to MQTT topics with the following format:

**Stream Topics (Sensor Data):**

```
protonest/<deviceId>/stream/fcm/<sensor>
```

Supported sensors:

- `temperature` - Temperature in Celsius
- `humidity` - Humidity percentage
- `co2` - CO2 percentage
- `vibration` - Vibration in mm/s
- `pressure` - Pressure in bar
- `noise` - Noise level in dB
- `aqi` - Air Quality Index (or auto-calculated)

**State Topics (Control Commands):**

```
protonest/<deviceId>/state/fcm/<command>
```

Supported commands:

- `machine_control` - Machine control (RUN/STOP)
- `ventilation_mode` - Ventilation mode (auto/off)

### 3. Mock Devices

The system includes 4 mock devices for testing:

- `device9988` - Machine A - Line 1
- `device0011233` - Machine B - Line 2
- `device7654` - Machine C - Line 3
- `device3421` - Machine D - Line 4

You can change these in `src/services/webSocketClient.js` (line 4-9).

### 4. Air Quality Index (AQI) Calculation

The system automatically calculates AQI based on three sensor inputs:

- Temperature (optimal: 20-24°C)
- Humidity (optimal: 40-60%)
- CO2 (optimal: <30%)

**Formula:**

```javascript
AQI = (tempScore × 0.3) + (humidityScore × 0.3) + (co2Score × 0.4)
```

Where:

- `tempScore = max(0, 100 - (|temp - 22| × 5))`
- `humidityScore` varies based on range (100 if 40-60%, decreases outside)
- `co2Score = max(0, 100 - (co2 × 2))`

Result is 0-100, where:

- **80-100**: Good (Green)
- **50-79**: Moderate (Yellow)
- **0-49**: Poor (Red)

## How It Works

### Connection Flow

1. **Auto-Login** (`App.jsx`)

   - Checks for existing JWT token in localStorage
   - If not found, performs auto-login with credentials
   - Stores JWT token and refresh token

2. **WebSocket Initialization** (`webSocketClient.js`)

   - Builds WebSocket URL with JWT token
   - Connects to ProtoNest MQTT broker
   - Activates STOMP client

3. **Device Subscription** (`App.jsx` + `Header.jsx`)

   - User selects device from dropdown in Header
   - `onDeviceChange` callback triggers
   - Unsubscribes from previous device (if any)
   - Subscribes to all topics for new device

4. **Data Flow**
   ```
   MQTT Broker → webSocketClient → App.jsx → Dashboard/Settings
                                      ↓
                                  sensorData state
                                      ↓
                              RealTimeWindow displays
   ```

### Component Integration

**App.jsx**

- Manages WebSocket connection lifecycle
- Stores sensor data in state
- Handles device selection changes
- Passes data to child components

**Header.jsx**

- Device selector dropdown
- Triggers device change callback
- Shows selected device name

**Dashboard.jsx**

- Passes sensor data to RealTimeWindow
- Displays real-time metrics

**RealTimeWindow.jsx**

- Displays sensor values
- Handles ventilation control
- Shows AQI with color coding

**SettingsWindow.jsx**

- Manual machine control (RUN/STOP)
- Control mode toggle (Auto/Manual)
- Sends commands via WebSocket

## Testing Commands

Open browser console after connection is established:

```javascript
// Get WebSocket info
webSocketClient.enableTestingMode();
wsInfo();

// Send machine commands (to currently selected device)
sendMachineCommand("RUN");
sendMachineCommand("STOP");

// Send ventilation commands
sendVentilationCommand("auto");
sendVentilationCommand("off");

// Simulate sensor data
simulateSensorData("vibration", 5.2);
simulateSensorData("temperature", 28.5);
simulateSensorData("humidity", 65);
simulateSensorData("co2", 45);
```

## Message Format

**Incoming Stream Message:**

```json
{
  "payload": {
    "temperature": "24.5"
  },
  "timestamp": "2025-12-15T10:30:00Z"
}
```

**Incoming State Message:**

```json
{
  "payload": {
    "machine_control": "RUN"
  },
  "timestamp": "2025-12-15T10:30:00Z"
}
```

**Outgoing Control Command:**

```json
{
  "machine_control": "STOP"
}
```

## Troubleshooting

### Connection Issues

**Problem:** WebSocket not connecting

- Check JWT token in localStorage
- Verify credentials in App.jsx
- Check browser console for errors
- Ensure ProtoNest service is running

**Problem:** No data received

- Verify device is publishing to correct topics
- Check topic format: `protonest/<deviceId>/stream/fcm/<sensor>`
- Use `wsInfo()` to see active subscriptions
- Check if device is online in ProtoNest Dashboard

**Problem:** Commands not working

- Ensure control mode is set to "Manual" (SettingsWindow)
- Check WebSocket connection status
- Verify selected device ID
- Check browser console for errors

### Data Issues

**Problem:** AQI not calculating

- Ensure temperature, humidity, and CO2 are all being received
- Check sensor data types (must be numbers)
- Look for calculation errors in console

**Problem:** Sensor values showing as "--"

- No data received yet (wait for first message)
- Device not publishing to topic
- Topic format mismatch
- Check `sensorData` state in React DevTools

## File Structure

```
src/
├── App.jsx                          # Main app, WebSocket initialization
├── services/
│   ├── webSocketClient.js           # WebSocket client (MAIN FILE)
│   ├── authService.js               # Authentication
│   └── mqttService.js               # (DEPRECATED - use webSocketClient)
└── Components/
    ├── Header.jsx                   # Device selector
    ├── Dashboard.jsx                # Main dashboard
    ├── RealTimeWindow.jsx           # Real-time sensor display
    └── SettingsWindow.jsx           # Machine control
```

## Development Mode Features

When running in development mode (`npm run dev`), testing commands are automatically available in the browser console.

Access via:

```javascript
webSocketClient.enableTestingMode();
```

This enables:

- `sendMachineCommand(control, mode)` - Send machine commands
- `sendVentilationCommand(mode)` - Control ventilation
- `simulateSensorData(type, value)` - Simulate sensor data
- `wsInfo()` - Display connection info

## Production Deployment

Before deploying to production:

1. Remove or secure auto-login credentials
2. Implement proper authentication flow
3. Add error boundaries
4. Configure environment variables
5. Enable reconnection logic
6. Add data persistence
7. Implement offline mode

## Support

For issues or questions:

1. Check browser console for errors
2. Verify topic structure matches documentation
3. Test with ProtoNest Dashboard first
4. Review MQTT_WEBSOCKET_INTEGRATION.md
5. Check ProtoNest API documentation
