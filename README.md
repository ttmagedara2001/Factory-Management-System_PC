# Nexus Core - Factory Management System

A modern, real-time factory monitoring dashboard built with React and Tailwind CSS. Monitor production metrics, machine health, and environmental sensors in a professional, intuitive interface.

![React](https://img.shields.io/badge/React-19.2.1-61DAFB?logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1.17-38B2AC?logo=tailwind-css)
![Vite](https://img.shields.io/badge/Vite-7.2.4-646CFF?logo=vite)
![License](https://img.shields.io/badge/License-MIT-green)

## 🌟 Features

### Production Dashboard

- **Real-time KPI Monitoring** - Track production count, target achievement, and efficiency
- **Weekly Production Charts** - Visualize 7-day production trends with Recharts
- **RFID Production Log** - Monitor product entries with timestamps and locations
- **Emergency Stop Controls** - Quick-access safety controls

### Machine Monitoring

- **6 Environmental Sensors**:

  - 🔧 Vibration monitoring with radial gauge
  - 🌡️ Temperature tracking with trend indicators
  - 💧 Humidity levels with status indicators
  - 📊 Hydraulic pressure monitoring
  - 🔊 Noise level detection
  - 🌫️ Air quality index (PM2.5, CO₂)

- **Real-time Charts** - Live sensor data visualization with toggleable metrics
- **Historical Analysis** - 24-hour environmental data trends
- **Control Panel** - Motor/ventilation controls with threshold settings

### Advanced Visualization

- **Individual Graph Toggles** - Show/hide specific metrics in charts
- **Status-based Colors** - Chart lines match sensor status indicators
- **Professional SVG Icons** - Clean, scalable icons throughout the UI
- **Responsive Design** - Optimized for desktop and tablet displays

## 🚀 Quick Start

### Prerequisites

- Node.js 16.x or higher
- npm or yarn package manager

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/ttmagedara2001/Factory-Management-System_PC.git
   cd Factory-Management-System_PC
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start development server**

   ```bash
   npm run dev
   ```

4. **Open your browser**
   ```
   http://localhost:5173
   ```

### Build for Production

```bash
npm run build
npm run preview
```

## 📁 Project Structure

```
Factory-Management-System_PC/
├── src/
│   ├── Componentss/
│   │   ├── common/           # Reusable UI Componentss
│   │   │   ├── Card.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── ToggleSwitch.jsx
│   │   │   └── EmergencyStop.jsx
│   │   ├── layout/           # Layout Componentss
│   │   │   ├── Header.jsx
│   │   │   └── TabNavigation.jsx
│   │   ├── icons/            # Professional SVG icons
│   │   │   └── SensorIcons.jsx
│   │   └── dashboard/
│   │       ├── production/   # Production monitoring
│   │       │   ├── KpiCard.jsx
│   │       │   ├── ProductionLog.jsx
│   │       │   └── ProductionChart.jsx
│   │       └── machine/      # Machine monitoring
│   │           ├── VibrationGauge.jsx
│   │           ├── TemperatureDisplay.jsx
│   │           ├── HumidityDisplay.jsx
│   │           ├── PressureDisplay.jsx
│   │           ├── NoiseLevelDisplay.jsx
│   │           ├── AirQualityDisplay.jsx
│   │           ├── MultiSensorChart.jsx
│   │           ├── EnvironmentalChart.jsx
│   │           └── ControlsPanel.jsx
│   ├── hooks/                # Custom React hooks
│   │   ├── useMqttConnection.js
│   │   └── useFactoryData.js
│   ├── pages/                # Main pages
│   │   └── DashboardHome.jsx
│   ├── App.jsx               # Root Components
│   ├── main.jsx              # Entry point
│   └── index.css             # Global styles
├── public/                   # Static assets
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

## 🎨 Tech Stack

- **Framework**: React 19.2.1
- **Build Tool**: Vite 7.2.4
- **Styling**: Tailwind CSS 4.1.17
- **Charts**: Recharts 3.5.1
- **Icons**: Custom SVG Componentss
- **Linting**: ESLint 9.39.1

## 🎯 Key Componentss

### Dashboard Tabs

- **Productions & Logistics** - Production metrics and RFID logs
- **Machine Monitoring** - Real-time sensor data and environmental charts

### Sensor Displays

All sensors include:

- Real-time value updates
- Status indicators (Normal/Warning/Critical)
- Visual gauges/charts
- Configurable thresholds

### Charts

- **MultiSensorChart** - Real-time vibration, temperature, pressure
- **EnvironmentalChart** - 24-hour temperature, humidity, noise, AQI
- **ProductionChart** - 7-day production vs target trends

## 🔧 Configuration

### Tailwind CSS

Custom design tokens in `tailwind.config.js`:

- Slate color palette (primary grays)
- Emerald (success states)
- Amber (warning states)
- Red (error/critical states)

### Data Hooks

- `useFactoryData` - Simulates API polling every 5 seconds
- `useMqttConnection` - Simulates MQTT real-time updates

## 📊 Dummy Data

The dashboard uses simulated data for demonstration:

- Production metrics update every 5 seconds
- Sensor values fluctuate within realistic ranges
- Charts show mock historical data

## 🎨 Design System

### Color Palette

- **Background**: Slate-50 (#f8fafc)
- **Cards**: White with subtle shadows
- **Success**: Emerald-600 (#059669)
- **Warning**: Amber-600 (#d97706)
- **Error**: Red-600 (#dc2626)
- **Text**: Slate-800 (#1e293b)

### Typography

- System font stack for optimal performance
- Bold weights for emphasis
- Monospace for data values

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🔌 MQTT & API Integration

### WebSocket Connection (STOMP)

The system connects to ProtoNest MQTT broker via STOMP over WebSocket:

```
wss://api.protonestconnect.co/ws?token=<JWT>
```

### Topic Format

**STOMP Subscriptions:**

```
/topic/stream/<deviceId>   → Real-time sensor data
/topic/state/<deviceId>    → Control/state updates
```

**HTTP API Topic Parameter:**

```
fmc/<sensor>   (e.g., "fmc/temperature", "fmc/vibration")
```

### Available Topics

| Type   | Topic Suffix         | Description                         |
| ------ | -------------------- | ----------------------------------- |
| Stream | `fmc/temperature`    | Temperature in °C                   |
| Stream | `fmc/humidity`       | Humidity %                          |
| Stream | `fmc/vibration`      | Vibration in mm/s                   |
| Stream | `fmc/pressure`       | Pressure in Pa                      |
| Stream | `fmc/noise`          | Noise level in dB                   |
| Stream | `fmc/co2`            | CO2 in ppm                          |
| Stream | `fmc/aqi`            | Air Quality Index                   |
| Stream | `fmc/units`          | Production unit count               |
| Stream | `fmc/product`        | Product tracking (increments units) |
| State  | `fmc/machineControl` | Machine RUN/STOP/IDLE               |
| State  | `fmc/ventilation`    | Ventilation mode                    |
| State  | `fmc/emergencyStop`  | Emergency stop events               |

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Author

**Thulani Magedara**

- GitHub: [@ttmagedara2001](https://github.com/ttmagedara2001)

## 🙏 Acknowledgments

- React team for the amazing framework
- Tailwind CSS for the utility-first CSS framework
- Recharts for beautiful chart Componentss
- Vite for lightning-fast development experience

## 📚 Documentation

For detailed documentation, see:

- [MQTT Configuration Guide](./MQTT_CONFIGURATION.md)
- [WebSocket Setup Guide](./WEBSOCKET_SETUP.md)
- [IoT Device Configuration](./IOT_DEVICE_CONFIGURATION.md)
- [Tailwind Setup Guide](./TAILWIND_SETUP.md)

---

**Built with ❤️ for modern factory monitoring**

**Last Updated**: February 10, 2026
