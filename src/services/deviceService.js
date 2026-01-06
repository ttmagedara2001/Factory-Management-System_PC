// ============================================
// FACTORY MANAGEMENT SYSTEM - DEVICE SERVICE
// ============================================
// HTTP API service layer for ProtoNest backend integration
// Handles all REST API calls for sensor data and machine control
// Uses API URL from api.js (do not hardcode BASE_URL)
//
// Architecture:
// - api.js: Axios instance with JWT interceptors
// - deviceService.js: Business logic functions (this file)
// - Components: Call functions from this file
//
// Factory Sensors (Stream Data):
// - vibration: Machine vibration levels (mm/s)
// - pressure: System pressure (Pa)
// - temperature: Ambient temperature (°C)
// - humidity: Relative humidity (%)
// - noise: Noise level (dB)
// - aqi: Air Quality Index (0-500)
// - pm25: Particulate Matter 2.5 (μg/m³)
// - co2: Carbon Dioxide levels (ppm)
// - units: Production unit count
//
// Machine States (Control Data):
// - machine_control: RUN/STOP/IDLE status
// - ventilation_mode: auto/manual ventilation control
// ============================================

import api from "./api.js";

// ============================================
// PRIMARY API FUNCTIONS - FACTORY SYSTEM
// ============================================

/**
 * Get historical stream data for all sensor topics of a factory device
 *
 * Endpoint: POST /get-stream-data/device
 *
 * Fetches time-series sensor data including:
 * - Vibration levels (mm/s)
 * - Pressure readings (Pa)
 * - Temperature (°C)
 * - Humidity (%)
 * - Noise levels (dB)
 * - Air Quality Index (AQI)
 * - Particulate Matter (PM2.5 in μg/m³)
 * - CO2 levels (ppm)
 * - Production unit counts
 *
 * Used by: EnvironmentalChart, MultiSensorChart components
 * Real-time data: Received via WebSocket (see webSocketClient.js)
 * Historical data: Fetched via this HTTP API
 *
 * @param {string} deviceId - Factory device ID (e.g., "device_001")
 * @param {string} startTime - ISO-8601 format start time (e.g., "2025-01-24T00:00:00Z")
 * @param {string} endTime - ISO-8601 format end time
 * @param {number} pagination - Page number for pagination (default: 0)
 * @param {number} pageSize - Number of records per page (default: 100)
 * @returns {Promise<Object>} Response with status and data array
 *
 * Example response:
 * {
 *   status: "Success",
 *   data: [
 *     {
 *       timestamp: "2025-01-24T10:30:00Z",
 *       vibration: 2.5,
 *       pressure: 101325,
 *       temperature: 22.3,
 *       humidity: 45.2,
 *       noise: 65.8,
 *       aqi: 42,
 *       pm25: 12.5,
 *       co2: 450,
 *       units: 150
 *     },
 *     ...
 *   ]
 * }
 */
export const getStreamDataForDevice = async (
  deviceId,
  startTime,
  endTime,
  pagination = 0,
  pageSize = 100
) => {
  try {
    console.log(
      `📊 [HTTP API] Fetching historical stream data for ${deviceId}`
    );
    console.log(`⏰ [HTTP API] Time range: ${startTime} to ${endTime}`);

    const response = await api.post("/get-stream-data/device", {
      deviceId,
      startTime,
      endTime,
      pagination: pagination.toString(), // API requires string format
      pageSize: pageSize.toString(), // API requires string format
    });

    if (response.data.status === "Success") {
      const recordCount = response.data.data?.length || 0;
      console.log(
        `✅ [HTTP API] Retrieved ${recordCount} historical records for ${deviceId}`
      );

      // Log sample data point for debugging
      if (recordCount > 0) {
        console.log(`📋 [HTTP API] Sample data point:`, response.data.data[0]);
      }
    }

    return response.data;
  } catch (error) {
    console.error(`❌ [HTTP API] Failed to get stream data for ${deviceId}:`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      endpoint: "/get-stream-data/device",
    });
    throw error;
  }
};

/**
 * Get all current state values for a factory device
 *
 * Endpoint: POST /get-state-details/device
 *
 * Retrieves current machine control states including:
 * - machine_control: Current machine status (RUN/STOP/IDLE)
 * - ventilation_mode: Ventilation control mode (auto/manual)
 *
 * Used by: ControlsPanel component for displaying current states
 * State updates: Sent via updateStateDetails() or WebSocket
 *
 * @param {string} deviceId - Factory device ID (e.g., "device_001")
 * @returns {Promise<Object>} Response with current state values
 *
 * Example response:
 * {
 *   status: "Success",
 *   data: {
 *     machine_control: { status: "RUN" },
 *     ventilation_mode: { mode: "auto" }
 *   }
 * }
 */
