# Factory Management System - Implementation Summary

## Changes Implemented

### 1. MQTT Service (`src/services/mqttService.js`) ✅

**New file created** - Complete MQTT service implementation

**Features:**

- WebSocket connection to Protonest broker (`wss://api.protonestconnect.co`)
- JWT-based authentication
- Topic subscription management
- Message handling and parsing
- AQI calculation algorithm
- Machine control publishing
- Mock devices configuration

**Mock Devices:**

- `device9988`
- `device0011233`
- `device7654`
- `device3421`

**Topic Structure:** `protonest/<deviceId>/<topic>/fcm/<suffix>`

**Stream Suffixes:**

- temperature, humidity, co2, vibration, noise, pressure, airQuality

**State Suffixes:**

- ventilation, machineControl

**AQI Formula:**

```
AQI = (TempScore × 0.3) + (HumidityScore × 0.3) + (CO2Score × 0.4)
```

---

### 2. App.jsx Updates ✅

**Added:**

- Auto-login on app startup
- MQTT service initialization
- Real-time sensor data state management
- Loading screen during connection
- WebSocket callbacks for data updates
- Cleanup on unmount

**State Management:**

```javascript
const [sensorData, setSensorData] = useState({
  vibration: null,
  pressure: null,
  noise: null,
  temperature: null,
  humidity: null,
  co2: null,
  airQuality: null,
  ventilation: null,
  machineControl: null,
});
```

**Props Passing:**

- Dashboard → receives `sensorData`
- Settings → receives `sensorData` and `mqttService`
- HistoricalWindow → no changes

**⚠️ ACTION REQUIRED:**
Update credentials in App.jsx (lines ~57-58):

```javascript
const email = "your-email@example.com";
const secretKey = "your-secret-key";
```

---

### 3. RealTimeWindow.jsx Updates ✅

**Changed:**

- Initial values changed from `0` to `null`
- Added `sensorData` prop
- Updated all gauges to use real sensor data
- Added null checks with `--` display for missing data
- Updated AQI display with color coding
- Percentage calculations based on actual values

**Gauge Updates:**

```javascript
<Gauge
  value={currentValues.vibration ?? "--"}
  percentage={
    currentValues.vibration ? (currentValues.vibration / 10) * 100 : 0
  }
/>
```

**AQI Color Logic:**

- Red: < 50
- Yellow: 50-74
- Green: ≥ 75
- Gray: null

---

### 4. Dashboard.jsx Updates ✅

**Changed:**

- Added `sensorData` prop
- Passes `sensorData` to RealTimeWindow
- Removed mock data arrays (now empty)

**Data Arrays (Ready for Real Data):**

```javascript
const productionData = [];
const logData = [];
const alerts = [];
```

---

### 5. SettingsWindow.jsx Updates ✅

**Added:**

- `mqttService` prop
- MQTT imports for device control
- Machine control publishing via MQTT

**Machine Control Flow:**

1. User switches to MANUAL mode
2. User clicks STOP/START MACHINE button
3. Command published to all devices:
   ```
   Topic: protonest/<deviceId>/state/fcm/machineControl
   Payload: {status: "stopped", timestamp: "..."}
   ```
4. UI updates to reflect new status

**Topics Published:**

- All devices in `MOCK_DEVICES` array
- Topic type: `state`
- Suffix: `machineControl`

---

### 6. HistoricalWindow.jsx Updates ✅

**Changed:**

- Removed all mock data generation functions
- Removed static data arrays
- Replaced with empty arrays ready for API integration

**Ready for Integration:**

```javascript
const machinePerformanceData = [];
const environmentalData = [];
const productionData = [];
const oeeData = [];
const downtimeData = [];
const eventLogData = [];
```

---

### 7. Documentation ✅

**Created Files:**

- `MQTT_CONFIGURATION.md` - Complete MQTT setup guide
- This summary file

**Documentation Includes:**

- Auto-login configuration
- MQTT topic structure
- Device management
- AQI calculation formula
- Message formats
- Troubleshooting guide
- Security notes

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         App.jsx (Root)                          │
│  - Auto-login                                                   │
│  - MQTT initialization                                          │
│  - Sensor data state management                                 │
└─────────────────┬───────────────────────────────────────────────┘
                  │
         ┌────────┴────────┐
         │                 │
         ▼                 ▼
    Dashboard        Settings Window
         │                 │
         ├─► sensorData    ├─► mqttService.publish()
         │                 │
         ▼                 ▼
  RealTimeWindow    Machine Control
         │
         ├─► Gauges (Vibration, Pressure, Noise)
         ├─► Environment Cards (Temp, Humidity, CO2)
         └─► AQI Display (Calculated)

                  ▲
                  │
         ┌────────┴────────┐
         │                 │
    mqttService.js    authService.js
         │                 │
         ├─► Subscribe     ├─► Login API
         ├─► Publish       └─► JWT Token
         └─► Calculate AQI
```

---

## Data Flow

### 1. Startup Sequence

```
App Start
  → Check localStorage for JWT
  → If no JWT: Call login()
  → Store JWT token
  → Initialize mqttService
  → Connect to WSS broker
  → Subscribe to all device topics
  → Show Dashboard
```

### 2. Incoming Sensor Data

```
MQTT Message Received
  → Parse JSON payload
  → Extract sensor value
  → Update sensorData state
  → If temp/humidity/CO2: Calculate AQI
  → React re-renders components
  → Display updated values
