# Nexus Core - Factory Monitoring System

A professional factory monitoring dashboard built with React, Tailwind CSS, and Recharts.

## 📁 Components Structure

```
src/
├── Componentss/
│   ├── common/                  # Reusable UI Componentss
│   │   ├── Card.jsx             # White container with shadow
│   │   ├── Badge.jsx            # Status pills (Running/Fault/Idle)
│   │   ├── Button.jsx           # Standard buttons (primary/secondary/danger)
│   │   ├── ToggleSwitch.jsx     # iOS-style toggle switches
│   │   └── EmergencyStop.jsx    # Prominent red emergency stop button
│   │
│   ├── layout/                  # Layout Componentss
│   │   ├── Header.jsx           # Logo, UserID, Device Selector, Factory Status
│   │   └── TabNavigation.jsx    # Tab switching (Production/Machine)
│
│   └── dashboard/               # Dashboard-specific widgets
│       ├── production/
│       │   ├── KpiCard.jsx      # Large metric cards (Production, Target, Efficiency)
│       │   ├── ProductionLog.jsx# Live RFID scan log table
│       │   └── ProductionChart.jsx # Weekly production trend chart
│       │
│       └── machine/
│           ├── VibrationGauge.jsx    # Radial gauge (0-10 mm/s)
│           ├── PressureDisplay.jsx   # Pressure readout + Air Quality
│           ├── MultiSensorChart.jsx  # Multi-line sensor timeline chart
│           └── ControlsPanel.jsx     # Motor/Fan toggles, Mode selector, Thresholds
│
├── hooks/
│   ├── useMqttConnection.js     # WebSocket/MQTT connection manager
│   └── useFactoryData.js        # API data fetching hook
│
├── pages/
│   └── DashboardHome.jsx        # Main dashboard page (assembles all Componentss)
│
└── App.jsx                      # Root Components
```

## 🎨 Design System

### Colors

- **Background**: `bg-slate-50` (Very light gray)
- **Cards**: `bg-white` with `shadow-sm` and `rounded-xl`
- **Text**:
  - Headings: `text-slate-800`
  - Labels: `text-slate-500`
- **Status Accents**:
  - Success/Running: `text-emerald-600`, `bg-emerald-50`
  - Warning/Idle: `text-amber-600`, `bg-amber-50`
  - Danger/Fault: `text-red-600`, `bg-red-50`
  - Primary Brand: `bg-slate-900`

## 🚀 Features

### Production Dashboard

- **KPI Cards**: Daily production, target, and efficiency metrics
- **Production Chart**: 7-day trend visualization with Recharts
- **Production Log**: Real-time RFID scan history
- **Emergency Stop**: Prominent safety control

### Machine Monitoring

- **Vibration Gauge**: SVG radial gauge with color-coded thresholds
- **Pressure Display**: Hydraulic pressure with progress bar
- **Air Quality**: Status badge indicator
- **Multi-Sensor Chart**: Real-time vibration, temperature, and pressure
- **Control Panel**:
  - Conveyor motor toggle
  - Ventilation mode switch (Auto/Manual)
  - Operating mode selector (Auto/Manual/Maintenance)
  - Min/Max threshold settings for sensors

## 📦 Dependencies

```json
{
  "react": "^19.2.1",
  "react-dom": "^19.2.1",
  "tailwindcss": "^4.1.17",
  "recharts": "^2.x.x"
}
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🔌 Integration Points

### MQTT/WebSocket Connection

The `useMqttConnection` hook in `src/hooks/useMqttConnection.js` is set up for integration with your MQTT broker. Currently uses dummy data - replace with your actual MQTT client (e.g., mqtt.js, paho-mqtt).

### API Integration

The `useFactoryData` hook in `src/hooks/useFactoryData.js` provides placeholder data fetching. Update with your actual API endpoints.

## 📊 Dummy Data

The dashboard includes comprehensive dummy data for demonstration:

- Production logs (RFID scans)
- Weekly production trends
- Real-time sensor readings
- Device list

Replace these in `DashboardHome.jsx` with your actual data sources.

## 🎯 User Flow

1. **Header**: Select device from dropdown, view factory status
2. **Navigation**: Switch between Production and Machine tabs
3. **Production View**: Monitor KPIs, view logs, emergency stop
4. **Machine View**: Monitor sensors, adjust controls, set thresholds

## 📝 Notes

- All Tailwind classes follow the professional light theme design system
- Componentss are fully reusable and modular
- Charts use Recharts library for smooth, responsive visualizations
- Emergency stop button includes animation and disabled state
- Toggle switches feature iOS-style design with smooth transitions
