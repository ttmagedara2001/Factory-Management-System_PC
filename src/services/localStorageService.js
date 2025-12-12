/**
 * Local Storage Service for Factory Dashboard
 * Manages historical sensor and production data with automatic expiration
 */

// Storage keys
const STORAGE_KEYS = {
  SENSOR_DATA: "factory_sensor_data",
  PRODUCTION_DATA: "factory_production_data",
  PRODUCTION_LOGS: "factory_production_logs",
};

// Retention periods (in milliseconds)
const RETENTION = {
  SENSOR_DATA: 24 * 60 * 60 * 1000, // 24 hours
  PRODUCTION_DATA: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * Get data from localStorage with automatic expiration cleanup
 * @param {string} key - Storage key
 * @param {number} maxAge - Maximum age in milliseconds
 * @returns {Array} - Array of valid (non-expired) data entries
 */
const getDataWithExpiration = (key, maxAge) => {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return [];

    const data = JSON.parse(stored);
    const now = Date.now();
    const cutoffTime = now - maxAge;

    // Filter out expired entries
    const validData = data.filter((entry) => {
      const entryTime = new Date(entry.timestamp).getTime();
      return entryTime > cutoffTime;
    });

    // If data was cleaned up, save the filtered version
    if (validData.length !== data.length) {
      localStorage.setItem(key, JSON.stringify(validData));
      console.log(
        `🧹 Cleaned up ${
          data.length - validData.length
        } expired entries from ${key}`
      );
    }

    return validData;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return [];
  }
};

/**
 * Save data to localStorage with size limit protection
 * @param {string} key - Storage key
 * @param {Array} newData - New data entries to append
 * @param {number} maxAge - Maximum age in milliseconds
 * @param {number} maxEntries - Maximum number of entries to keep
 */
const saveDataWithLimit = (key, newData, maxAge, maxEntries = 10000) => {
  try {
    // Get existing data (already filtered by expiration)
    const existingData = getDataWithExpiration(key, maxAge);

    // Append new data
    const updatedData = [...newData, ...existingData];

    // Limit total entries to prevent localStorage overflow
    const limitedData = updatedData.slice(0, maxEntries);

    // Save to localStorage
    localStorage.setItem(key, JSON.stringify(limitedData));

    if (limitedData.length < updatedData.length) {
      console.warn(
        `⚠️ ${key} exceeded ${maxEntries} entries, oldest data was removed`
      );
    }
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);

    // If quota exceeded, try to clear old data and retry
    if (error.name === "QuotaExceededError") {
      console.warn("LocalStorage quota exceeded, clearing old data...");
      clearOldData(key, maxAge, Math.floor(maxEntries / 2));

      // Retry with reduced data
      try {
        localStorage.setItem(
          key,
          JSON.stringify(newData.slice(0, Math.floor(maxEntries / 2)))
        );
      } catch (retryError) {
        console.error("Failed to save even after cleanup:", retryError);
      }
    }
  }
};

/**
 * Clear old data keeping only recent entries
 * @param {string} key - Storage key
 * @param {number} maxAge - Maximum age in milliseconds
 * @param {number} keepCount - Number of recent entries to keep
 */
const clearOldData = (key, maxAge, keepCount) => {
  try {
    const data = getDataWithExpiration(key, maxAge);
    const recentData = data.slice(0, keepCount);
    localStorage.setItem(key, JSON.stringify(recentData));
    console.log(
      `🧹 Cleared old data from ${key}, kept ${recentData.length} recent entries`
    );
  } catch (error) {
    console.error(`Error clearing old data from ${key}:`, error);
  }
};

// ============================================
// SENSOR DATA METHODS (24 hour retention)
// ============================================

/**
 * Get all sensor data for a specific device (last 24 hours)
 * @param {string} deviceId - Device ID
 * @returns {Array} - Array of sensor readings
 */
export const getSensorData = (deviceId) => {
  const allData = getDataWithExpiration(
    STORAGE_KEYS.SENSOR_DATA,
    RETENTION.SENSOR_DATA
  );

  // Filter by device ID if specified
  if (deviceId) {
    return allData.filter((entry) => entry.deviceId === deviceId);
  }

  return allData;
};