```

### 3. Machine Control

```
User clicks "MANUAL" mode
  → Enable control button
  → User clicks "STOP MACHINE"
  → Publish to all devices
  → Update local state
  → UI shows "STOPPED"
```

---

## Testing Checklist

### Before First Run:

- [ ] Update credentials in `App.jsx`
- [ ] Replace mock devices with real device IDs (if available)
- [ ] Install dependencies: `npm install`
- [ ] Start dev server: `npm run dev`

### Expected Behavior:

- [ ] Loading screen appears
- [ ] Auto-login succeeds
- [ ] MQTT connection established
- [ ] Dashboard shows `--` for all sensors (until data arrives)
- [ ] No console errors (except missing data warnings)

### With Real Devices:

- [ ] Sensor values update in real-time
- [ ] AQI calculates automatically
- [ ] Gauge animations reflect actual values
- [ ] Critical thresholds trigger red colors

### Machine Control:

- [ ] AUTO mode disables control button
- [ ] MANUAL mode enables control button
- [ ] STOP command publishes to MQTT
- [ ] START command publishes to MQTT
- [ ] Status updates correctly

---

## Known Limitations

1. **No Token Refresh**: Current implementation doesn't refresh JWT automatically
2. **No Offline Handling**: App requires active connection
3. **No Data Persistence**: Sensor data lost on page refresh
4. **No Historical Storage**: HistoricalWindow still needs backend integration
5. **Hardcoded Credentials**: Should use environment variables

---

## Future Enhancements

### High Priority:

1. Implement JWT token refresh logic
2. Add environment variables for credentials
3. Add connection status indicator in UI
4. Implement error boundaries for graceful failures
5. Add reconnection with exponential backoff

### Medium Priority:

1. Store recent sensor data in localStorage
2. Add data export functionality
3. Implement historical data API integration
4. Add device health monitoring
5. Create admin panel for device management

### Low Priority:

1. Add data visualization charts
2. Implement predictive maintenance alerts
3. Add multi-user support
4. Create mobile-responsive design improvements
5. Add dark mode

---

## Production Deployment Checklist

### Security:

- [ ] Move credentials to environment variables
- [ ] Enable HTTPS only
- [ ] Implement CORS properly
- [ ] Add rate limiting
- [ ] Implement token refresh
- [ ] Add input validation
- [ ] Enable CSP headers

### Performance:

- [ ] Optimize bundle size
- [ ] Implement code splitting
- [ ] Add service worker for offline support
- [ ] Enable compression
- [ ] Optimize image assets
- [ ] Implement lazy loading

### Monitoring:

- [ ] Add error logging (Sentry, LogRocket)
- [ ] Add analytics
- [ ] Monitor MQTT connection health
- [ ] Track sensor data gaps
- [ ] Alert on connection failures

---

## Support & Maintenance

### Common Issues:

**"Cannot connect to MQTT"**

- Check credentials
- Verify network connectivity
- Check browser console for errors
- Test WSS connection manually

**"No data showing"**

- Verify device IDs are correct
- Check topics match expected format
- Use MQTT client to test publishing
- Check browser console for subscription confirmations

**"AQI shows '--'"**

- Ensure temperature, humidity, AND CO2 are all received
- Check calculation is triggered
- Verify data types are numbers

### Debug Mode:

Uncomment debug line in mqttService.js:

```javascript
debug: (msg) => console.log("🪵 [MQTT Debug]:", msg);
```

---

## File Changes Summary

| File                                  | Status       | Changes                                 |
| ------------------------------------- | ------------ | --------------------------------------- |
| `src/services/mqttService.js`         | **NEW**      | Complete MQTT service                   |
| `src/App.jsx`                         | **MODIFIED** | Auto-login, MQTT init, state management |
| `src/Components/RealTimeWindow.jsx`   | **MODIFIED** | Null values, real data display          |
| `src/Components/Dashboard.jsx`        | **MODIFIED** | Pass sensorData prop                    |
| `src/Components/SettingsWindow.jsx`   | **MODIFIED** | Machine control via MQTT                |
| `src/Components/HistoricalWindow.jsx` | **MODIFIED** | Removed mock data                       |
| `MQTT_CONFIGURATION.md`               | **NEW**      | Setup documentation                     |
| `IMPLEMENTATION_SUMMARY.md`           | **NEW**      | This file                               |

---

## Credentials Configuration

**CRITICAL: Update these before running:**

```javascript
// File: src/App.jsx (around line 57)

const email = "your-email@example.com"; // ← CHANGE THIS
const secretKey = "your-secret-key"; // ← CHANGE THIS
```

**To get credentials:**

1. Go to https://api.protonestconnect.co
2. Login to your account
3. Navigate to Settings → API Keys
4. Copy your email and secret key

---

## Quick Start

```bash
# 1. Update credentials in src/App.jsx

# 2. Install dependencies
npm install

# 3. Run development server
npm run dev

# 4. Open browser
# http://localhost:5173

# 5. Check console
# Look for "✅ [App] Auto-login successful"
# Look for "✅ [MQTT] Connected successfully"
```

---

**Implementation Date**: December 15, 2025  
**Version**: 1.0.0  
**Status**: Ready for Testing

**Next Step**: Update credentials in App.jsx and run the application!
