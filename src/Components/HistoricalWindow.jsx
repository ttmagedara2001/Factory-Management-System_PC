import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { History, Calendar, Download, Filter, Search, TrendingUp, AlertTriangle, Eye, EyeOff, X, Loader2, RefreshCw } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, CartesianGrid, ReferenceLine } from 'recharts';
import {
  fetchAllHistoricalData,
  getOEEChartData,
  getDowntimeParetoData,
  getMTBFHours,
  analyzeAlertForDowntime,
  formatAlertsAsEventLog,
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
  currentUnits = 0
}) => {
  const [dateRange, setDateRange] = useState('24h');
  const [granularity, setGranularity] = useState('hourly');
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
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
    environmental: true,
    downtime: true,
    eventLog: true
  });

  // Environmental metrics visibility state
  const [envVisibility, setEnvVisibility] = useState({
    temperature: true,
    humidity: true,
    co2: true,
    aqi: true
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
  const eventLogData = formatAlertsAsEventLog(alerts);


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

      // Update state with HTTP data
      setProductionData(result.productionData || []);
      setMachinePerformanceData(result.machinePerformanceData || []);
      setEnvironmentalData(result.environmentalData || []);

      // OEE and Downtime from localStorage (calculated locally)
      setOeeData(result.oeeData || [{ week: new Date().toISOString().split('T')[0], oee: 0 }]);
      setDowntimeData(result.downtimeData || []);
      setMtbfHours(result.mtbf || 0);

      setLastUpdated(new Date());
      console.log(`✅ [Historical] Data loaded successfully`);
    } catch (error) {
      console.error(`❌ [Historical] Error loading data:`, error);
      setDataError(error.message || 'Failed to load historical data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDevice, dateRange]);

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
        // Refresh downtime data
        setDowntimeData(getDowntimeParetoData());
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

  const convertToCSV = (data, headers) => {
    const csvRows = [];
    csvRows.push(headers.join(','));

    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header.toLowerCase().replace(' ', '')];
        return `"${value}"`;
      });
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  };

  const downloadCSV = (csvContent, filename) => {
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    const timestamp = new Date().toISOString().split('T')[0];

    // Determine which data to export based on selected range
    let exportRange, exportGran;
    if (exportDateRange === 'current') {
      exportRange = dateRange;
      exportGran = granularity;
    } else {
      exportRange = exportDateRange;
      exportGran = 'daily'; // Default granularity for export
    }

    // Generate data for export range
    const exportMachineData = machinePerformanceData;
    const exportEnvData = environmentalData;
    const exportProdData = productionData;
    const exportOEEData = oeeData;

    if (selectedCharts.production) {
      const csv = convertToCSV(exportProdData, ['Date', 'Produced', 'Target']);
      downloadCSV(csv, `production_volume_${timestamp}.csv`);
    }

    if (selectedCharts.oee) {
      const csv = convertToCSV(exportOEEData, ['Week', 'OEE']);
      downloadCSV(csv, `oee_trends_${timestamp}.csv`);
    }

    if (selectedCharts.machinePerformance) {
      const csv = convertToCSV(exportMachineData, ['Time', 'Vibration', 'Pressure', 'Noise']);
      downloadCSV(csv, `machine_performance_${timestamp}.csv`);
    }

    if (selectedCharts.environmental) {
      const csv = convertToCSV(exportEnvData, ['Time', 'Temperature', 'Humidity', 'CO2', 'AQI']);
      downloadCSV(csv, `environmental_trends_${timestamp}.csv`);
    }

    if (selectedCharts.downtime) {
      const csv = convertToCSV(downtimeData, ['Cause', 'Occurrences']);
      downloadCSV(csv, `downtime_analysis_${timestamp}.csv`);
    }

    if (selectedCharts.eventLog) {
      const csv = convertToCSV(filteredEvents, ['Timestamp', 'Severity', 'Device', 'Event', 'Code']);
      downloadCSV(csv, `event_log_${timestamp}.csv`);
    }

    setShowExportDialog(false);
  };

  const handleApplyCustomRange = () => {
    if (customStartDate && customEndDate) {
      setDateRange('custom');
      setGranularity(customGranularity);
      setShowCustomRangeDialog(false);
    }
  };

  const filteredEvents = eventLogData.filter(event => {
    const matchesSearch = event.event?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.device?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || event.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-2 sm:gap-3">
          <History size={24} className="text-slate-600" />
          <h1 className="text-lg sm:text-xl font-bold text-slate-800 uppercase tracking-wide">Historical Data</h1>
          <button
            onClick={loadHistoricalData}
            disabled={isLoading}
            className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
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

      {/* Time Range & Interval Controls */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Time Range & Interval Dropdowns */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            {/* Time Range Dropdown */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600 font-medium">Time Range</span>
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
                  className="appearance-none bg-white border border-slate-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer hover:border-slate-400 transition-colors min-w-[100px]"
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
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Interval Dropdown */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600 font-medium">Interval</span>
              <div className="relative">
                <select
                  value={granularity}
                  onChange={(e) => setGranularity(e.target.value)}
                  className="appearance-none bg-white border border-slate-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer hover:border-slate-400 transition-colors min-w-[120px]"
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
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Refresh & Export Buttons */}
          <div className="flex items-center gap-3">
            {/* Last Updated Indicator */}
            {lastUpdated && !isLoading && (
              <span className="text-xs text-slate-400">
                Updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}

            {/* Export Button */}
            <button
              onClick={() => setShowExportDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm"
            >
              <Download size={16} />
              Export Data
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {dataError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="text-red-500" size={20} />
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

      {/* Production Volume & OEE Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl">
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-slate-200">
              <Loader2 className="animate-spin text-blue-500" size={18} />
              <span className="text-xs sm:text-sm font-medium text-slate-600">Loading...</span>
            </div>
          </div>
        )}
        <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 mb-4">
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase">Production Volume</h3>
            <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs">
              <span className="text-slate-500">Current: <span className="font-bold text-blue-600">{currentUnits || 0}</span></span>
              <span className="text-slate-500">Target: <span className="font-bold text-green-600">{targetUnits}</span></span>
            </div>
          </div>
          <div className="chart-responsive">
          <ResponsiveContainer width="100%" height={200} minWidth={0}>
            <BarChart data={productionData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} width={35} />
              <Tooltip contentStyle={{ fontSize: '11px' }} />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              <ReferenceLine y={targetUnits} stroke="#10B981" strokeDasharray="5 5" strokeWidth={2} label={{ value: `Target`, fill: '#10B981', fontSize: 9, position: 'insideTopRight' }} />
              <Bar dataKey="produced" fill="#3B82F6" name="Produced" />
              <Bar dataKey="target" fill="#94a3b8" name="Target" />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase mb-4">OEE Trends</h3>
          <div className="chart-responsive">
          <ResponsiveContainer width="100%" height={200} minWidth={0}>
            <LineChart data={oeeData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#94a3b8' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} domain={[0, 100]} width={35} />
              <Tooltip contentStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="oee" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} name="OEE %" />
            </LineChart>
          </ResponsiveContainer>
          </div>
          <div className="mt-3 sm:mt-4 flex items-center gap-2 text-[10px] sm:text-xs">
            <TrendingUp size={14} className="sm:w-4 sm:h-4 text-green-500" />
            <span className="font-semibold text-slate-600">MTBF: <span className="text-green-600">{mtbfHours > 0 ? `${mtbfHours}h` : '0h'}</span></span>
          </div>
        </div>
      </div>

      {/* Machine Performance & Environmental Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-4">
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase">Machine Performance Trends</h3>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              <button
                onClick={() => toggleMachineMetric('vibration')}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded text-[10px] sm:text-xs font-semibold transition-colors ${machineVisibility.vibration ? 'bg-purple-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
              >
                {machineVisibility.vibration ? <Eye size={12} className="sm:w-[14px] sm:h-[14px]" /> : <EyeOff size={12} className="sm:w-[14px] sm:h-[14px]" />}
                <span className="hidden xs:inline">Vibration</span>
                <span className="xs:hidden">Vib</span>
              </button>
              <button
                onClick={() => toggleMachineMetric('pressure')}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded text-[10px] sm:text-xs font-semibold transition-colors ${machineVisibility.pressure ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
              >
                {machineVisibility.pressure ? <Eye size={12} className="sm:w-[14px] sm:h-[14px]" /> : <EyeOff size={12} className="sm:w-[14px] sm:h-[14px]" />}
                <span className="hidden xs:inline">Pressure</span>
                <span className="xs:hidden">Pres</span>
              </button>
              <button
                onClick={() => toggleMachineMetric('noise')}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded text-[10px] sm:text-xs font-semibold transition-colors ${machineVisibility.noise ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
              >
                {machineVisibility.noise ? <Eye size={12} className="sm:w-[14px] sm:h-[14px]" /> : <EyeOff size={12} className="sm:w-[14px] sm:h-[14px]" />}
                Noise
              </button>
            </div>
          </div>
          <div className="chart-responsive">
          <ResponsiveContainer width="100%" height={250} minWidth={0}>
            <LineChart data={machinePerformanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              {/* Threshold reference lines */}
              {machineVisibility.vibration && thresholds.vibration?.critical && (
                <ReferenceLine yAxisId="left" y={thresholds.vibration.critical} stroke="#EF4444" strokeDasharray="5 5" strokeWidth={1} label={{ value: `Vib Critical: ${thresholds.vibration.critical}`, fill: '#EF4444', fontSize: 9, position: 'insideTopRight' }} />
              )}
              {machineVisibility.noise && thresholds.noise?.critical && (
                <ReferenceLine yAxisId="right" y={thresholds.noise.critical} stroke="#F59E0B" strokeDasharray="5 5" strokeWidth={1} label={{ value: `Noise: ${thresholds.noise.critical}dB`, fill: '#F59E0B', fontSize: 9, position: 'insideBottomRight' }} />
              )}
              {machineVisibility.vibration && (
                <Line yAxisId="left" type="monotone" dataKey="vibration" stroke="#A855F7" strokeWidth={2} dot={{ r: 3 }} name="Vibration (mm/s)" />
              )}
              {machineVisibility.pressure && (
                <Line yAxisId="right" type="monotone" dataKey="pressure" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} name="Pressure (bar)" />
              )}
              {machineVisibility.noise && (
                <Line yAxisId="right" type="monotone" dataKey="noise" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} name="Noise (dB)" />
              )}
            </LineChart>
          </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-4">
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase">Environmental Trends</h3>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              <button
                onClick={() => toggleEnvMetric('temperature')}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded text-[10px] sm:text-xs font-semibold transition-colors ${envVisibility.temperature ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
              >
                {envVisibility.temperature ? <Eye size={12} className="sm:w-[14px] sm:h-[14px]" /> : <EyeOff size={12} className="sm:w-[14px] sm:h-[14px]" />}
                Temp
              </button>
              <button
                onClick={() => toggleEnvMetric('humidity')}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded text-[10px] sm:text-xs font-semibold transition-colors ${envVisibility.humidity ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
              >
                {envVisibility.humidity ? <Eye size={12} className="sm:w-[14px] sm:h-[14px]" /> : <EyeOff size={12} className="sm:w-[14px] sm:h-[14px]" />}
                <span className="hidden xs:inline">Humidity</span>
                <span className="xs:hidden">Hum</span>
              </button>
              <button
                onClick={() => toggleEnvMetric('co2')}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded text-[10px] sm:text-xs font-semibold transition-colors ${envVisibility.co2 ? 'bg-pink-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
              >
                {envVisibility.co2 ? <Eye size={12} className="sm:w-[14px] sm:h-[14px]" /> : <EyeOff size={12} className="sm:w-[14px] sm:h-[14px]" />}
                CO2
              </button>
              <button
                onClick={() => toggleEnvMetric('aqi')}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded text-[10px] sm:text-xs font-semibold transition-colors ${envVisibility.aqi ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
              >
                {envVisibility.aqi ? <Eye size={12} className="sm:w-[14px] sm:h-[14px]" /> : <EyeOff size={12} className="sm:w-[14px] sm:h-[14px]" />}
                AQI
              </button>
            </div>
          </div>
          <div className="chart-responsive">
          <ResponsiveContainer width="100%" height={200} minWidth={0}>
            <LineChart data={environmentalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              {/* Threshold reference lines for environmental sensors */}
              {envVisibility.temperature && thresholds.temperature?.max && (
                <ReferenceLine y={thresholds.temperature.max} stroke="#EF4444" strokeDasharray="5 5" strokeWidth={1} label={{ value: `Temp Max: ${thresholds.temperature.max}°C`, fill: '#EF4444', fontSize: 9, position: 'insideTopRight' }} />
              )}
              {envVisibility.humidity && thresholds.humidity?.max && (
                <ReferenceLine y={thresholds.humidity.max} stroke="#3B82F6" strokeDasharray="5 5" strokeWidth={1} label={{ value: `Hum Max: ${thresholds.humidity.max}%`, fill: '#3B82F6', fontSize: 9, position: 'insideBottomRight' }} />
              )}
              {envVisibility.co2 && thresholds.co2?.max && (
                <ReferenceLine y={thresholds.co2.max} stroke="#EC4899" strokeDasharray="5 5" strokeWidth={1} label={{ value: `CO2 Max: ${thresholds.co2.max}`, fill: '#EC4899', fontSize: 9, position: 'insideTopLeft' }} />
              )}
              {envVisibility.temperature && (
                <Line type="monotone" dataKey="temperature" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} name="Temperature (°C)" />
              )}
              {envVisibility.humidity && (
                <Line type="monotone" dataKey="humidity" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} name="Humidity (%)" />
              )}
              {envVisibility.co2 && (
                <Line type="monotone" dataKey="co2" stroke="#EC4899" strokeWidth={2} dot={{ r: 3 }} name="CO2 (%)" />
              )}
              {envVisibility.aqi && (
                <Line type="monotone" dataKey="aqi" stroke="#14B8A6" strokeWidth={2} dot={{ r: 3 }} name="Air Quality Index" />
              )}
            </LineChart>
          </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Downtime Analysis & Event Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="sm:w-5 sm:h-5 text-yellow-600" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase">Downtime Causes (Pareto)</h3>
          </div>
          <div className="chart-responsive">
          <ResponsiveContainer width="100%" height={200} minWidth={0}>
            <BarChart data={downtimeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis type="category" dataKey="cause" tick={{ fontSize: 10, fill: '#94a3b8' }} width={100} />
              <Tooltip />
              <Bar dataKey="occurrences" fill="#EF4444" name="Occurrences" />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase">Event Log</h3>
            <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2">
              <div className="relative flex-1 xs:flex-none">
                <Search size={14} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full xs:w-auto pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-slate-600 hidden xs:block" />
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="flex-1 xs:flex-none px-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="Critical">Critical</option>
                  <option value="Warning">Warning</option>
                  <option value="Info">Info</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase sticky top-0">
                <tr>
                  <th className="p-2 text-left">Timestamp</th>
                  <th className="p-2 text-left">Severity</th>
                  <th className="p-2 text-left">Device</th>
                  <th className="p-2 text-left">Event</th>
                  <th className="p-2 text-left">Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.map((event, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-2 whitespace-nowrap text-slate-600 font-medium">{event.timestamp}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${event.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                        event.severity === 'Warning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                        {event.severity}
                      </span>
                    </td>
                    <td className="p-2 text-slate-700 font-semibold">{event.device}</td>
                    <td className="p-2 text-slate-600">{event.event}</td>
                    <td className="p-2 text-slate-500 font-mono">{event.code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Export Dialog Modal */}
      {showExportDialog && (
        <div className="fixed inset-0 z-50" onClick={() => setShowExportDialog(false)}>
          <div
            className="absolute top-24 right-8 bg-slate-50 rounded-xl shadow-2xl border border-slate-200 w-96 max-h-[calc(100vh-200px)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 bg-white border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 uppercase">Export Data</h3>
              <button
                onClick={() => setShowExportDialog(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto p-4 space-y-4">
              {/* Date Range Selection for Export */}
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Export Range</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="exportRange"
                      value="current"
                      checked={exportDateRange === 'current'}
                      onChange={() => setExportDateRange('current')}
                      className="w-3 h-3 text-blue-500"
                    />
                    <span className="text-slate-700">Current View</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="exportRange"
                      value="24h"
                      checked={exportDateRange === '24h'}
                      onChange={() => setExportDateRange('24h')}
                      className="w-3 h-3 text-blue-500"
                    />
                    <span className="text-slate-700">Last 24 Hours</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="exportRange"
                      value="7d"
                      checked={exportDateRange === '7d'}
                      onChange={() => setExportDateRange('7d')}
                      className="w-3 h-3 text-blue-500"
                    />
                    <span className="text-slate-700">Last 7 Days</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="exportRange"
                      value="30d"
                      checked={exportDateRange === '30d'}
                      onChange={() => setExportDateRange('30d')}
                      className="w-3 h-3 text-blue-500"
                    />
                    <span className="text-slate-700">Last 30 Days</span>
                  </label>
                </div>
              </div>

              {/* Charts Selection */}
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Select Charts</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={selectedCharts.production}
                      onChange={() => toggleChartSelection('production')}
                      className="w-3 h-3 text-blue-500 rounded"
                    />
                    <span className="text-slate-700">Production Volume</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={selectedCharts.oee}
                      onChange={() => toggleChartSelection('oee')}
                      className="w-3 h-3 text-blue-500 rounded"
                    />
                    <span className="text-slate-700">OEE Trends</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={selectedCharts.machinePerformance}
                      onChange={() => toggleChartSelection('machinePerformance')}
                      className="w-3 h-3 text-blue-500 rounded"
                    />
                    <span className="text-slate-700">Machine Performance</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={selectedCharts.environmental}
                      onChange={() => toggleChartSelection('environmental')}
                      className="w-3 h-3 text-blue-500 rounded"
                    />
                    <span className="text-slate-700">Environmental Trends</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={selectedCharts.downtime}
                      onChange={() => toggleChartSelection('downtime')}
                      className="w-3 h-3 text-blue-500 rounded"
                    />
                    <span className="text-slate-700">Downtime Analysis</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={selectedCharts.eventLog}
                      onChange={() => toggleChartSelection('eventLog')}
                      className="w-3 h-3 text-blue-500 rounded"
                    />
                    <span className="text-slate-700">Event Log</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-2 p-4 bg-white border-t border-slate-200">
              <button
                onClick={selectAllCharts}
                className="flex-1 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors"
              >
                {Object.values(selectedCharts).every(val => val) ? 'Deselect All' : 'Select All'}
              </button>
              <button
                onClick={handleExport}
                disabled={!Object.values(selectedCharts).some(val => val)}
                className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg text-xs font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Export
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
