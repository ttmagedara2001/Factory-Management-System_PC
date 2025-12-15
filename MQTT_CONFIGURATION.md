# Factory Management System - MQTT Configuration

## Overview

This Factory Management System connects to Protonest MQTT broker via WebSocket for real-time sensor data monitoring and machine control.

## Auto-Login Configuration

### Current Setup

The application attempts auto-login on startup using credentials stored in `src/App.jsx`.

**⚠️ IMPORTANT: Update these credentials before deployment:**

```javascript
// In src/App.jsx (lines ~57-58)
const email = "your-email@example.com"; // Replace with your Protonest email
const secretKey = "your-secret-key"; // Replace with your Protonest secret key
```

### How to Get Your Credentials

1. Log in to [Protonest Dashboard](https://api.protonestconnect.co)
2. Navigate to your account settings
3. Copy your registered email address
4. Generate or copy your Secret Key (API Key)

## MQTT Configuration

### Broker Details

- **Host**: `api.protonestconnect.co`
- **Protocol**: WebSocket Secure (WSS)
- **Port**: Default HTTPS port (443)
- **Authentication**: JWT Token (obtained via auto-login)

### Mock Devices

The system is configured with 4 mock devices for testing:

```javascript
const MOCK_DEVICES = [
  "device9988",
  "device0011233",
  "device7654",
  "device3421",
];
```

**To add/remove devices**, edit `src/services/mqttService.js`:

```javascript
export const MOCK_DEVICES = [
  "device9988", // Your device IDs
  "device0011233",
  // Add more devices here
];
```

## MQTT Topic Structure

### Format

```
protonest/<deviceId>/<topic>/fcm/<suffix>
```

### Stream Topics (Sensor Data)

Subscribe to real-time sensor streams:

| Topic Type | Suffix        | Data Type | Description            |
| ---------- | ------------- | --------- | ---------------------- |
| Stream     | `temperature` | Float     | Temperature in °C      |
| Stream     | `humidity`    | Float     | Humidity percentage    |
| Stream     | `co2`         | Float     | CO2 level percentage   |
| Stream     | `vibration`   | Float     | Vibration in mm/s      |
| Stream     | `noise`       | Float     | Noise level in dB      |
| Stream     | `pressure`    | Float     | Pressure in bar        |
| Stream     | `airQuality`  | Integer   | Calculated AQI (0-100) |

**Example Stream Topic:**

```
protonest/device9988/stream/fcm/temperature
```

### State Topics (Control Commands)

Publish/subscribe to machine state:

| Topic Type | Suffix           | Data Type      | Description                      |
| ---------- | ---------------- | -------------- | -------------------------------- |
| State      | `ventilation`    | Boolean/String | Ventilation control (on/off)     |
| State      | `machineControl` | String         | Machine status (running/stopped) |

**Example State Topic:**

```
protonest/device9988/state/fcm/machineControl
```

## Air Quality Index (AQI) Calculation

The system calculates AQI automatically using temperature, humidity, and CO2 data:

### Formula

```javascript
AQI = (TempScore × 0.3) + (HumidityScore × 0.3) + (CO2Score × 0.4)
```

### Scoring Components

**Temperature Score** (Optimal: 20-24°C)

```javascript
tempScore = max(0, 100 - (|temperature - 22| × 5))
```

**Humidity Score** (Optimal: 40-60%)

```javascript
If humidity between 40-60%: score = 100
If humidity < 40%: score = max(0, 100 - ((40 - humidity) × 2))
If humidity > 60%: score = max(0, 100 - ((humidity - 60) × 2))
```

**CO2 Score** (Optimal: <30%)

```javascript
co2Score = max(0, 100 - (co2 × 2))
```

### AQI Interpretation

- **75-100**: Good (Green)
- **50-74**: Moderate (Yellow)
- **0-49**: Poor (Red)

## Message Format

### Incoming Stream Data

```json
{
  "payload": {
    "temperature": "24.5"
  },
  "timestamp": "2025-12-15T10:30:00Z"
}
```

### Outgoing Control Commands

```json
{
  "status": "stopped",
  "timestamp": "2025-12-15T10:30:00Z"
}
```

## WebSocket Connection Flow

1. **Auto-Login**

   - App starts → Checks localStorage for JWT token
   - If no token → Calls login API with credentials
   - Stores JWT and refresh tokens

2. **MQTT Connection**

   - Builds WebSocket URL with JWT token
   - Connects to `wss://api.protonestconnect.co/ws?token=<JWT>`
   - Waits for connection confirmation

3. **Topic Subscription**

   - Once connected → Subscribes to all topics for all devices
   - Each device gets 8 subscriptions (7 stream + 1 state topics)

4. **Data Processing**
   - Messages arrive → Parsed and validated
   - Sensor data → Updates React state
   - AQI calculation triggers when temp/humidity/CO2 update
   - UI components re-render with new data

## Machine Control

### Control Modes

**AUTO Mode**

- Default mode
- Machine control buttons disabled
- System manages machine automatically

**MANUAL Mode**

- User can start/stop machine
- Sends MQTT commands to all devices
- State synced across all connected devices

### Control Flow

```
User clicks "MANUAL"
→ Enable machine control button
→ User clicks "STOP MACHINE"
→ Publish to: protonest/<deviceId>/state/fcm/machineControl
→ All devices receive command
→ UI updates to show "STOPPED" status
```

## Development & Testing

### Running Locally

```bash
npm install
npm run dev
```

### Testing Without Real Devices

- The system is designed to work without physical devices
- Topics are subscribed but will show `--` until data arrives
- Use MQTT test tools to publish test data to topics

### Publishing Test Data (MQTT.fx or similar)

```
Topic: protonest/device9988/stream/fcm/temperature
Payload: {"payload": {"temperature": "25.5"}, "timestamp": "2025-12-15T10:30:00Z"}
```

## Troubleshooting

### Connection Issues

1. **Check JWT Token**: Ensure credentials in App.jsx are correct
2. **Check Browser Console**: Look for MQTT connection errors
3. **Network**: Verify firewall doesn't block WSS connections

### No Data Showing

1. **Verify Device IDs**: Ensure device IDs match actual devices
2. **Check Topics**: Verify topic structure matches exactly
3. **Test Subscription**: Use MQTT client to test topic subscription

### Authentication Errors

1. **Regenerate Secret Key**: From Protonest dashboard
2. **Clear localStorage**: Remove old tokens
3. **Check Email**: Verify email is registered in Protonest

## Security Notes

⚠️ **IMPORTANT**:

- Never commit real credentials to version control
- Use environment variables for production: `import.meta.env.VITE_EMAIL`
- Rotate secret keys regularly
- Monitor token expiration and implement refresh logic

## File Structure

```
src/
├── App.jsx                      # Main app with auto-login & MQTT init
├── services/
│   ├── authService.js          # Login API calls
│   ├── mqttService.js          # MQTT connection & management
│   └── webSocketClient.js      # Original WebSocket (backup)
└── Components/
    ├── Dashboard.jsx           # Main dashboard
    ├── RealTimeWindow.jsx      # Real-time sensor display
    ├── SettingsWindow.jsx      # Threshold & machine control
    └── HistoricalWindow.jsx    # Historical data (placeholder)
```

## Next Steps

1. **Update credentials** in `App.jsx`
2. **Replace mock devices** with real device IDs
3. **Test connection** with real devices
4. **Implement token refresh** for long-running sessions
5. **Add error handling** for network issues
6. **Store credentials securely** using environment variables

## Support

For issues with:

- **Protonest API**: Contact Protonest support
- **MQTT Connection**: Check network and credentials
- **Application**: Review browser console logs

---

**Last Updated**: December 15, 2025
**Version**: 1.0.0
