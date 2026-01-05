// ============================================
// FACTORY MANAGEMENT SYSTEM - HISTORICAL DATA SERVICE
// ============================================
// Specialized service for historical data fetching and calculations
// Handles all 6 historical analysis indicators:
// 1. Production Volume Trends (HTTP API)
// 2. OEE Trends (Calculated Locally + localStorage)
// 3. Machine Performance Trends (HTTP API)
// 4. Environmental Trends (HTTP API)
// 5. Downtime Causes - Pareto Analysis (Calculated Locally + localStorage)
// 6. Detailed Event Log (HTTP API)
// ============================================

import api from "./api.js";

// ============================================
// DATE/TIME UTILITIES
// ============================================

/**
 * Format date to ISO-8601 without milliseconds
 * Required format: 2025-10-24T00:00:00Z
 */
export const formatISODate = (date) => {
  return date.toISOString().split(".")[0] + "Z";
};

/**
 * Calculate time range based on preset strings
 * @param {string} range - '1m', '5m', '15m', '1h', '6h', '24h', '7d', '30d'
 * @returns {{ startTime: string, endTime: string }}
 */
export const getTimeRange = (range) => {
  const now = new Date();
  let startDate;

  const rangeMs = {
    '1m': 1 * 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };

  startDate = new Date(now.getTime() - (rangeMs[range] || rangeMs['24h']));

  return {
    startTime: formatISODate(startDate),
    endTime: formatISODate(now),
  };
};

// ============================================
// HTTP API FUNCTIONS
// ============================================

/**
 * Get stream data for a specific device and topic
 * POST /get-stream-data/device/topic
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
    console.log(`📊 [Historical] Fetching ${topic} data for ${deviceId}`);
    console.log(`⏰ [Historical] Time range: ${startTime} to ${endTime}`);

    const response = await api.post("/get-stream-data/device/topic", {
      deviceId,
      topic,
      startTime,
      endTime,
      pagination: String(pagination),
      pageSize: String(pageSize),
    });

    if (response.data.status === "Success") {
      const recordCount = response.data.data?.length || 0;
      console.log(`✅ [Historical] Retrieved ${recordCount} records for ${topic}`);
      return response.data.data || [];
    }

    return [];
  } catch (error) {
    console.warn(`⚠️ [Historical] Error fetching ${topic}:`, {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
    });
    return []; // Return empty array to allow other requests to continue
  }
};

/**
 * Get all stream data for a device (all topics)
 * POST /get-stream-data/device
 */
export const getStreamDataForDevice = async (
  deviceId,
  startTime,
  endTime,
  pagination = 0,
  pageSize = 100
) => {
  try {
    console.log(`📊 [Historical] Fetching all stream data for ${deviceId}`);

    const response = await api.post("/get-stream-data/device", {
      deviceId,
      startTime,
      endTime,
      pagination: String(pagination),
      pageSize: String(pageSize),
    });

    if (response.data.status === "Success") {
      console.log(`✅ [Historical] Retrieved ${response.data.data?.length || 0} records`);
      return response.data.data || [];
    }

    return [];
  } catch (error) {
    console.warn(`⚠️ [Historical] Error fetching device data:`, {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
    });
    return [];
  }
};

/**
 * Get stream data for current user (all devices)
 * POST /get-stream-data/user
 */
export const getStreamDataForUser = async (
  startTime,
  endTime,
  pagination = 0,
  pageSize = 100
) => {
  try {
    console.log(`📊 [Historical] Fetching user stream data`);

    const response = await api.post("/get-stream-data/user", {
      startTime,
      endTime,
      pagination: String(pagination),
      pageSize: String(pageSize),
    });

    if (response.data.status === "Success") {
      console.log(`✅ [Historical] Retrieved ${response.data.data?.length || 0} user records`);
      return response.data.data || [];
    }

    return [];
  } catch (error) {
    console.warn(`⚠️ [Historical] Error fetching user data:`, error.message);
    return [];
  }
};

/**
 * Delete stream data by IDs
 * DELETE /delete-stream-data-by-id
 */
