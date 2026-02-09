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
 * The topic should be in format "fmc/<control>" (e.g., "fmc/machineControl", "fmc/ventilation")
 *
 * The backend forwards these updates to the MQTT broker,
 * which publishes to: protonest/<deviceId>/state/fmc/<topic>
 *
 * Used by: ControlsPanel for machine start/stop and ventilation control
 *
 * @param {string} deviceId - Factory device ID (e.g., "device_001")
 * @param {string} topic - State topic name (e.g., "machineControl", "ventilation") - auto-prefixed with "fmc/"
 * @param {object} payload - Key-value pairs for the state update
 * @returns {Promise<Object>} Response confirming state update
 *
 * Example usage:
 * // Start the machine
 * await updateStateDetails("device_001", "machineControl", { status: "RUN" });
 *
 * // Switch ventilation to manual mode
 * await updateStateDetails("device_001", "ventilation", { mode: "manual" });
 */
export const updateStateDetails = async (deviceId, topic, payload) => {
  try {
    // Ensure topic has the correct fmc/ prefix
    const formattedTopic = topic.startsWith("fmc/") ? topic : `fmc/${topic}`;

    console.log(
      `🎛️ [HTTP API] Updating state for ${deviceId}/${formattedTopic}:`,
      payload
    );

    const response = await api.post("/update-state-details", {
      deviceId,
      topic: formattedTopic,
      payload,
    });

    if (response.data.status === "Success") {
      console.log(
        `✅ [HTTP API] Successfully updated ${formattedTopic} for ${deviceId}`
      );
    }

    return response.data;
  } catch (error) {
    console.error(
      `❌ [HTTP API] Failed to update state ${formattedTopic} for ${deviceId}:`,
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
// MACHINE CONTROL API FUNCTIONS
// ============================================

/**
 * Send machine control command (RUN/STOP/IDLE) via HTTP API
 *
 * This sends a command to the machineControl state topic.
 * The backend receives this and publishes to MQTT for the device.
 *
 * Flow:
 *   Dashboard → HTTP POST /update-state-details → Backend → MQTT → Firmware
 *
 * MQTTX Testing:
 *   Topic: protonest/<deviceId>/state/fmc/machineControl
 *   Payload: {"status": "RUN"}
 *
 * @param {string} deviceId - Factory device ID (e.g., "devicetestuc")
 * @param {string} command - Machine command: "RUN", "STOP", or "IDLE"
 * @returns {Promise<Object>} Response from API
 *
 * @example
 * // Start the machine
 * await sendMachineCommand("devicetestuc", "RUN");
 *
 * // Stop the machine
 * await sendMachineCommand("devicetestuc", "STOP");
 *
 * // Set machine to idle
 * await sendMachineCommand("devicetestuc", "IDLE");
 */
export const sendMachineCommand = async (deviceId, command) => {
  // Validate command
  const validCommands = ["RUN", "STOP", "IDLE"];
  const normalizedCommand = command?.toUpperCase();

  if (!validCommands.includes(normalizedCommand)) {
    console.error(
      `❌ [Machine Control] Invalid command: ${command}. Valid commands: ${validCommands.join(", ")}`
    );
    throw new Error(`Invalid machine command: ${command}`);
  }

  if (!deviceId) {
    console.error("❌ [Machine Control] Device ID is required");
    throw new Error("Device ID is required for machine control");
  }

  console.log(`⚙️ [Machine Control] Sending ${normalizedCommand} command to ${deviceId}`);

  try {
    // Use updateStateDetails with machineControl topic
    const payload = {
      status: normalizedCommand,
      timestamp: new Date().toISOString(),
    };

    const response = await updateStateDetails(deviceId, "machineControl", payload);

    console.log(`✅ [Machine Control] Command ${normalizedCommand} sent successfully to ${deviceId}`);

    return response;
  } catch (error) {
    console.error(
      `❌ [Machine Control] Failed to send ${normalizedCommand} to ${deviceId}:`,
      {
        status: error.response?.status,
        message: error.message,
      }
    );
    throw error;
  }
};

/**
 * Send ventilation control command (ON/OFF/AUTO) via HTTP API
 *
 * @param {string} deviceId - Factory device ID
 * @param {string} state - "on", "off"
 * @param {string} mode - "manual" or "auto"
 * @returns {Promise<Object>} Response from API
 */
export const sendVentilationCommand = async (deviceId, state, mode = "manual") => {
  const validStates = ["on", "off"];
  const normalizedState = state?.toLowerCase();

  if (!validStates.includes(normalizedState)) {
    console.error(
      `❌ [Ventilation] Invalid state: ${state}. Valid states: ${validStates.join(", ")}`
    );
    throw new Error(`Invalid ventilation state: ${state}`);
  }

  if (!deviceId) {
    console.error("❌ [Ventilation] Device ID is required");
    throw new Error("Device ID is required for ventilation control");
  }

  console.log(`🌀 [Ventilation] Sending ${normalizedState} command to ${deviceId} (mode: ${mode})`);

  try {
    const payload = {
      ventilation: normalizedState,
      mode: mode,
      timestamp: new Date().toISOString(),
    };

    const response = await updateStateDetails(deviceId, "ventilation", payload);

    console.log(`✅ [Ventilation] Command ${normalizedState} sent successfully to ${deviceId}`);

    return response;
  } catch (error) {
    console.error(
      `❌ [Ventilation] Failed to send ${normalizedState} to ${deviceId}:`,
      {
        status: error.response?.status,
        message: error.message,
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
 * Topic format: "fmc/<sensor>" (e.g., "fmc/vibration", "fmc/temperature")
 *
 * This is more targeted than getStreamDataForDevice() which fetches all topics.
 * Use this when you only need data for a specific sensor.
 *
 * @param {string} deviceId - Factory device ID (e.g., "device_001")
 * @param {string} topic - Sensor topic name (e.g., "vibration", "temperature") - auto-prefixed with "fmc/"
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
 *       topicSuffix: "fmc/vibration",
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
    // Ensure topic has the correct fmc/ prefix
    const formattedTopic = topic.startsWith("fmc/") ? topic : `fmc/${topic}`;

    console.log(
      `📊 [HTTP API] Fetching ${formattedTopic} data for ${deviceId}`
    );
    console.log(`⏰ [HTTP API] Time range: ${startTime} to ${endTime}`);

    const response = await api.post("/get-stream-data/device/topic", {
      deviceId,
      topic: formattedTopic,
      startTime,
      endTime,
      pagination: pagination.toString(), // API requires string format
      pageSize: pageSize.toString(), // API requires string format
    });

    if (response.data.status === "Success") {
      const recordCount = response.data.data?.length || 0;
      console.log(
        `✅ [HTTP API] Retrieved ${recordCount} records for ${formattedTopic}`
      );

      // Log sample record for debugging
      if (recordCount > 0) {
        console.log(
          `📋 [HTTP API] Sample ${formattedTopic} record:`,
          response.data.data[0]
        );
      }
    }

    return response.data;
  } catch (error) {
    console.error(
      `❌ [HTTP API] Failed to get ${formattedTopic} data for ${deviceId}:`,
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
 * - machineControl: Get current machine status (RUN/STOP/IDLE)
 * - ventilation: Get current ventilation mode (auto/manual)
 *
 * Topic format: "fmc/<control>" (e.g., "fmc/machineControl", "fmc/ventilation")
 *
 * This is more targeted than getStateDetailsForDevice() which fetches all states.
 * Use this when you only need one specific state value.
 *
 * @param {string} deviceId - Factory device ID (e.g., "device_001")
 * @param {string} topic - State topic name (e.g., "machineControl", "ventilation") - auto-prefixed with "fmc/"
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
    // Ensure topic has the correct fmc/ prefix
    const formattedTopic = topic.startsWith("fmc/") ? topic : `fmc/${topic}`;

    console.log(
      `🎛️ [HTTP API] Fetching ${formattedTopic} state for ${deviceId}`
    );

    const response = await api.post("/get-state-details/device/topic", {
      deviceId,
      topic: formattedTopic,
    });

    if (response.data.status === "Success") {
      console.log(
        `✅ [HTTP API] Retrieved ${formattedTopic} state:`,
        response.data.data
      );
    }

    return response.data;
  } catch (error) {
    console.error(
      `❌ [HTTP API] Failed to get ${formattedTopic} state for ${deviceId}:`,
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
 * This fetches all product records from the last 24 hours and counts them.
 * Units = count of products produced within 24 hours.
 * 
 * NOTE: We no longer use a direct 'units' stream topic. Instead:
 * 1. Firmware publishes each product to 'fmc/product' topic
 * 2. Dashboard fetches product records via HTTP API
 * 3. Dashboard counts products = unit count for 24 hours
 *
 * @param {string} deviceId - Factory device ID
 * @returns {Promise<number>} Current unit count (product count in 24 hours)
 */
export const getCurrentUnitsFromBackend = async (deviceId) => {
  try {
    console.log(`📊 [HTTP API] Fetching products for ${deviceId} to calculate units`);

    // Get products from the last 24 hours
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const response = await api.post("/get-stream-data/device/topic", {
      deviceId,
      topic: "fmc/product", // Fetch product records, not units
      startTime: twentyFourHoursAgo.toISOString(),
      endTime: now.toISOString(),
      pagination: "0",
      pageSize: "10000", // Get all products in 24 hours
    });

    if (response.data.status === "Success" && response.data.data?.length > 0) {
      // Count the number of product records = units produced
      const productCount = response.data.data.length;
      console.log(`✅ [HTTP API] Products in 24hrs: ${productCount} -> Units: ${productCount}`);
      return productCount;
    }

    console.log(
      `ℹ️ [HTTP API] No product data found for ${deviceId} in last 24 hours, returning 0 units`
    );
    return 0;
  } catch (error) {
    console.error(
      `❌ [HTTP API] Failed to get products/units for ${deviceId}:`,
      {
        status: error.response?.status,
        message: error.message,
      }
    );
    // Return 0 on error - don't throw, let the app continue
    return 0;
  }
};

/**
 * Get detailed product list for a device from the last 24 hours
 *
 * @param {string} deviceId - Factory device ID
 * @returns {Promise<{count: number, products: Array}>} Product count and list
 */
export const getProductsIn24Hours = async (deviceId) => {
  try {
    console.log(`📦 [HTTP API] Fetching product details for ${deviceId}`);

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const response = await api.post("/get-stream-data/device/topic", {
      deviceId,
      topic: "fmc/product",
      startTime: twentyFourHoursAgo.toISOString(),
      endTime: now.toISOString(),
      pagination: "0",
      pageSize: "10000",
    });

    if (response.data.status === "Success" && response.data.data?.length > 0) {
      const products = response.data.data.map((record, index) => ({
        id: index + 1,
        productID: record.payload?.productID || record.payload?.productId || `PROD-${index + 1}`,
        productName: record.payload?.productName || "Unknown Product",
        timestamp: record.timestamp,
        date: new Date(record.timestamp).toLocaleDateString(),
        time: new Date(record.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      }));

      console.log(`✅ [HTTP API] Retrieved ${products.length} products for ${deviceId}`);
      
      return {
        count: products.length,
        products: products,
      };
    }

    console.log(`ℹ️ [HTTP API] No products found for ${deviceId}`);
    return { count: 0, products: [] };
  } catch (error) {
    console.error(`❌ [HTTP API] Failed to get products for ${deviceId}:`, {
      status: error.response?.status,
      message: error.message,
    });
    return { count: 0, products: [] };
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
// MQTT Topic Format (for API calls):
// - Stream data topic: "fmc/<sensor>" (e.g., "fmc/vibration", "fmc/temperature", "fmc/product")
// - State data topic: "fmc/<control>" (e.g., "fmc/machineControl", "fmc/ventilation")
//
// Full MQTT Paths (on broker):
// - Stream: protonest/<deviceId>/stream/fmc/<sensor>
// - State: protonest/<deviceId>/state/fmc/<control>
//
// ═══════════════════════════════════════════════════════════════════════
// UNIT COUNT CALCULATION (Product-Based)
// ═══════════════════════════════════════════════════════════════════════
// 
// Units are NOT from a direct 'fmc/units' topic. Instead:
// 1. Firmware publishes each product scan to 'fmc/product' topic
// 2. Dashboard fetches products via HTTP API for last 24 hours
// 3. Dashboard counts product records = unit count
//
// Flow:
//   Firmware → MQTT (fmc/product) → Backend Storage
//   Dashboard → HTTP GET (fmc/product, 24hrs) → count() = Units
//
// Function: getCurrentUnitsFromBackend(deviceId)
//   - Fetches products from last 24 hours
//   - Returns: number of products = unit count
//
// ═══════════════════════════════════════════════════════════════════════
// MACHINE CONTROL (State Topic)
// ═══════════════════════════════════════════════════════════════════════
//
// Topic: protonest/<deviceId>/state/fmc/machineControl
// Payloads: {"status": "RUN"}, {"status": "STOP"}, {"status": "IDLE"}
//
// Flow:
//   1. User clicks button on Dashboard
//   2. Dashboard calls: updateStateDetails(deviceId, "machineControl", {status: "RUN"})
//   3. HTTP POST /update-state-details sends to backend
//   4. ProtoNest publishes to MQTT: protonest/<deviceId>/state/fmc/machineControl
//   5. Firmware receives command via MQTT subscription
//   6. Firmware executes: startMachine(), stopMachine(), or setIdle()
//
// Testing with MQTTX:
//   1. Subscribe to: protonest/<deviceId>/state/fmc/#
//   2. Publish to: protonest/<deviceId>/state/fmc/machineControl
//      Payload: {"status": "RUN"}
//   3. Firmware should receive and execute command
//
// ═══════════════════════════════════════════════════════════════════════
//
// Sensor Threshold Monitoring (Frontend only):
// - Vibration: Critical > 10 mm/s, Warning > 5 mm/s
// - Pressure: Critical > 8 bar or < 0.5 bar, Warning > 6 bar
// - Temperature: Critical > 40°C or < 10°C, Warning > 35°C
// - Humidity: Warning > 70%
// - Noise: Critical > 85 dB, Warning > 75 dB
// - CO2: Critical > 70%, Warning > 45%
//
// ============================================