/**
 * Save new sensor reading to localStorage
 * @param {string} deviceId - Device ID
 * @param {string} sensorType - Sensor type (vibration, temperature, etc.)
 * @param {any} value - Sensor value
 * @param {string} timestamp - ISO timestamp
 */
export const saveSensorData = (deviceId, sensorType, value, timestamp) => {
  const newEntry = {
    deviceId,
    sensorType,
    value,
    timestamp: timestamp || new Date().toISOString(),
  };

  // Get existing data
  const existingData = getDataWithExpiration(
    STORAGE_KEYS.SENSOR_DATA,
    RETENTION.SENSOR_DATA
  );

  // Add new entry at the beginning
  const updatedData = [newEntry, ...existingData];

  // Save with limit (max 10000 entries ≈ 24hrs of data at 5-30 sec intervals)
  saveDataWithLimit(
    STORAGE_KEYS.SENSOR_DATA,
    [newEntry],
    RETENTION.SENSOR_DATA,
    10000
  );
};

/**
 * Get sensor data grouped by sensor type for charting
 * @param {string} deviceId - Device ID
 * @returns {Object} - Object with sensor types as keys and arrays of readings
 */
export const getSensorDataGrouped = (deviceId) => {
  const data = getSensorData(deviceId);

  const grouped = {};
  data.forEach((entry) => {
    if (!grouped[entry.sensorType]) {
      grouped[entry.sensorType] = [];
    }
    grouped[entry.sensorType].push({
      timestamp: entry.timestamp,
      value: entry.value,
    });
  });

  return grouped;
};

/**
 * Get sensor data for chart display (machine monitoring)
 * @param {string} deviceId - Device ID
 * @returns {Array} - Array formatted for chart display
 */
export const getSensorChartData = (deviceId) => {
  const data = getSensorData(deviceId);

  // Group by timestamp for multi-sensor chart
  const chartData = {};

  data.forEach((entry) => {
    const timestamp = entry.timestamp;

    if (!chartData[timestamp]) {
      chartData[timestamp] = { timestamp };
    }

    chartData[timestamp][entry.sensorType] =
      parseFloat(entry.value) || entry.value;
  });

  // Convert to array and sort by timestamp (newest first)
  return Object.values(chartData).sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );
};

/**
 * Get environmental sensor data for chart display
 * @param {string} deviceId - Device ID
 * @returns {Array} - Array formatted for environmental chart
 */
export const getEnvironmentalChartData = (deviceId) => {
  const data = getSensorData(deviceId);

  // Filter for environmental sensors
  const environmentalSensors = ["humidity", "aqi", "pm25", "co2"];
  const envData = data.filter((entry) =>
    environmentalSensors.includes(entry.sensorType)
  );

  // Group by timestamp
  const chartData = {};

  envData.forEach((entry) => {
    const timestamp = entry.timestamp;

    if (!chartData[timestamp]) {
      chartData[timestamp] = { timestamp };
    }

    chartData[timestamp][entry.sensorType] =
      parseFloat(entry.value) || entry.value;
  });

  // Convert to array and sort by timestamp (newest first)
  return Object.values(chartData).sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );
};

// ============================================
// PRODUCTION DATA METHODS (7 day retention)
// ============================================

/**
 * Get production logs (RFID scans) for last 7 days
 * @param {string} deviceId - Device ID (optional)
 * @returns {Array} - Array of production log entries
 */
export const getProductionLogs = (deviceId) => {
  const allLogs = getDataWithExpiration(
    STORAGE_KEYS.PRODUCTION_LOGS,
    RETENTION.PRODUCTION_DATA
  );

  // Filter by device ID if specified
  if (deviceId) {
    return allLogs.filter((log) => log.deviceId === deviceId);
  }

  return allLogs;
};

/**
 * Save new production log entry (RFID scan)
 * @param {string} deviceId - Device ID
 * @param {string} tagId - RFID tag ID
 * @param {string} status - Scan status (success/failed)
 * @param {string} product - Product type
 * @param {string} timestamp - ISO timestamp
 */
