/**
 * Production Service
 * Manages unit counting and production log with localStorage persistence
 * Data is valid for 24 hours only
 */

const STORAGE_KEY_PREFIX = "production_data_";
const PRODUCTION_LOG_KEY = "production_log";
const EXPIRY_HOURS = 24;

/**
 * Get storage key for a specific device
 * @param {string} deviceId - Device ID
 * @returns {string} Storage key
 */
const getStorageKey = (deviceId) => `${STORAGE_KEY_PREFIX}${deviceId}`;

/**
 * Check if stored data is still valid (within 24 hours)
 * @param {number} timestamp - Timestamp when data was stored
 * @returns {boolean} True if data is valid
 */
const isDataValid = (timestamp) => {
  if (!timestamp) return false;
  const now = Date.now();
  const expiryTime = EXPIRY_HOURS * 60 * 60 * 1000; // 24 hours in milliseconds
  return now - timestamp < expiryTime;
};

/**
 * Get the start of the current day (midnight) timestamp
 * @returns {number} Timestamp of midnight today
 */
const getDayStartTimestamp = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
};

/**
 * Get production data for a device from localStorage
 * @param {string} deviceId - Device ID
 * @returns {Object} Production data { units, timestamp, dayStart }
 */
export const getProductionData = (deviceId) => {
  try {
    const storageKey = getStorageKey(deviceId);
    const stored = localStorage.getItem(storageKey);

    if (!stored) {
      return {
        units: 0,
        timestamp: Date.now(),
        dayStart: getDayStartTimestamp(),
      };
    }

    const data = JSON.parse(stored);

    // Check if data is from the current day and within 24 hours
    const currentDayStart = getDayStartTimestamp();

    if (!isDataValid(data.timestamp) || data.dayStart !== currentDayStart) {
      // Data expired or from a different day - reset
      console.log(
        `🔄 [ProductionService] Data expired for ${deviceId}, resetting units`
      );
      const newData = {
        units: 0,
        timestamp: Date.now(),
        dayStart: currentDayStart,
      };
      saveProductionData(deviceId, newData);
      return newData;
    }

    console.log(
      `📊 [ProductionService] Loaded ${data.units} units for ${deviceId} from localStorage`
    );
    return data;
  } catch (error) {
    console.error(
      "❌ [ProductionService] Error reading production data:",
      error
    );
    return {
      units: 0,
      timestamp: Date.now(),
      dayStart: getDayStartTimestamp(),
    };
  }
};

/**
 * Save production data to localStorage
 * @param {string} deviceId - Device ID
 * @param {Object} data - Production data to save
 */
export const saveProductionData = (deviceId, data) => {
  try {
    const storageKey = getStorageKey(deviceId);
    const dataToStore = {
      ...data,
      timestamp: Date.now(),
      dayStart: data.dayStart || getDayStartTimestamp(),
    };
    localStorage.setItem(storageKey, JSON.stringify(dataToStore));
    console.log(
      `💾 [ProductionService] Saved ${dataToStore.units} units for ${deviceId}`
    );
  } catch (error) {
    console.error(
      "❌ [ProductionService] Error saving production data:",
      error
    );
  }
};

/**
 * Increment unit count for a device
 * @param {string} deviceId - Device ID
 * @returns {number} New unit count
 */
export const incrementUnits = (deviceId) => {
  const data = getProductionData(deviceId);
  data.units += 1;
  saveProductionData(deviceId, data);
  return data.units;
};

/**
 * Get current unit count for a device
 * @param {string} deviceId - Device ID
 * @returns {number} Current unit count
 */
export const getUnits = (deviceId) => {
  const data = getProductionData(deviceId);
  return data.units;
};

/**
 * Reset units for a device (e.g., at start of new day)
 * @param {string} deviceId - Device ID
 */
export const resetUnits = (deviceId) => {
  const newData = {
    units: 0,
    timestamp: Date.now(),
    dayStart: getDayStartTimestamp(),
  };
  saveProductionData(deviceId, newData);
  console.log(`🔄 [ProductionService] Reset units for ${deviceId}`);
};

// ═══════════════════════════════════════════════════════════════════════
// Production Log Management
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get production log from localStorage
 * @param {string} deviceId - Device ID
 * @returns {Array} Production log entries
 */
export const getProductionLog = (deviceId) => {
  try {
    const key = `${PRODUCTION_LOG_KEY}_${deviceId}`;
    const stored = localStorage.getItem(key);

    if (!stored) {
      return [];
    }

    const data = JSON.parse(stored);
    const currentDayStart = getDayStartTimestamp();

    // Filter out entries older than 24 hours
    const validEntries = data.entries.filter((entry) => {
      const entryTime = new Date(entry.timestamp).getTime();
      return entryTime >= currentDayStart;
    });

    // If some entries were filtered out, save the cleaned log
    if (validEntries.length !== data.entries.length) {
      saveProductionLog(deviceId, validEntries);
    }

    return validEntries;
  } catch (error) {
    console.error(
      "❌ [ProductionService] Error reading production log:",
      error
    );
    return [];
  }
};

/**
 * Save production log to localStorage
 * @param {string} deviceId - Device ID
 * @param {Array} entries - Log entries to save
 */
export const saveProductionLog = (deviceId, entries) => {
  try {
    const key = `${PRODUCTION_LOG_KEY}_${deviceId}`;
    // Keep only last 100 entries to prevent localStorage overflow
    const trimmedEntries = entries.slice(-100);
    localStorage.setItem(
      key,
      JSON.stringify({
        entries: trimmedEntries,
        timestamp: Date.now(),
      })
    );
  } catch (error) {
    console.error("❌ [ProductionService] Error saving production log:", error);
  }
};

/**
 * Add a product entry to the production log
 * @param {string} deviceId - Device ID
 * @param {Object} product - Product data { productID, productName }
 * @returns {Object} The created log entry
 */
export const addProductToLog = (deviceId, product) => {
  const entries = getProductionLog(deviceId);
  const timestamp = new Date().toISOString();

  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    productID: product.productID || product.productId || "UNKNOWN",
    productName: product.productName || "Unknown Product",
    timestamp: timestamp,
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  };

  entries.push(entry);
  saveProductionLog(deviceId, entries);

  console.log(
    `📦 [ProductionService] Product logged: ${entry.productID} - ${entry.productName}`
  );

  return entry;
};

/**
 * Clear production log for a device
 * @param {string} deviceId - Device ID
 */
export const clearProductionLog = (deviceId) => {
  const key = `${PRODUCTION_LOG_KEY}_${deviceId}`;
  localStorage.removeItem(key);
  console.log(`🗑️ [ProductionService] Cleared production log for ${deviceId}`);
};

/**
 * Get time remaining until data expires
 * @param {string} deviceId - Device ID
 * @returns {Object} { hours, minutes, isExpired }
 */
export const getExpiryInfo = (deviceId) => {
  const data = getProductionData(deviceId);
  const elapsed = Date.now() - data.timestamp;
  const remaining = EXPIRY_HOURS * 60 * 60 * 1000 - elapsed;

  if (remaining <= 0) {
    return { hours: 0, minutes: 0, isExpired: true };
  }

  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

  return { hours, minutes, isExpired: false };
};

export default {
  getProductionData,
  saveProductionData,
  incrementUnits,
  getUnits,
  resetUnits,
  getProductionLog,
  addProductToLog,
  clearProductionLog,
  getExpiryInfo,
};