export const getStateDetailsForDevice = async (deviceId) => {
  try {
    console.log(`🎛️ [HTTP API] Fetching state details for ${deviceId}`);

    const response = await api.post("/get-state-details/device", {
      deviceId,
    });

    if (response.data.status === "Success") {
      console.log(
        `✅ [HTTP API] Retrieved state details for ${deviceId}:`,
        response.data.data
      );
    }

    return response.data;
  } catch (error) {
    console.error(
      `❌ [HTTP API] Failed to get device states for ${deviceId}:`,
      {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        endpoint: "/get-state-details/device",
      }
    );
    throw error;
  }
};

/**
 * Update or create a state value for a factory device topic
 *
 * Endpoint: POST /update-state-details
 *
 * Updates machine control states:
 * - machine_control: Set machine to RUN/STOP/IDLE
 * - ventilation_mode: Switch between auto/manual ventilation
 *
 * The backend forwards these updates to the MQTT broker,
 * which publishes to: protonest/<deviceId>/state/fmc/<topic>
 *
 * Used by: ControlsPanel for machine start/stop and ventilation control
 *
 * @param {string} deviceId - Factory device ID (e.g., "device_001")
 * @param {string} topic - State topic name ("machine_control" or "ventilation_mode")
 * @param {object} payload - Key-value pairs for the state update
 * @returns {Promise<Object>} Response confirming state update
 *
 * Example usage:
 * // Start the machine
 * await updateStateDetails("device_001", "machine_control", { status: "RUN" });
 *
 * // Switch ventilation to manual mode
 * await updateStateDetails("device_001", "ventilation_mode", { mode: "manual" });
 */
export const updateStateDetails = async (deviceId, topic, payload) => {
  try {
    console.log(
      `🎛️ [HTTP API] Updating state for ${deviceId}/${topic}:`,
      payload
    );

    const response = await api.post("/update-state-details", {
      deviceId,
      topic,
      payload,
    });

    if (response.data.status === "Success") {
      console.log(
        `✅ [HTTP API] Successfully updated ${topic} for ${deviceId}`
      );
    }

    return response.data;
  } catch (error) {
    console.error(
      `❌ [HTTP API] Failed to update state ${topic} for ${deviceId}:`,
      {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        endpoint: "/update-state-details",
        payload: payload,
      }
    );
    throw error;
  }
};

// ============================================
// TOPIC-SPECIFIC API FUNCTIONS
// ============================================
// These functions query individual sensor topics rather than all topics at once
// Useful for: debugging, specific sensor analysis, selective data loading

/**
 * Get historical stream data for a specific sensor topic
 *
 * Endpoint: POST /get-stream-data/device/topic
 *
 * Fetches time-series data for ONE specific sensor:
 * - vibration, pressure, temperature, humidity, noise, aqi, pm25, co2, units
 *
 * This is more targeted than getStreamDataForDevice() which fetches all topics.
 * Use this when you only need data for a specific sensor.
 *
 * @param {string} deviceId - Factory device ID (e.g., "device_001")
 * @param {string} topic - Sensor topic name (e.g., "vibration", "temperature")
 * @param {string} startTime - ISO-8601 format (e.g., "2025-10-24T00:00:00Z")
 * @param {string} endTime - ISO-8601 format (e.g., "2025-10-27T00:00:00Z")
 * @param {number} pagination - Page number (default: 0)
 * @param {number} pageSize - Records per page (default: 100)
 * @returns {Promise<Object>} Response with array of time-series data
 *
 * Example response:
 * {
 *   status: "Success",
 *   data: [
 *     {
 *       id: "d94a68a3-3d52-4333-a18a-6cb5a474856e",
 *       deviceId: "device_001",
 *       topicSuffix: "vibration",
 *       payload: "2.5",
 *       timestamp: "2025-10-25T18:53:10.980294Z"
 *     },
 *     ...
 *   ]
 * }
 */
export const getStreamDataByTopic = async (
  deviceId,
  topic,
  startTime,
  endTime,
  pagination = 0,
  pageSize = 100
) => {
  try {
    console.log(`📊 [HTTP API] Fetching ${topic} data for ${deviceId}`);
    console.log(`⏰ [HTTP API] Time range: ${startTime} to ${endTime}`);

    const response = await api.post("/get-stream-data/device/topic", {
      deviceId,
      topic,
      startTime,
      endTime,
      pagination: pagination.toString(), // API requires string format
      pageSize: pageSize.toString(), // API requires string format
    });

    if (response.data.status === "Success") {
      const recordCount = response.data.data?.length || 0;
      console.log(
        `✅ [HTTP API] Retrieved ${recordCount} records for ${topic}`
      );

      // Log sample record for debugging
      if (recordCount > 0) {
        console.log(
          `📋 [HTTP API] Sample ${topic} record:`,
          response.data.data[0]
        );
      }
    }

    return response.data;
  } catch (error) {
    console.error(
      `❌ [HTTP API] Failed to get ${topic} data for ${deviceId}:`,
      {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        endpoint: "/get-stream-data/device/topic",
      }
    );
    throw error;
  }
};

