import React, { useState, useMemo, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { History, Calendar, Download, Filter, Search, TrendingUp, AlertTriangle, Eye, EyeOff, X, Loader2, RefreshCw, Clock, Database, Activity } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, CartesianGrid, ReferenceLine } from 'recharts';
import {
  fetchAllHistoricalData,
  getOEEChartData,
  getMTBFHours,
  analyzeAlertForDowntime,
  getTimeRange,
} from '../services/historicalDataService';


const HistoricalWindow = ({
  alerts = [],
  setAlerts,
  devices = [],
  selectedDevice,
  setSelectedDevice,
  sensorHistory = {},
  factoryStatus = 'RUNNING',
  targetUnits = 1024,
  thresholds = {},
  currentUnits = 0,
  hideTitle = false, // New prop for embedding in larger layouts
  products24h = { count: 0, products: [] } // Products fetched from backend
}) => {
  const [dateRange, setDateRange] = useState('24h');
  const [granularity, setGranularity] = useState('hourly');

  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showCustomRangeDialog, setShowCustomRangeDialog] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [customGranularity, setCustomGranularity] = useState('hourly');
  const [exportDateRange, setExportDateRange] = useState('current');
  const [exportCustomRange, setExportCustomRange] = useState({ start: '', end: '' });
  const [selectedCharts, setSelectedCharts] = useState({
    production: true,
    oee: true,
    machinePerformance: true,
    environmental: true
  });

  // Environmental metrics visibility state (AQI is calculated, not graphed)
  const [envVisibility, setEnvVisibility] = useState({
    temperature: true,
    humidity: true,
    co2: true
  });

  // Machine performance metrics visibility state
  const [machineVisibility, setMachineVisibility] = useState({
    vibration: true,
    pressure: true,
    noise: true
  });

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStates, setLoadingStates] = useState({
    production: false,
    oee: false,
    machine: false,
    environmental: false,
    downtime: false,
  });
  const [dataError, setDataError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [mtbfHours, setMtbfHours] = useState(0);

  // Data arrays - fetched from HTTP API
  const [machinePerformanceData, setMachinePerformanceData] = useState([]);
  const [environmentalData, setEnvironmentalData] = useState([]);
  const [productionData, setProductionData] = useState([]);
  const [oeeData, setOeeData] = useState([{ week: new Date().toISOString().split('T')[0], oee: 0 }]);
  const [downtimeData, setDowntimeData] = useState([]);


  // Fetch historical data from HTTP API
  const loadHistoricalData = useCallback(async () => {
    if (!selectedDevice) {
      console.log('⚠️ [Historical] No device selected');
      return;
    }

    setIsLoading(true);
    setDataError(null);

    try {
      console.log(`📊 [Historical] Loading data for ${selectedDevice}, range: ${dateRange}`);

      // Fetch all data using the historical data service
      const result = await fetchAllHistoricalData(selectedDevice, dateRange);

      // Production data - use API data or create fallback from current values
      let prodData = result.productionData || [];
      if (prodData.length === 0 && currentUnits !== undefined && currentUnits !== null) {
        // Create a single data point from current real-time value
        const today = new Date().toISOString().split('T')[0];
        prodData = [{ date: today, produced: currentUnits, target: targetUnits }];
        console.log(`📊 [Historical] Using current units as fallback: ${currentUnits}`);
      }
      setProductionData(prodData);

      // Machine performance data - use API data or create fallback
      let machineData = result.machinePerformanceData || [];
      if (machineData.length === 0 && sensorHistory && sensorHistory[selectedDevice]) {
        const deviceHistory = sensorHistory[selectedDevice];
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        machineData = [{
          time: timeStr,
          timestamp: now.toISOString(),
          vibration: deviceHistory.vibration?.[0]?.value || null,
          pressure: deviceHistory.pressure?.[0]?.value || null,
          noise: deviceHistory.noise?.[0]?.value || null,
        }];
      }
      setMachinePerformanceData(machineData);

      // Environmental data - use API data or create fallback (AQI is calculated, not graphed)
      let envData = result.environmentalData || [];
      if (envData.length === 0 && sensorHistory && sensorHistory[selectedDevice]) {
        const deviceHistory = sensorHistory[selectedDevice];
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        envData = [{
          time: timeStr,
          timestamp: now.toISOString(),
          temperature: deviceHistory.temperature?.[0]?.value || null,
          humidity: deviceHistory.humidity?.[0]?.value || null,
          co2: deviceHistory.co2?.[0]?.value || null,
          // AQI removed - calculated client-side, not graphed
        }];
      }
      setEnvironmentalData(envData);

      // OEE and Downtime from localStorage (calculated locally)
      setOeeData(result.oeeData || [{ week: new Date().toISOString().split('T')[0], oee: 0 }]);
      setDowntimeData(result.downtimeData || []);
      setMtbfHours(result.mtbf || 0);

      setLastUpdated(new Date());
      console.log(`✅ [Historical] Data loaded successfully. Production: ${prodData.length}, Machine: ${machineData.length}, Env: ${envData.length}`);
    } catch (error) {
      console.error(`❌ [Historical] Error loading data:`, error);
      setDataError(error.message || 'Failed to load historical data');

      // On error, still try to show current data
      if (currentUnits !== undefined && currentUnits !== null) {
        const today = new Date().toISOString().split('T')[0];
        setProductionData([{ date: today, produced: currentUnits, target: targetUnits }]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedDevice, dateRange, currentUnits, targetUnits, sensorHistory]);

  // Initial load and periodic refresh
  useEffect(() => {
    loadHistoricalData();

    // Refresh data every 30 seconds
    const intervalId = setInterval(loadHistoricalData, 30000);
    return () => clearInterval(intervalId);
  }, [loadHistoricalData]);

  // Analyze alerts for downtime tracking
  useEffect(() => {
    if (alerts && alerts.length > 0 && selectedDevice) {
      // Process new alerts for downtime analysis
      const lastAlert = alerts[0]; // Most recent alert
      if (lastAlert) {
        analyzeAlertForDowntime(lastAlert, selectedDevice);
        setMtbfHours(getMTBFHours());
      }
    }
  }, [alerts, selectedDevice]);


  const toggleEnvMetric = (metric) => {
    setEnvVisibility(prev => ({
      ...prev,
      [metric]: !prev[metric]
    }));
  };

  const toggleMachineMetric = (metric) => {
    setMachineVisibility(prev => ({
      ...prev,
      [metric]: !prev[metric]
    }));
  };

  const toggleChartSelection = (chart) => {
    setSelectedCharts(prev => ({
      ...prev,
      [chart]: !prev[chart]
    }));
  };

  const selectAllCharts = () => {
    const allSelected = Object.values(selectedCharts).every(val => val);
    const newState = {};
    Object.keys(selectedCharts).forEach(key => {
      newState[key] = !allSelected;
    });
    setSelectedCharts(newState);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // XLSX EXPORT HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Apply a consistent style to a cell in the worksheet.
   * @param {object} ws  - worksheet object
   * @param {string} ref - cell address e.g. "A1"
   * @param {object} style
   */
  const styleCell = (ws, ref, style) => {
    if (!ws[ref]) ws[ref] = { t: 's', v: '' };
    ws[ref].s = style;
  };

  /**
   * Build and download a styled multi-sheet Excel report.
   */
  const handleExport = () => {
    const now = new Date();
    const exportedAt = now.toLocaleString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const fileTimestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const deviceLabel = selectedDevice || 'Unknown Device';
    const rangeLabel = dateRange.toUpperCase();

    // ── Shared style palettes ──────────────────────────────────────────────
    const STYLES = {
      reportTitle: {
        font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '1E3A5F' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: { bottom: { style: 'medium', color: { rgb: '3B82F6' } } }
      },
      metaLabel: {
        font: { bold: true, sz: 10, color: { rgb: '475569' } },
        fill: { fgColor: { rgb: 'F1F5F9' } },
        alignment: { horizontal: 'right', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'CBD5E1' } },
          bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
          left: { style: 'thin', color: { rgb: 'CBD5E1' } },
          right: { style: 'thin', color: { rgb: 'CBD5E1' } }
        }
      },
      metaValue: {
        font: { sz: 10, color: { rgb: '1E293B' } },
        fill: { fgColor: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'CBD5E1' } },
          bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
          left: { style: 'thin', color: { rgb: 'CBD5E1' } },
          right: { style: 'thin', color: { rgb: 'CBD5E1' } }
        }
      },
      sectionHeader: {
        font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '2563EB' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: { bottom: { style: 'medium', color: { rgb: '1D4ED8' } } }
      },
      colHeader: {
        font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '334155' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: '475569' } },
          bottom: { style: 'medium', color: { rgb: '475569' } },
          left: { style: 'thin', color: { rgb: '475569' } },
          right: { style: 'thin', color: { rgb: '475569' } }
        }
      },
      dataEven: {
        font: { sz: 10, color: { rgb: '1E293B' } },
        fill: { fgColor: { rgb: 'F8FAFC' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
          left: { style: 'thin', color: { rgb: 'E2E8F0' } },
          right: { style: 'thin', color: { rgb: 'E2E8F0' } }
        }
      },
      dataOdd: {
        font: { sz: 10, color: { rgb: '1E293B' } },
        fill: { fgColor: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
          left: { style: 'thin', color: { rgb: 'E2E8F0' } },
          right: { style: 'thin', color: { rgb: 'E2E8F0' } }
        }
      },
      dataGood: {
        font: { bold: true, sz: 10, color: { rgb: '166534' } },
        fill: { fgColor: { rgb: 'DCFCE7' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'BBF7D0' } },
          bottom: { style: 'thin', color: { rgb: 'BBF7D0' } },
          left: { style: 'thin', color: { rgb: 'BBF7D0' } },
          right: { style: 'thin', color: { rgb: 'BBF7D0' } }
        }
      },
      dataWarning: {
        font: { bold: true, sz: 10, color: { rgb: '92400E' } },
        fill: { fgColor: { rgb: 'FEF3C7' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'FDE68A' } },
          bottom: { style: 'thin', color: { rgb: 'FDE68A' } },
          left: { style: 'thin', color: { rgb: 'FDE68A' } },
          right: { style: 'thin', color: { rgb: 'FDE68A' } }
        }
      },
      dataCritical: {
        font: { bold: true, sz: 10, color: { rgb: '991B1B' } },
        fill: { fgColor: { rgb: 'FEE2E2' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'FECACA' } },
          bottom: { style: 'thin', color: { rgb: 'FECACA' } },
          left: { style: 'thin', color: { rgb: 'FECACA' } },
          right: { style: 'thin', color: { rgb: 'FECACA' } }
        }
      },
      footer: {
        font: { italic: true, sz: 9, color: { rgb: '94A3B8' } },
        fill: { fgColor: { rgb: 'F8FAFC' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    };

    /**
     * Write a cell with value + style.
     * r = 0-based row, c = 0-based col.
     */
    const writeCell = (ws, r, c, value, style, type = 's') => {
      const ref = XLSX.utils.encode_cell({ r, c });
      ws[ref] = { t: type, v: value, s: style };
    };

    /**
     * Merge cells in a worksheet.
     * s:start r/c, e:end r/c (both 0-based, inclusive).
     */
    const merge = (ws, sr, sc, er, ec) => {
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: sr, c: sc }, e: { r: er, c: ec } });
    };

    /**
     * Build a report sheet with:
     *  Row 0      — Report Title (merged across all cols)
     *  Rows 1-4   — Metadata block (Device, Date range, Exported at, Total records)
     *  Row 5      — Blank separator
     *  Row 6      — Section header (merged)
     *  Row 7      — Column headers
     *  Rows 8+    — Data rows (alternating, with status-color on key metrics)
     *  Last row   — Footer note
     */
    const buildSheet = ({ title, icon, sectionLabel, columns, rows, colWidths, statusCol, statusFn }) => {
      const ws = {};
      const numCols = columns.length;
      const lastCol = numCols - 1;
      let r = 0;

      // ── Row 0: Report title ─────────────────────────────────────────────
      writeCell(ws, r, 0, `${icon}  ${title} — Factory Management Report`, STYLES.reportTitle);
      merge(ws, r, 0, r, lastCol);
      r++;

      // ── Rows 1-4: Metadata block ────────────────────────────────────────
      const meta = [
        ['📟  Device', deviceLabel],
        ['📅  Time Range', rangeLabel],
        ['🕐  Exported At', exportedAt],
        ['📊  Total Records', `${rows.length} entries`],
      ];
      meta.forEach(([label, value]) => {
        writeCell(ws, r, 0, label, STYLES.metaLabel);
        merge(ws, r, 0, r, 1);
        writeCell(ws, r, 2, value, STYLES.metaValue);
        merge(ws, r, 2, r, lastCol);
        r++;
      });

      // ── Row: Blank separator ────────────────────────────────────────────
      r++;

      // ── Row: Section header ─────────────────────────────────────────────
      writeCell(ws, r, 0, `  ${sectionLabel}`, STYLES.sectionHeader);
      merge(ws, r, 0, r, lastCol);
      r++;

      // ── Row: Column headers ─────────────────────────────────────────────
      columns.forEach((col, c) => {
        writeCell(ws, r, c, col.label, STYLES.colHeader);
      });
      r++;

      // ── Data rows ───────────────────────────────────────────────────────
      if (rows.length === 0) {
        writeCell(ws, r, 0, 'No data available for the selected range.', {
          font: { italic: true, sz: 10, color: { rgb: '94A3B8' } },
          alignment: { horizontal: 'center' }
        });
        merge(ws, r, 0, r, lastCol);
        r++;
      } else {
        rows.forEach((row, rowIdx) => {
          columns.forEach((col, c) => {
            const raw = row[col.key];
            let display = raw === null || raw === undefined || raw === '' ? '—' : raw;

            // Format numbers
            if (typeof raw === 'number') {
              if (col.decimals !== undefined) {
                display = raw.toFixed(col.decimals);
              }
              if (col.suffix) display = `${display}${col.suffix}`;
            }

            // Status coloring on designated column
            let cellStyle = rowIdx % 2 === 0 ? STYLES.dataEven : STYLES.dataOdd;
            if (statusCol && col.key === statusCol && statusFn) {
              const status = statusFn(col.key, raw);
              if (status === 'good') cellStyle = STYLES.dataGood;
              else if (status === 'warning') cellStyle = STYLES.dataWarning;
              else if (status === 'critical') cellStyle = STYLES.dataCritical;
            }

            writeCell(ws, r, c, display, cellStyle);
          });
          r++;
        });
      }

      // ── Footer ──────────────────────────────────────────────────────────
      r++;
      writeCell(ws, r, 0,
        `Generated by Factory Management System  •  ${exportedAt}  •  Device: ${deviceLabel}`,
        STYLES.footer
      );
      merge(ws, r, 0, r, lastCol);

      // ── Column widths ────────────────────────────────────────────────────
      ws['!cols'] = colWidths || columns.map(() => ({ wch: 18 }));

      // ── Row heights ──────────────────────────────────────────────────────
      ws['!rows'] = [{ hpx: 36 }]; // Title row taller

      // ── Sheet range ──────────────────────────────────────────────────────
      ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: lastCol } });

      return ws;
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Build workbook
    // ─────────────────────────────────────────────────────────────────────────
    const wb = XLSX.utils.book_new();
    wb.Props = {
      Title: 'Factory Management Report',
      Subject: 'Historical Data Export',
      Author: 'Factory Management System',
      CreatedDate: now
    };

    // ── 1. Production Volume sheet ─────────────────────────────────────────
    if (selectedCharts.production) {
      const ws = buildSheet({
        title: 'Production Volume',
        icon: '🏭',
        sectionLabel: '📦  Production Volume Data',
        columns: [
          { label: '📅  Date', key: 'date' },
          { label: '✅  Units Produced', key: 'produced', decimals: 0 },
          { label: '🎯  Target Units', key: 'target', decimals: 0 },
          { label: '📈  Achievement (%)', key: '_achievement' },
          { label: '🔵  Status', key: '_status' },
        ],
        rows: productionData.map(r => {
          const achievement = r.target > 0 ? ((r.produced / r.target) * 100).toFixed(1) : '—';
          const status = r.target > 0
            ? r.produced >= r.target ? '✅ On Target'
              : r.produced >= r.target * 0.8 ? '⚠️ Near Target'
              : '❌ Below Target'
            : '—';
          return { ...r, _achievement: achievement !== '—' ? `${achievement}%` : '—', _status: status };
        }),
        colWidths: [{ wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 20 }, { wch: 20 }],
      });
      XLSX.utils.book_append_sheet(wb, ws, '🏭 Production');
    }

    // ── 2. OEE Trends sheet ────────────────────────────────────────────────
    if (selectedCharts.oee) {
      const ws = buildSheet({
        title: 'OEE Trends',
        icon: '⚙️',
        sectionLabel: '📊  Overall Equipment Effectiveness (OEE)',
        columns: [
          { label: '📅  Week / Date', key: 'week' },
          { label: '⚙️  OEE (%)', key: 'oee', decimals: 1 },
          { label: '🟢  Availability (%)', key: 'availability', decimals: 1 },
          { label: '⚡  Performance (%)', key: 'performance', decimals: 1 },
          { label: '🎯  Quality (%)', key: 'quality', decimals: 1 },
          { label: '🔵  OEE Rating', key: '_rating' },
        ],
        rows: oeeData.map(r => {
          const rating = r.oee >= 85 ? '🟢 Excellent (≥85%)'
            : r.oee >= 60 ? '🟡 Acceptable (60–84%)'
            : '🔴 Needs Improvement (<60%)';
          return { ...r, _rating: rating };
        }),
        colWidths: [{ wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 28 }],
        statusCol: 'oee',
        statusFn: (_, v) => v >= 85 ? 'good' : v >= 60 ? 'warning' : 'critical',
      });
      XLSX.utils.book_append_sheet(wb, ws, '⚙️ OEE Trends');
    }

    // ── 3. Machine Performance sheet ──────────────────────────────────────
    if (selectedCharts.machinePerformance) {
      const ws = buildSheet({
        title: 'Machine Performance',
        icon: '🔧',
        sectionLabel: '🔧  Machine Performance Data',
        columns: [
          { label: '🕐  Timestamp', key: 'time' },
          { label: '📳  Vibration (mm/s)', key: 'vibration', decimals: 2 },
          { label: '🔵  Pressure (bar)', key: 'pressure', decimals: 2 },
          { label: '🔊  Noise Level (dB)', key: 'noise', decimals: 1 },
          { label: '📋  Vibration Status', key: '_vibStatus' },
          { label: '📋  Pressure Status', key: '_presStatus' },
          { label: '📋  Noise Status', key: '_noiseStatus' },
        ],
        rows: machinePerformanceData.map(r => {
          const vThresh = thresholds?.vibration;
          const pThresh = thresholds?.pressure;
          const nThresh = thresholds?.noise;
          const vibStatus = !r.vibration ? '—'
            : vThresh?.critical && r.vibration >= vThresh.critical ? '🔴 Critical'
            : vThresh?.warning && r.vibration >= vThresh.warning ? '🟡 Warning'
            : '🟢 Normal';
          const presStatus = !r.pressure ? '—'
            : pThresh?.max && r.pressure >= pThresh.max ? '🔴 High'
            : pThresh?.min && r.pressure <= pThresh.min ? '🔴 Low'
            : '🟢 Normal';
          const noiseStatus = !r.noise ? '—'
            : nThresh?.critical && r.noise >= nThresh.critical ? '🔴 Critical'
            : nThresh?.warning && r.noise >= nThresh.warning ? '🟡 Warning'
            : '🟢 Normal';
          return { ...r, _vibStatus: vibStatus, _presStatus: presStatus, _noiseStatus: noiseStatus };
        }),
        colWidths: [{ wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 18 }],
      });
      XLSX.utils.book_append_sheet(wb, ws, '🔧 Machine Perf');
    }

    // ── 4. Environmental Trends sheet ─────────────────────────────────────
    if (selectedCharts.environmental) {
      const ws = buildSheet({
        title: 'Environmental Trends',
        icon: '🌡️',
        sectionLabel: '🌿  Environmental Sensor Data',
        columns: [
          { label: '🕐  Timestamp', key: 'time' },
          { label: '🌡️  Temperature (°C)', key: 'temperature', decimals: 1 },
          { label: '💧  Humidity (%)', key: 'humidity', decimals: 1 },
          { label: '💨  CO2 (%)', key: 'co2', decimals: 2 },
          { label: '🌬️  Air Quality Index', key: '_aqi' },
          { label: '📋  Temp Status', key: '_tempStatus' },
          { label: '📋  Humidity Status', key: '_humStatus' },
        ],
        rows: environmentalData.map(r => {
          const tThresh = thresholds?.temperature;
          const hThresh = thresholds?.humidity;
          // Client-side AQI calculation (temperature + humidity + CO2 weighted)
          const aqiRaw = r.temperature !== null && r.humidity !== null && r.co2 !== null
            ? Math.min(100, Math.max(0, Math.round(
                100 - ((r.temperature - 20) * 0.5) - ((r.humidity - 50) * 0.3) - (r.co2 * 0.2)
              )))
            : null;
          const aqiLabel = aqiRaw === null ? '—'
            : aqiRaw >= 75 ? `${aqiRaw} 🟢 Good`
            : aqiRaw >= 50 ? `${aqiRaw} 🟡 Fair`
            : `${aqiRaw} 🔴 Poor`;
          const tempStatus = !r.temperature ? '—'
            : tThresh?.max && r.temperature >= tThresh.max ? '🔴 Critical High'
            : tThresh?.min && r.temperature <= tThresh.min ? '🔴 Critical Low'
            : r.temperature > 35 ? '🟡 Elevated'
            : '🟢 Normal';
          const humStatus = !r.humidity ? '—'
            : hThresh?.max && r.humidity >= hThresh.max ? '🔴 Too High'
            : hThresh?.min && r.humidity <= hThresh.min ? '🔴 Too Low'
            : r.humidity > 70 ? '🟡 High'
            : '🟢 Normal';
          return { ...r, _aqi: aqiLabel, _tempStatus: tempStatus, _humStatus: humStatus };
        }),
        colWidths: [{ wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 14 }, { wch: 22 }, { wch: 22 }, { wch: 22 }],
        statusCol: 'temperature',
        statusFn: (_, v) => {
          const t = thresholds?.temperature;
          if (!v) return null;
          if (t?.max && v >= t.max) return 'critical';
          if (t?.min && v <= t.min) return 'critical';
          if (v > 35) return 'warning';
          return 'good';
        },
      });
      XLSX.utils.book_append_sheet(wb, ws, '🌡️ Environment');
    }

    // ── 5. Summary sheet ──────────────────────────────────────────────────
    {
      const ws = {};
      let r = 0;
      const numCols = 3;

      const writeS = (row, col, val, style) => {
        const ref = XLSX.utils.encode_cell({ r: row, c: col });
        ws[ref] = { t: 's', v: String(val), s: style };
      };

      // Title
      writeS(r, 0, '📋  Export Summary — Factory Management System', STYLES.reportTitle);
      merge(ws, r, 0, r, numCols);
      r++;

      // Meta
      [
        ['Device', deviceLabel],
        ['Exported At', exportedAt],
        ['Time Range', rangeLabel],
        ['Production Records', `${productionData.length}`],
        ['OEE Data Points', `${oeeData.length}`],
        ['Machine Perf. Records', `${machinePerformanceData.length}`],
        ['Environmental Records', `${environmentalData.length}`],
        ['MTBF (hours)', `${mtbfHours || '—'}`],
      ].forEach(([label, value]) => {
        writeS(r, 0, label, STYLES.metaLabel);
        writeS(r, 1, value, STYLES.metaValue);
        merge(ws, r, 1, r, numCols);
        r++;
      });

      r++;
      writeS(r, 0,
        'Note: OEE status — ≥85% Excellent  |  60–84% Acceptable  |  <60% Needs Improvement',
        STYLES.footer
      );
      merge(ws, r, 0, r, numCols);
      r++;
      writeS(r, 0,
        'Air Quality Index (AQI) is calculated client-side from Temperature, Humidity, and CO2 values.',
        STYLES.footer
      );
      merge(ws, r, 0, r, numCols);
      r++;
      writeS(r, 0,
        `Generated by Factory Management System  •  ${exportedAt}`,
        STYLES.footer
      );
      merge(ws, r, 0, r, numCols);

      ws['!cols'] = [{ wch: 26 }, { wch: 36 }, { wch: 20 }, { wch: 20 }];
      ws['!rows'] = [{ hpx: 36 }];
      ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: numCols } });

      XLSX.utils.book_append_sheet(wb, ws, '📋 Summary');
    }

    // ── Write and trigger download ─────────────────────────────────────────
    XLSX.writeFile(wb, `factory_report_${deviceLabel}_${fileTimestamp}.xlsx`, { bookType: 'xlsx', type: 'binary' });
    setShowExportDialog(false);
  };

  const handleApplyCustomRange = () => {
    if (customStartDate && customEndDate) {
      setDateRange('custom');
      setGranularity(customGranularity);
      setShowCustomRangeDialog(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PILL BADGE COMPONENT - Compact metadata display
  // ═══════════════════════════════════════════════════════════════════════════
  const PillBadge = ({ icon: Icon, label, value, color = 'blue' }) => {
    const colorClasses = {
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      green: 'bg-green-50 text-green-700 border-green-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200',
      amber: 'bg-amber-50 text-amber-700 border-amber-200',
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${colorClasses[color]}`}>
        {Icon && <Icon size={10} />}
        <span className="text-slate-500">{label}:</span>
        <span className="font-semibold">{value}</span>
      </span>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION HEADER COMPONENT - Consistent iconography style
  // ═══════════════════════════════════════════════════════════════════════════
  const SectionHeader = ({ icon: Icon, title, iconColor = 'text-primary-600', children }) => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-blue-50 rounded-lg">
          <Icon size={16} className={iconColor} />
        </div>
        <h3 className="text-sm font-bold text-slate-800 uppercase">{title}</h3>
      </div>
      {children}
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Header - Conditionally hidden via hideTitle prop */}
      {!hideTitle && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 sm:mb-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl">
              <History size={24} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-800 uppercase tracking-wide">Historical Data</h1>
              <p className="text-xs text-slate-500 mt-0.5">Analyze trends and patterns over time</p>
            </div>
            <button
              onClick={loadHistoricalData}
              disabled={isLoading}
              className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Time Range & Interval Controls - Compact Design */}
      <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-slate-100 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Time Range & Interval Dropdowns */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            {/* Time Range Dropdown */}
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <Clock size={14} className="text-blue-600" />
              </div>
              <span className="text-xs text-slate-600 font-medium">Range</span>
              <div className="relative">
                <select
                  value={dateRange}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setShowCustomRangeDialog(true);
                    } else {
                      setDateRange(e.target.value);
                    }
                  }}
                  className="appearance-none bg-white border border-slate-300 rounded-lg px-3 py-1.5 pr-8 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer hover:border-slate-400 transition-colors min-w-[80px]"
                >
                  <option value="1m">1m</option>
                  <option value="5m">5m</option>
                  <option value="15m">15m</option>
                  <option value="1h">1h</option>
                  <option value="6h">6h</option>
                  <option value="24h">24h</option>
                  <option value="7d">7d</option>
                  <option value="30d">30d</option>
                  <option value="custom">Custom</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Interval Dropdown */}
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-50 rounded-lg">
                <Activity size={14} className="text-purple-600" />
              </div>
              <span className="text-xs text-slate-600 font-medium">Interval</span>
              <div className="relative">
                <select
                  value={granularity}
                  onChange={(e) => setGranularity(e.target.value)}
                  className="appearance-none bg-white border border-slate-300 rounded-lg px-3 py-1.5 pr-8 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer hover:border-slate-400 transition-colors min-w-[100px]"
                >
                  <option value="auto">Auto</option>
                  <option value="1s">1 Second</option>
                  <option value="5s">5 Seconds</option>
                  <option value="1m">1 Minute</option>
                  <option value="5m">5 Minutes</option>
                  <option value="hourly">1 Hour</option>
                  <option value="daily">Daily</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Pill Badges for Metadata */}
            <div className="flex items-center gap-2">
              <PillBadge icon={Clock} label="Range" value={dateRange} color="blue" />
              <PillBadge icon={Database} label="Source" value="Live" color="green" />
              <PillBadge icon={Activity} label="Points" value={productionData.length || '—'} color="purple" />
            </div>
          </div>

          {/* Actions - Aligned Right */}
          <div className="flex items-center gap-3">
            {lastUpdated && !isLoading && (
              <span className="text-[10px] text-slate-400">
                Updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}

            {/* Export Button */}
            <button
              onClick={() => setShowExportDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors shadow-sm"
            >
              <Download size={14} />
              Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {dataError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <div className="p-1.5 bg-red-100 rounded-lg">
            <AlertTriangle className="text-red-500" size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-800">Error Loading Data</p>
            <p className="text-xs text-red-600">{dataError}</p>
          </div>
          <button
            onClick={loadHistoricalData}
            className="ml-auto px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* Production Volume & OEE Trends - Compact Headers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
              <Loader2 className="animate-spin text-blue-500" size={20} />
              <span className="text-sm font-medium text-slate-600">Loading data...</span>
            </div>
          </div>
        )}

        {/* Production Volume Card */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <TrendingUp size={16} className="text-blue-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 uppercase">Production Volume</h3>
              {/* Inline Pill Badges */}
              <div className="flex items-center gap-1.5 ml-2">
                <PillBadge label="Current" value={currentUnits || 0} color="blue" />
                <PillBadge label="Target" value={targetUnits} color="green" />
              </div>
            </div>
          </div>
          {productionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={productionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, Math.max(targetUnits, currentUnits || 0) * 1.2]} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <ReferenceLine y={targetUnits} stroke="#10B981" strokeDasharray="5 5" strokeWidth={2} label={{ value: `Target: ${targetUnits}`, fill: '#10B981', fontSize: 9, position: 'right' }} />
                <Bar dataKey="produced" fill="#3B82F6" name="Produced" />
                <Bar dataKey="target" fill="#94a3b8" name="Target" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex flex-col items-center justify-center text-slate-400">
              <Database size={32} className="mb-2 opacity-50" />
              <p className="text-sm font-medium">No historical data available</p>
              <p className="text-xs mt-1">Waiting for production data...</p>
            </div>
          )}
        </div>

        {/* OEE Trends Card */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <SectionHeader icon={Activity} title="OEE Trends (Weekly)" iconColor="text-green-600">
            <PillBadge label="MTBF" value={mtbfHours > 0 ? `${mtbfHours}h` : 'Collecting...'} color="green" />
          </SectionHeader>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={oeeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="oee" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} name="OEE %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Machine Performance & Environmental Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-50 rounded-lg">
                <Activity size={16} className="text-purple-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 uppercase">Machine Performance</h3>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => toggleMachineMetric('vibration')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition-colors ${machineVisibility.vibration ? 'bg-purple-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
              >
                {machineVisibility.vibration ? <Eye size={12} /> : <EyeOff size={12} />}
                Vib
              </button>
              <button
                onClick={() => toggleMachineMetric('pressure')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition-colors ${machineVisibility.pressure ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
              >
                {machineVisibility.pressure ? <Eye size={12} /> : <EyeOff size={12} />}
                Press
              </button>
              <button
                onClick={() => toggleMachineMetric('noise')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition-colors ${machineVisibility.noise ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
              >
                {machineVisibility.noise ? <Eye size={12} /> : <EyeOff size={12} />}
                Noise
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={machinePerformanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              {machineVisibility.vibration && thresholds.vibration?.critical && (
                <ReferenceLine yAxisId="left" y={thresholds.vibration.critical} stroke="#EF4444" strokeDasharray="5 5" strokeWidth={1} label={{ value: `Vib: ${thresholds.vibration.critical}`, fill: '#EF4444', fontSize: 8, position: 'insideTopRight' }} />
              )}
              {machineVisibility.noise && thresholds.noise?.critical && (
                <ReferenceLine yAxisId="right" y={thresholds.noise.critical} stroke="#F59E0B" strokeDasharray="5 5" strokeWidth={1} label={{ value: `Noise: ${thresholds.noise.critical}dB`, fill: '#F59E0B', fontSize: 8, position: 'insideBottomRight' }} />
              )}
              {machineVisibility.vibration && (
                <Line yAxisId="left" type="monotone" dataKey="vibration" stroke="#A855F7" strokeWidth={2} dot={{ r: 2 }} name="Vibration (mm/s)" />
              )}
              {machineVisibility.pressure && (
                <Line yAxisId="right" type="monotone" dataKey="pressure" stroke="#3B82F6" strokeWidth={2} dot={{ r: 2 }} name="Pressure (bar)" />
              )}
              {machineVisibility.noise && (
                <Line yAxisId="right" type="monotone" dataKey="noise" stroke="#F59E0B" strokeWidth={2} dot={{ r: 2 }} name="Noise (dB)" />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-green-50 rounded-lg">
                <Activity size={16} className="text-green-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 uppercase">Environmental</h3>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => toggleEnvMetric('temperature')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition-colors ${envVisibility.temperature ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
              >
                {envVisibility.temperature ? <Eye size={12} /> : <EyeOff size={12} />}
                Temp
              </button>
              <button
                onClick={() => toggleEnvMetric('humidity')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition-colors ${envVisibility.humidity ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
              >
                {envVisibility.humidity ? <Eye size={12} /> : <EyeOff size={12} />}
                Hum
              </button>
              <button
                onClick={() => toggleEnvMetric('co2')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition-colors ${envVisibility.co2 ? 'bg-pink-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
              >
                {envVisibility.co2 ? <Eye size={12} /> : <EyeOff size={12} />}
                CO2
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={environmentalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              {envVisibility.temperature && thresholds.temperature?.max && (
                <ReferenceLine y={thresholds.temperature.max} stroke="#EF4444" strokeDasharray="5 5" strokeWidth={1} label={{ value: `Temp: ${thresholds.temperature.max}°C`, fill: '#EF4444', fontSize: 8, position: 'insideTopRight' }} />
              )}
              {envVisibility.humidity && thresholds.humidity?.max && (
                <ReferenceLine y={thresholds.humidity.max} stroke="#3B82F6" strokeDasharray="5 5" strokeWidth={1} label={{ value: `Hum: ${thresholds.humidity.max}%`, fill: '#3B82F6', fontSize: 8, position: 'insideBottomRight' }} />
              )}
              {envVisibility.co2 && thresholds.co2?.max && (
                <ReferenceLine y={thresholds.co2.max} stroke="#EC4899" strokeDasharray="5 5" strokeWidth={1} label={{ value: `CO2: ${thresholds.co2.max}`, fill: '#EC4899', fontSize: 8, position: 'insideTopLeft' }} />
              )}
              {envVisibility.temperature && (
                <Line type="monotone" dataKey="temperature" stroke="#10B981" strokeWidth={2} dot={{ r: 2 }} name="Temperature (°C)" />
              )}
              {envVisibility.humidity && (
                <Line type="monotone" dataKey="humidity" stroke="#3B82F6" strokeWidth={2} dot={{ r: 2 }} name="Humidity (%)" />
              )}
              {envVisibility.co2 && (
                <Line type="monotone" dataKey="co2" stroke="#EC4899" strokeWidth={2} dot={{ r: 2 }} name="CO2 (%)" />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Products in Last 24 Hours Section */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 rounded-lg">
              <TrendingUp size={16} className="text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 uppercase">Products in Last 24 Hours</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
              {products24h.count} items
            </span>
          </div>
        </div>

        {products24h.products.length > 0 ? (
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase sticky top-0">
                <tr>
                  <th className="p-2 text-left">#</th>
                  <th className="p-2 text-left">Product ID</th>
                  <th className="p-2 text-left">Product Name</th>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products24h.products.map((product, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-2 text-slate-500 font-medium">{product.id || i + 1}</td>
                    <td className="p-2 text-slate-700 font-semibold font-mono">{product.productID}</td>
                    <td className="p-2 text-slate-600">{product.productName}</td>
                    <td className="p-2 text-slate-500">{product.date}</td>
                    <td className="p-2 text-slate-500">{product.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-[150px] flex flex-col items-center justify-center text-slate-400">
            <Database size={32} className="mb-2 opacity-50" />
            <p className="text-sm font-medium">No products recorded in last 24 hours</p>
            <p className="text-xs mt-1">Products will appear here when detected by the device</p>
          </div>
        )}
      </div>

      {/* Export Dialog Modal */}
      {showExportDialog && (
        <div className="fixed inset-0 z-50" onClick={() => setShowExportDialog(false)}>
          <div
            className="absolute top-24 right-8 bg-slate-50 rounded-xl shadow-2xl border border-slate-200 w-[420px] max-h-[calc(100vh-200px)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dialog header */}
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-700 to-green-600 rounded-t-xl">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <Download size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wide">Export Report</h3>
                  <p className="text-[10px] text-green-100">Styled Excel (.xlsx) with colored headers</p>
                </div>
              </div>
              <button
                onClick={() => setShowExportDialog(false)}
                className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto p-4 space-y-4">
              {/* What's included info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-[10px] font-bold text-blue-800 uppercase mb-2">📋  What's Included in the Excel File</p>
                <ul className="text-[10px] text-blue-700 space-y-1">
                  <li>📋 <strong>Summary Sheet</strong> — device info, totals, and notes</li>
                  <li>🏭 <strong>Production Sheet</strong> — units, targets, achievement %</li>
                  <li>⚙️ <strong>OEE Sheet</strong> — availability, performance, quality</li>
                  <li>🔧 <strong>Machine Perf. Sheet</strong> — vibration, pressure, noise + status</li>
                  <li>🌡️ <strong>Environment Sheet</strong> — temperature, humidity, CO2, AQI</li>
                </ul>
                <p className="text-[9px] text-blue-600 mt-2">Each sheet has colored headings, alternating row styles, and status indicators (🟢 🟡 🔴).</p>
              </div>

              {/* Charts Selection */}
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">📊  Sheets to Include</label>
                <div className="space-y-2.5">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedCharts.production}
                      onChange={() => toggleChartSelection('production')}
                      className="w-3.5 h-3.5 text-blue-500 rounded accent-blue-500"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">🏭  Production Volume</span>
                      <p className="text-[9px] text-slate-400">Date, units produced, target, achievement %</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedCharts.oee}
                      onChange={() => toggleChartSelection('oee')}
                      className="w-3.5 h-3.5 text-blue-500 rounded accent-blue-500"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">⚙️  OEE Trends</span>
                      <p className="text-[9px] text-slate-400">OEE %, availability, performance, quality + rating</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedCharts.machinePerformance}
                      onChange={() => toggleChartSelection('machinePerformance')}
                      className="w-3.5 h-3.5 text-blue-500 rounded accent-blue-500"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">🔧  Machine Performance</span>
                      <p className="text-[9px] text-slate-400">Vibration (mm/s), pressure (bar), noise (dB) + status</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedCharts.environmental}
                      onChange={() => toggleChartSelection('environmental')}
                      className="w-3.5 h-3.5 text-blue-500 rounded accent-blue-500"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">🌡️  Environmental Trends</span>
                      <p className="text-[9px] text-slate-400">Temperature (°C), humidity (%), CO2 (%), AQI + status</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Selected count badge */}
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] text-slate-500">
                  {Object.values(selectedCharts).filter(Boolean).length} of 4 sheets selected
                  <span className="text-slate-400"> + Summary always included</span>
                </span>
              </div>
            </div>

            <div className="flex gap-2 p-4 bg-white border-t border-slate-200 rounded-b-xl">
              <button
                onClick={selectAllCharts}
                className="flex-1 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors"
              >
                {Object.values(selectedCharts).every(val => val) ? 'Deselect All' : 'Select All'}
              </button>
              <button
                onClick={handleExport}
                disabled={!Object.values(selectedCharts).some(val => val)}
                className="flex-2 flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Download size={13} />
                Download .xlsx
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Range Dialog */}
      {showCustomRangeDialog && (
        <div className="absolute top-24 left-8 bg-slate-50 rounded-xl shadow-2xl p-5 w-96 z-50 border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase">Custom Date Range</h3>
            <button
              onClick={() => setShowCustomRangeDialog(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <p className="text-xs text-slate-600 mb-4">Select your custom date range and granularity for the historical data.</p>

          <div className="space-y-3 mb-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                min={customStartDate}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Granularity</label>
              <div className="flex gap-2">
                {['hourly', 'daily', 'monthly'].map((gran) => (
                  <button
                    key={gran}
                    onClick={() => setCustomGranularity(gran)}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${customGranularity === gran
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    {gran.charAt(0).toUpperCase() + gran.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowCustomRangeDialog(false)}
              className="flex-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyCustomRange}
              disabled={!customStartDate || !customEndDate}
              className="flex-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply Range
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoricalWindow;