export const deleteStreamDataById = async (deviceId, topic, dataIds) => {
  try {
    console.log(`🗑️ [Historical] Deleting ${dataIds.length} records for ${deviceId}/${topic}`);

    const response = await api.delete("/delete-stream-data-by-id", {
      data: {
        deviceId,
        topic,
        dataIds,
      },
    });

    if (response.data.status === "Success") {
      console.log(`✅ [Historical] Successfully deleted records`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ [Historical] Error deleting records:`, error.message);
    throw error;
  }
};

/**
 * Delete state topic
 * DELETE /delete-state-topic
 */
export const deleteStateTopic = async (deviceId, topic) => {
  try {
    console.log(`🗑️ [Historical] Deleting state topic ${topic} for ${deviceId}`);

    const response = await api.delete("/delete-state-topic", {
      data: {
        deviceId,
        topic,
      },
    });

    if (response.data.status === "Success") {
      console.log(`✅ [Historical] Successfully deleted state topic`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ [Historical] Error deleting state topic:`, error.message);
    throw error;
  }
};

// ============================================
// PRODUCTION VOLUME DATA
// ============================================

/**
 * Fetch production volume data (units topic)
 * @param {string} deviceId 
 * @param {string} startTime 
 * @param {string} endTime 
 * @returns {Promise<Array>} Array of { date, produced, target }
 */
export const getProductionVolumeData = async (deviceId, startTime, endTime) => {
  try {
    const data = await getStreamDataByTopic(deviceId, "units", startTime, endTime, 0, 500);
    
    // Group data by date
    const dailyData = new Map();
    
    data.forEach((record) => {
      const timestamp = record.timestamp || record.time;
      const date = timestamp ? timestamp.split("T")[0] : new Date().toISOString().split("T")[0];
      
      let value = 0;
      if (record.payload) {
        try {
          const parsed = typeof record.payload === "string" ? JSON.parse(record.payload) : record.payload;
          value = Number(parsed.units || parsed.value || parsed) || 0;
        } catch {
          value = Number(record.payload) || 0;
        }
      } else if (record.value !== undefined) {
        value = Number(record.value) || 0;
      }
      
      if (!dailyData.has(date)) {
        dailyData.set(date, { date, produced: 0, target: 1024 }); // Default target 1024
      }
      
      dailyData.get(date).produced += value;
    });
    
    // Convert to sorted array
    const result = Array.from(dailyData.values()).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    console.log(`📊 [Production] Processed ${result.length} daily production records`);
    return result;
  } catch (error) {
    console.error(`❌ [Production] Error:`, error.message);
    return [];
  }
};

// ============================================
// OEE CALCULATION & STORAGE
// ============================================

const OEE_STORAGE_KEY = "factory_oee_history";
const MTBF_STORAGE_KEY = "factory_mtbf_data";

/**
 * OEE (Overall Equipment Effectiveness) Calculation
 * OEE = Availability × Performance × Quality
 * 
 * - Availability = Run Time / Planned Production Time
 * - Performance = (Ideal Cycle Time × Total Count) / Run Time
 * - Quality = Good Count / Total Count
 * 
 * Initially 0 until data is available
 */
export const calculateOEE = (availability, performance, quality) => {
  // All values should be between 0 and 1 (or 0 and 100 as percentages)
  const a = Math.min(availability, 100) / 100;
  const p = Math.min(performance, 100) / 100;
  const q = Math.min(quality, 100) / 100;
  
  return (a * p * q) * 100; // Return as percentage
};

/**
 * Get OEE history from localStorage
 */
export const getOEEHistory = () => {
  try {
    const stored = localStorage.getItem(OEE_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error reading OEE history:", error);
  }
  return [];
};

/**
 * Save OEE data point to localStorage
 */
export const saveOEEDataPoint = (dataPoint) => {
  try {
    const history = getOEEHistory();
    
    // Add new data point
    history.push({
      ...dataPoint,
      timestamp: dataPoint.timestamp || new Date().toISOString(),
    });
    
    // Keep only last 100 data points
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    localStorage.setItem(OEE_STORAGE_KEY, JSON.stringify(history));
    console.log(`💾 [OEE] Saved data point. Total: ${history.length}`);
    return history;
  } catch (error) {
    console.error("Error saving OEE data:", error);
    return [];
  }
};

/**
 * Calculate OEE from real-time production data
 * This should be called when production data updates
 */
export const calculateAndStoreOEE = (productionData, machineState = {}) => {
  const {
    totalUnits = 0,
    goodUnits = 0,
    plannedTime = 480, // Default 8 hours in minutes
    runTime = 0,
    idealCycleTime = 1, // minutes per unit
  } = productionData;
  
  // Calculate components
  const availability = plannedTime > 0 ? (runTime / plannedTime) * 100 : 0;
  const performance = runTime > 0 ? ((idealCycleTime * totalUnits) / runTime) * 100 : 0;
  const quality = totalUnits > 0 ? (goodUnits / totalUnits) * 100 : 100;
  
  const oee = calculateOEE(availability, performance, quality);
  
  const dataPoint = {
    week: new Date().toISOString().split("T")[0],
    oee: Math.round(oee * 10) / 10, // Round to 1 decimal
    availability: Math.round(availability * 10) / 10,
    performance: Math.round(performance * 10) / 10,
    quality: Math.round(quality * 10) / 10,
    machineState: machineState.status || 'unknown',
  };
  
  return saveOEEDataPoint(dataPoint);
};

/**
 * Get OEE data for chart visualization
 * Aggregates by week
 */
export const getOEEChartData = () => {
  const history = getOEEHistory();
  
  if (history.length === 0) {
    // Return initial state with 0 OEE
    return [{
      week: new Date().toISOString().split("T")[0],
      oee: 0,
    }];
  }
  
  // Group by week
  const weeklyData = new Map();
  
  history.forEach((record) => {
    const date = new Date(record.timestamp || record.week);
    // Get start of week (Sunday)
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    const weekKey = startOfWeek.toISOString().split("T")[0];
    
    if (!weeklyData.has(weekKey)) {
      weeklyData.set(weekKey, { week: weekKey, oeeSum: 0, count: 0 });
    }
    
    const week = weeklyData.get(weekKey);
    week.oeeSum += record.oee || 0;
    week.count += 1;
  });
  
  // Calculate averages and sort
  return Array.from(weeklyData.values())
    .map((w) => ({
      week: w.week,
      oee: Math.round((w.oeeSum / w.count) * 10) / 10,
    }))
    .sort((a, b) => new Date(a.week) - new Date(b.week));
};

// ============================================
// MTBF (Mean Time Between Failures) CALCULATION
// ============================================

/**
 * Get MTBF history from localStorage
 */
export const getMTBFData = () => {
  try {
    const stored = localStorage.getItem(MTBF_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error reading MTBF data:", error);
  }
  return { failures: [], lastCalculated: null, mtbf: 0 };
};

/**
 * Record a failure event
 */
export const recordFailure = (deviceId, failureType, timestamp = new Date().toISOString()) => {
  try {
    const data = getMTBFData();
    
    data.failures.push({
      deviceId,
      failureType,
      timestamp,
    });
    
    // Keep only last 50 failures
    if (data.failures.length > 50) {
      data.failures.splice(0, data.failures.length - 50);
    }
    
    // Recalculate MTBF
    if (data.failures.length >= 2) {
      const sortedFailures = [...data.failures].sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );
      
      let totalTime = 0;
      for (let i = 1; i < sortedFailures.length; i++) {
        const diff = new Date(sortedFailures[i].timestamp) - new Date(sortedFailures[i - 1].timestamp);
        totalTime += diff;
      }
      
      // MTBF in hours
      data.mtbf = Math.round((totalTime / (sortedFailures.length - 1) / (1000 * 60 * 60)) * 10) / 10;
    }
    
    data.lastCalculated = new Date().toISOString();
    localStorage.setItem(MTBF_STORAGE_KEY, JSON.stringify(data));
    
    console.log(`💾 [MTBF] Recorded failure. MTBF: ${data.mtbf} hours`);
    return data;
  } catch (error) {
    console.error("Error recording failure:", error);
    return { failures: [], mtbf: 0 };
  }
};

/**
 * Get current MTBF value
 */
export const getMTBFHours = () => {
  const data = getMTBFData();
  return data.mtbf || 0;
};

// ============================================
// DOWNTIME CAUSES (PARETO ANALYSIS)
// ============================================

const DOWNTIME_STORAGE_KEY = "factory_downtime_causes";

/**
 * Get downtime history from localStorage
 */
export const getDowntimeHistory = () => {
  try {
    const stored = localStorage.getItem(DOWNTIME_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error reading downtime history:", error);
  }
  return [];
};

/**
 * Record a downtime event
 */
export const recordDowntimeEvent = (
  deviceId,
  cause,
  durationMinutes = 0,
  timestamp = new Date().toISOString()
) => {
  try {
    const history = getDowntimeHistory();
    
    history.push({
      deviceId,
      cause,
      duration: durationMinutes,
      timestamp,
    });
    
    // Keep only last 200 events
    if (history.length > 200) {
      history.splice(0, history.length - 200);
    }
    
    localStorage.setItem(DOWNTIME_STORAGE_KEY, JSON.stringify(history));
    console.log(`💾 [Downtime] Recorded: ${cause} (${durationMinutes} mins)`);
    return history;
  } catch (error) {
    console.error("Error recording downtime:", error);
    return [];
  }
};

/**
 * Get downtime causes aggregated for Pareto chart
 * Returns sorted by occurrences (descending)
 */
export const getDowntimeParetoData = () => {
  const history = getDowntimeHistory();
  
  if (history.length === 0) {
    // Return default categories with 0 occurrences
    return [
      { cause: "Equipment Failure", occurrences: 0 },
      { cause: "Material Shortage", occurrences: 0 },
      { cause: "Planned Maintenance", occurrences: 0 },
      { cause: "Power Outage", occurrences: 0 },
      { cause: "Quality Issue", occurrences: 0 },
      { cause: "Operator Error", occurrences: 0 },
    ];
  }
  
  // Aggregate by cause
  const causeCounts = new Map();
  
  history.forEach((event) => {
    const cause = event.cause || "Unknown";
    if (!causeCounts.has(cause)) {
      causeCounts.set(cause, { cause, occurrences: 0, totalDuration: 0 });
    }
    const entry = causeCounts.get(cause);
    entry.occurrences += 1;
    entry.totalDuration += event.duration || 0;
  });
  
  // Sort by occurrences (Pareto - highest first)
  return Array.from(causeCounts.values())
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 10); // Top 10 causes
};

/**
 * Analyze alerts to detect downtime causes
 * This should be called when alerts are received
 */
export const analyzeAlertForDowntime = (alert, deviceId) => {
  if (!alert) return;
  
  const message = (alert.msg || alert.message || "").toLowerCase();
  const severity = alert.severity || "info";
  
  let cause = null;
  
  // Map alert patterns to downtime causes
  if (message.includes("vibration") && severity === "critical") {
    cause = "Equipment Failure";
  } else if (message.includes("temperature") && message.includes("high")) {
    cause = "Overheating";
  } else if (message.includes("pressure") && message.includes("low")) {
    cause = "Pressure Loss";
  } else if (message.includes("maintenance") || message.includes("scheduled")) {
    cause = "Planned Maintenance";
  } else if (message.includes("material") || message.includes("supply")) {
    cause = "Material Shortage";
  } else if (message.includes("power")) {
    cause = "Power Outage";
  } else if (message.includes("quality") || message.includes("defect")) {
    cause = "Quality Issue";
  } else if (severity === "critical") {
    cause = "Critical Alert";
  }
  
  if (cause) {
    recordDowntimeEvent(deviceId, cause, 5); // Default 5 min duration
    recordFailure(deviceId, cause);
    return cause;
  }
  
  return null;
};

// ============================================
// MACHINE PERFORMANCE DATA
// ============================================

/**
 * Fetch machine performance metrics (vibration, pressure, noise)
 */
export const getMachinePerformanceData = async (deviceId, startTime, endTime) => {
  try {
    const topics = ["vibration", "pressure", "noise"];
    
    console.log(`📊 [Machine] Fetching performance data for ${deviceId}`);
    
    // Fetch all topics in parallel
    const results = await Promise.allSettled(
      topics.map((topic) => getStreamDataByTopic(deviceId, topic, startTime, endTime, 0, 200))
    );
    
    // Organize by timestamp
    const dataByTime = new Map();
    
    results.forEach((result, index) => {
      const topic = topics[index];
      
      if (result.status === "fulfilled" && Array.isArray(result.value)) {
        result.value.forEach((record) => {
          const timestamp = record.timestamp || record.time;
          const time = timestamp 
            ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '';
          
          if (!dataByTime.has(timestamp)) {
            dataByTime.set(timestamp, {
              time,
              timestamp,
              vibration: null,
              pressure: null,
              noise: null,
            });
          }
          
          let value = null;
          if (record.payload) {
            try {
              const parsed = typeof record.payload === "string" ? JSON.parse(record.payload) : record.payload;
              value = Number(parsed[topic] || parsed.value || parsed) || null;
            } catch {
              value = Number(record.payload) || null;
            }
          } else if (record.value !== undefined) {
            value = Number(record.value) || null;
          }
          
          dataByTime.get(timestamp)[topic] = value;
        });
      }
    });
    
    // Convert to sorted array
    const result = Array.from(dataByTime.values())
      .filter((d) => d.timestamp)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    console.log(`✅ [Machine] Processed ${result.length} performance records`);
    return result;
  } catch (error) {
    console.error(`❌ [Machine] Error:`, error.message);
    return [];
  }
};

// ============================================
// ENVIRONMENTAL TRENDS DATA
// ============================================

/**
 * Fetch environmental metrics (temperature, humidity, co2, aqi)
 */
export const getEnvironmentalData = async (deviceId, startTime, endTime) => {
  try {
    const topics = ["temperature", "humidity", "co2", "aqi"];
    
    console.log(`🌡️ [Environment] Fetching data for ${deviceId}`);
    
    // Fetch all topics in parallel
    const results = await Promise.allSettled(
      topics.map((topic) => getStreamDataByTopic(deviceId, topic, startTime, endTime, 0, 200))
    );
    
    // Organize by timestamp
    const dataByTime = new Map();
    
    results.forEach((result, index) => {
      const topic = topics[index];
      
      if (result.status === "fulfilled" && Array.isArray(result.value)) {
        result.value.forEach((record) => {
          const timestamp = record.timestamp || record.time;
          const time = timestamp 
            ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '';
          
          if (!dataByTime.has(timestamp)) {
            dataByTime.set(timestamp, {
              time,
              timestamp,
              temperature: null,
              humidity: null,
              co2: null,
              aqi: null,
            });
          }
          
          let value = null;
          if (record.payload) {
            try {
              const parsed = typeof record.payload === "string" ? JSON.parse(record.payload) : record.payload;
              value = Number(parsed[topic] || parsed.value || parsed) || null;
            } catch {
              value = Number(record.payload) || null;
            }
          } else if (record.value !== undefined) {
            value = Number(record.value) || null;
          }
          
          dataByTime.get(timestamp)[topic] = value;
        });
      }
    });
    
    // Convert to sorted array
    const result = Array.from(dataByTime.values())
      .filter((d) => d.timestamp)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    console.log(`✅ [Environment] Processed ${result.length} environmental records`);
    return result;
  } catch (error) {
    console.error(`❌ [Environment] Error:`, error.message);
    return [];
  }
};

// ============================================
// EVENT LOG DATA
// ============================================

/**
 * Format alerts as event log data
 * Events are derived from alerts + system events
 */
export const formatAlertsAsEventLog = (alerts = []) => {
  return alerts.map((alert) => ({
    timestamp: alert.time || alert.timestamp || new Date().toISOString(),
    severity: alert.severity || 'info',
    device: alert.deviceId || '',
    event: alert.msg || alert.message || '',
    code: alert.sensorType || alert.code || '',
  }));
};

// ============================================
// COMBINED DATA FETCH
// ============================================

/**
 * Fetch all historical data for charts
 * Returns structured data for all 6 indicators
 */
export const fetchAllHistoricalData = async (deviceId, timeRange = '24h') => {
  const { startTime, endTime } = getTimeRange(timeRange);
  
  console.log(`📊 [Historical] Fetching all data for ${deviceId}`);
  console.log(`⏰ [Historical] Range: ${timeRange} (${startTime} to ${endTime})`);
  
  try {
    // Fetch HTTP data in parallel
    const [productionData, machineData, envData] = await Promise.all([
      getProductionVolumeData(deviceId, startTime, endTime),
      getMachinePerformanceData(deviceId, startTime, endTime),
      getEnvironmentalData(deviceId, startTime, endTime),
    ]);
    
    // Get localStorage data
    const oeeData = getOEEChartData();
    const downtimeData = getDowntimeParetoData();
    const mtbf = getMTBFHours();
    
    return {
      productionData,
      machinePerformanceData: machineData,
      environmentalData: envData,
      oeeData,
      downtimeData,
      mtbf,
      startTime,
      endTime,
    };
  } catch (error) {
    console.error(`❌ [Historical] Error fetching data:`, error);
    throw error;
  }
};

export default {
  // Time utilities
  formatISODate,
  getTimeRange,
  
  // HTTP API functions
  getStreamDataByTopic,
  getStreamDataForDevice,
  getStreamDataForUser,
  deleteStreamDataById,
  deleteStateTopic,
  
  // Production data
  getProductionVolumeData,
  
  // OEE functions
  calculateOEE,
  getOEEHistory,
  saveOEEDataPoint,
  calculateAndStoreOEE,
  getOEEChartData,
  
  // MTBF functions
  getMTBFData,
  recordFailure,
  getMTBFHours,
  
  // Downtime functions
  getDowntimeHistory,
  recordDowntimeEvent,
  getDowntimeParetoData,
  analyzeAlertForDowntime,
  
  // Machine & Environment data
  getMachinePerformanceData,
  getEnvironmentalData,
  
  // Event log
  formatAlertsAsEventLog,
  
  // Combined fetch
  fetchAllHistoricalData,
};