/**
 * Get current state value for a specific topic
 *
 * Endpoint: POST /get-state-details/device/topic
 *
 * Retrieves the current state for ONE specific topic:
 * - machine_control: Get current machine status (RUN/STOP/IDLE)
 * - ventilation_mode: Get current ventilation mode (auto/manual)
 *
 * This is more targeted than getStateDetailsForDevice() which fetches all states.
 * Use this when you only need one specific state value.
 *
 * @param {string} deviceId - Factory device ID (e.g., "device_001")
 * @param {string} topic - State topic name (e.g., "machine_control", "ventilation_mode")
 * @returns {Promise<Object>} Response with current state value
 *
 * Example response:
 * {
 *   status: "Success",
 *   data: {
 *     payload: {
 *       status: "RUN"
 *     },
 *     timestamp: "2025-10-25T22:54:02.649972915Z"
 *   }
 * }
 */
export const getStateDetailsByTopic = async (deviceId, topic) => {
  try {
    console.log(`🎛️ [HTTP API] Fetching ${topic} state for ${deviceId}`);

    const response = await api.post("/get-state-details/device/topic", {
      deviceId,
      topic,
    });

    if (response.data.status === "Success") {
      console.log(
        `✅ [HTTP API] Retrieved ${topic} state:`,
        response.data.data
      );
    }

    return response.data;
  } catch (error) {
    console.error(
      `❌ [HTTP API] Failed to get ${topic} state for ${deviceId}:`,
      {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        endpoint: "/get-state-details/device/topic",
      }
    );
    throw error;
  }
};

/**
 * Get the current production units count for a device from the backend
 *
 * This fetches the latest units value from the stream data.
 * Used to initialize the unit count when WebSocket connects.
 *
 * @param {string} deviceId - Factory device ID
 * @returns {Promise<number>} Current unit count from backend
 */
export const getCurrentUnitsFromBackend = async (deviceId) => {
  try {
    console.log(`📊 [HTTP API] Fetching current units for ${deviceId}`);

    // Get the most recent stream data to find current units
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const response = await api.post("/get-stream-data/device/topic", {
      deviceId,
      topicSuffix: "units",
      startTime: startOfDay.toISOString(),
      endTime: now.toISOString(),
      pagination: "0",
      pageSize: "1", // Only need the most recent
    });

    if (response.data.status === "Success" && response.data.data?.length > 0) {
      // Get the most recent units value
      const latestRecord = response.data.data[response.data.data.length - 1];
      const units = parseInt(latestRecord.payload, 10) || 0;
      console.log(`✅ [HTTP API] Current units from backend: ${units}`);
      return units;
    }

    console.log(
      `ℹ️ [HTTP API] No units data found for ${deviceId}, returning 0`
    );
    return 0;
  } catch (error) {
    console.error(
      `❌ [HTTP API] Failed to get current units for ${deviceId}:`,
      {
        status: error.response?.status,
        message: error.message,
      }
    );
    // Return 0 on error - don't throw, let the app continue
    return 0;
  }
};

// ============================================
// NOTES
// ============================================
//
// Threshold Management:
// - Sensor threshold alerts are managed in frontend localStorage only
// - No backend API available for threshold settings
// - Thresholds are checked in DashboardHome.jsx against real-time sensor data
//
// Data Flow Architecture:
// 1. Historical Data: HTTP API → getStreamDataForDevice() → Charts
// 2. Real-time Data: WebSocket → STOMP subscriptions → State updates → Displays
// 3. Control Commands: User interaction → updateStateDetails() → HTTP API → MQTT broker → Device
//
// MQTT Topic Format:
// - Stream data: protonest/<deviceId>/stream/<sensor>
//   Example: protonest/device_001/stream/vibration
// - State data: protonest/<deviceId>/state/<topic>
//   Example: protonest/device_001/state/machine_control
//
// Sensor Threshold Monitoring (Frontend only):
// - Vibration: Critical > 10 mm/s, Warning > 5 mm/s
// - Pressure: Critical < 95000 Pa or > 110000 Pa
// - Temperature: Critical > 40°C or < 10°C, Warning > 35°C
// - Humidity: Warning > 70%
// - Noise: Critical > 85 dB, Warning > 75 dB
// - AQI: Critical > 150, Warning > 100
// - PM2.5: Critical > 35 μg/m³, Warning > 25 μg/m³
// - CO2: Critical > 1000 ppm, Warning > 800 ppm
//
// ============================================