export const saveProductionLog = (
  deviceId,
  tagId,
  status = "success",
  product = "Unit",
  timestamp
) => {
  const newLog = {
    id: Date.now(),
    deviceId,
    tagId,
    status,
    product,
    timestamp: timestamp || new Date().toISOString(),
  };

  // Save with limit (max 5000 entries ≈ 7 days of production logs)
  saveDataWithLimit(
    STORAGE_KEYS.PRODUCTION_LOGS,
    [newLog],
    RETENTION.PRODUCTION_DATA,
    5000
  );
};

/**
 * Get production trend data (aggregated by hour or day)
 * @param {string} deviceId - Device ID
 * @param {string} groupBy - 'hour' or 'day'
 * @returns {Array} - Array of aggregated production counts
 */
export const getProductionTrend = (deviceId, groupBy = "hour") => {
  const logs = getProductionLogs(deviceId);

  // Group logs by time period
  const grouped = {};

  logs.forEach((log) => {
    const date = new Date(log.timestamp);
    let key;

    if (groupBy === "hour") {
      // Group by hour: "2025-12-12 10:00"
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(date.getDate()).padStart(2, "0")} ${String(
        date.getHours()
      ).padStart(2, "0")}:00`;
    } else {
      // Group by day: "2025-12-12"
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(date.getDate()).padStart(2, "0")}`;
    }

    if (!grouped[key]) {
      grouped[key] = {
        timestamp: key,
        count: 0,
        success: 0,
        failed: 0,
      };
    }

    grouped[key].count++;
    if (log.status === "success") {
      grouped[key].success++;
    } else {
      grouped[key].failed++;
    }
  });

  // Convert to array and sort by timestamp
  return Object.values(grouped).sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );
};

/**
 * Get KPI data (production counts for today)
 * @param {string} deviceId - Device ID
 * @returns {Object} - KPI metrics
 */
export const getProductionKPI = (deviceId) => {
  const logs = getProductionLogs(deviceId);

  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();

  // Filter logs for today
  const todayLogs = logs.filter(
    (log) => new Date(log.timestamp).getTime() >= todayStart
  );

  return {
    daily: todayLogs.filter((log) => log.status === "success").length,
    failed: todayLogs.filter((log) => log.status === "failed").length,
    total: todayLogs.length,
  };
};

// ============================================
// UTILITY METHODS
// ============================================

/**
 * Clear all stored data (useful for testing or reset)
 */
export const clearAllData = () => {
  localStorage.removeItem(STORAGE_KEYS.SENSOR_DATA);
  localStorage.removeItem(STORAGE_KEYS.PRODUCTION_LOGS);
  console.log("✅ All factory data cleared from localStorage");
};

/**
 * Get storage statistics
 * @returns {Object} - Storage usage statistics
 */
export const getStorageStats = () => {
  const sensorData = getSensorData();
  const productionLogs = getProductionLogs();

  return {
    sensorEntries: sensorData.length,
    productionEntries: productionLogs.length,
    sensorDataAge:
      sensorData.length > 0
        ? Math.round(
            (Date.now() -
              new Date(sensorData[sensorData.length - 1].timestamp).getTime()) /
              1000 /
              60 /
              60
          ) + " hours"
        : "No data",
    productionDataAge:
      productionLogs.length > 0
        ? Math.round(
            (Date.now() -
              new Date(
                productionLogs[productionLogs.length - 1].timestamp
              ).getTime()) /
              1000 /
              60 /
              60 /
              24
          ) + " days"
        : "No data",
  };
};

/**
 * Export data as JSON (for backup or analysis)
 * @returns {Object} - All stored data
 */
export const exportData = () => {
  return {
    sensorData: getSensorData(),
    productionLogs: getProductionLogs(),
    exportedAt: new Date().toISOString(),
  };
};

/**
 * Import data from JSON backup
 * @param {Object} data - Data object from exportData()
 */
export const importData = (data) => {
  try {
    if (data.sensorData) {
      localStorage.setItem(
        STORAGE_KEYS.SENSOR_DATA,
        JSON.stringify(data.sensorData)
      );
    }
    if (data.productionLogs) {
      localStorage.setItem(
        STORAGE_KEYS.PRODUCTION_LOGS,
        JSON.stringify(data.productionLogs)
      );
    }
    console.log("✅ Data imported successfully");
  } catch (error) {
    console.error("Error importing data:", error);
  }
};
