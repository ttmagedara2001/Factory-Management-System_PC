// Helper: Get start of today (12am) and end of today (next 12am)
function getTodayWindow() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

function isInTodayWindow(date) {
  const { start, end } = getTodayWindow();
  return date >= start && date < end;
}
import React, { useState, useMemo, useEffect } from 'react';
import { History, Calendar, Download, Filter, Search, TrendingUp, AlertTriangle, Eye, EyeOff, X } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, CartesianGrid } from 'recharts';
import FactoryStatus from './FactoryStatus';

import { getSensorDataGrouped } from '../services/localStorageService';

const HistoricalWindow = ({ alerts = [], setAlerts, devices = [], selectedDevice, setSelectedDevice }) => {
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

    // Data arrays - fetched from localStorage every 30s
    const [machinePerformanceData, setMachinePerformanceData] = useState([]);
    const [environmentalData, setEnvironmentalData] = useState([]);
    const [productionData, setProductionData] = useState([]);
    const [oeeData, setOeeData] = useState([]);
    const [downtimeData, setDowntimeData] = useState([]);
    const [unitLog, setUnitLog] = useState([]);
    const eventLogData = alerts.map(alert => ({
      timestamp: alert.time,
      severity: alert.severity || 'info',
      device: alert.deviceId || '',
      event: alert.msg,
      code: alert.sensorType || '',
    }));

    // Fetch historical data from localStorage every 30s and update unitLog in real time
    useEffect(() => {
      let intervalId;
      const fetchHistoricalData = () => {
        // Get grouped sensor data for the selected device
        const grouped = getSensorDataGrouped(selectedDevice);
        // Machine performance: vibration, pressure, noise
        const machineData = [];
        const envData = [];
        const prodData = [];
        const oeeDataArr = [];
        if (grouped) {
          // Assume all arrays are sorted newest first
          const length = Math.max(
            grouped.vibration?.length || 0,
            grouped.pressure?.length || 0,
            grouped.noise?.length || 0,
            grouped.temperature?.length || 0,
            grouped.humidity?.length || 0,
            grouped.co2?.length || 0,
            grouped.aqi?.length || 0,
            grouped.units?.length || 0
          );
          for (let i = 0; i < length; i++) {
            // Find the closest timestamp for each metric
            const time = grouped.vibration?.[i]?.timestamp || grouped.pressure?.[i]?.timestamp || grouped.noise?.[i]?.timestamp || grouped.temperature?.[i]?.timestamp;
            machineData.push({
              time,
              vibration: grouped.vibration?.[i]?.value,
              pressure: grouped.pressure?.[i]?.value,
              noise: grouped.noise?.[i]?.value,
            });
            envData.push({
              time,
              temperature: grouped.temperature?.[i]?.value,
              humidity: grouped.humidity?.[i]?.value,
              co2: grouped.co2?.[i]?.value,
              aqi: grouped.aqi?.[i]?.value,
            });
            prodData.push({
              date: time ? time.slice(0, 10) : '',
              produced: grouped.units?.[i]?.value,
              target: 1024,
            });
            oeeDataArr.push({
              week: time ? time.slice(0, 10) : '',
              oee: 90 + Math.random() * 5 // Example OEE, replace with real if available
            });
          }
        }
        setMachinePerformanceData(machineData);
        setEnvironmentalData(envData);
        setProductionData(prodData);
        setOeeData(oeeDataArr);

        // --- Sync unit log from Dashboard (tagId, productName, timestamp) ---
        if (selectedDevice) {
          const logKey = `unit_log_${selectedDevice}`;
          const logRaw = localStorage.getItem(logKey);
          let log = [];
          if (logRaw) {
            try {
              const parsed = JSON.parse(logRaw);
              // Only keep today's logs
              log = parsed.filter(l => isInTodayWindow(new Date(l.timestamp)));
            } catch {}
          }
          setUnitLog(log);
        }
      };
      fetchHistoricalData();
      intervalId = setInterval(fetchHistoricalData, 30000);

      // Listen for real-time unit log updates from Dashboard
      const handleUnitLogUpdate = (e) => {
        if (e.detail && e.detail.deviceId === selectedDevice) {
          setUnitLog(e.detail.log);
        }
      };
      window.addEventListener('unitLogUpdated', handleUnitLogUpdate);

      return () => {
        clearInterval(intervalId);
        window.removeEventListener('unitLogUpdated', handleUnitLogUpdate);
      };
    }, [selectedDevice]);

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
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <History size={28} className="text-slate-600" />
          <h1 className="text-xl font-bold text-slate-800 uppercase tracking-wide">Historical Data Analysis</h1>
        </div>
          {/* Device selector */}
          <div>
            <select
              className="border rounded px-2 py-1 text-xs"
              value={selectedDevice}
              onChange={e => setSelectedDevice(e.target.value)}
            >
              {devices.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <FactoryStatus />
      </div>

      {/* Date Range & Granularity Controls */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Calendar size={20} className="text-slate-600" />
            <span className="text-xs font-bold text-slate-600 uppercase">Time Range:</span>
            <div className="flex gap-2">
              {['24h', '7d', '30d'].map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    dateRange === range
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {range === '24h' ? 'Last 24 Hours' : range === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
                </button>
              ))}
              <button
                onClick={() => setShowCustomRangeDialog(true)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  dateRange === 'custom'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {dateRange === 'custom' && customStartDate && customEndDate 
                  ? `${new Date(customStartDate).toLocaleDateString()} - ${new Date(customEndDate).toLocaleDateString()}`
                  : 'Custom Range'
                }
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-600 uppercase">Granularity:</span>
            <div className="flex gap-2">
              {['hourly', 'daily', 'monthly'].map((gran) => (
                <button
                  key={gran}
                  onClick={() => setGranularity(gran)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    granularity === gran
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {gran.charAt(0).toUpperCase() + gran.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={() => setShowExportDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            <Download size={16} />
            Export Data
          </button>
        </div>
      </div>

      {/* Production Volume & OEE Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 uppercase mb-4">Production Volume Trends</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={productionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{fontSize: 10, fill: '#94a3b8'}} />
              <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} />
              <Tooltip />
              <Legend wrapperStyle={{fontSize: '11px'}} />
              <Bar dataKey="produced" fill="#3B82F6" name="Produced" />
              <Bar dataKey="target" fill="#94a3b8" name="Target" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 uppercase mb-4">OEE Trends (Weekly)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={oeeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{fontSize: 10, fill: '#94a3b8'}} />
              <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} domain={[75, 95]} />
              <Tooltip />
              <Line type="monotone" dataKey="oee" stroke="#10B981" strokeWidth={3} dot={{r: 4}} name="OEE %" />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <TrendingUp size={16} className="text-green-500" />
            <span className="font-semibold text-slate-600">MTBF (Mean Time Between Failures): <span className="text-green-600">127.5 hours</span></span>
          </div>
        </div>
      </div>

      {/* Machine Performance & Environmental Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase">Machine Performance Trends</h3>
            <div className="flex gap-2">
              <button
                onClick={() => toggleMachineMetric('vibration')}
                className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  machineVisibility.vibration ? 'bg-purple-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {machineVisibility.vibration ? <Eye size={14} /> : <EyeOff size={14} />}
                Vibration
              </button>
              <button
                onClick={() => toggleMachineMetric('pressure')}
                className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  machineVisibility.pressure ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {machineVisibility.pressure ? <Eye size={14} /> : <EyeOff size={14} />}
                Pressure
              </button>
              <button
                onClick={() => toggleMachineMetric('noise')}
                className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  machineVisibility.noise ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {machineVisibility.noise ? <Eye size={14} /> : <EyeOff size={14} />}
                Noise
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={machinePerformanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{fontSize: 10, fill: '#94a3b8'}} />
              <YAxis yAxisId="left" tick={{fontSize: 10, fill: '#94a3b8'}} />
              <YAxis yAxisId="right" orientation="right" tick={{fontSize: 10, fill: '#94a3b8'}} />
              <Tooltip />
              <Legend wrapperStyle={{fontSize: '11px'}} />
              {machineVisibility.vibration && (
                <Line yAxisId="left" type="monotone" dataKey="vibration" stroke="#A855F7" strokeWidth={2} dot={{r: 3}} name="Vibration (mm/s)" />
              )}
              {machineVisibility.pressure && (
                <Line yAxisId="right" type="monotone" dataKey="pressure" stroke="#3B82F6" strokeWidth={2} dot={{r: 3}} name="Pressure (bar)" />
              )}
              {machineVisibility.noise && (
                <Line yAxisId="right" type="monotone" dataKey="noise" stroke="#F59E0B" strokeWidth={2} dot={{r: 3}} name="Noise (dB)" />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase">Environmental Trends</h3>
            <div className="flex gap-2">
              <button
                onClick={() => toggleEnvMetric('temperature')}
                className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  envVisibility.temperature ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {envVisibility.temperature ? <Eye size={14} /> : <EyeOff size={14} />}
                Temp
              </button>
              <button
                onClick={() => toggleEnvMetric('humidity')}
                className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  envVisibility.humidity ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {envVisibility.humidity ? <Eye size={14} /> : <EyeOff size={14} />}
                Humidity
              </button>
              <button
                onClick={() => toggleEnvMetric('co2')}
                className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  envVisibility.co2 ? 'bg-pink-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {envVisibility.co2 ? <Eye size={14} /> : <EyeOff size={14} />}
                CO2
              </button>
              <button
                onClick={() => toggleEnvMetric('aqi')}
                className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  envVisibility.aqi ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {envVisibility.aqi ? <Eye size={14} /> : <EyeOff size={14} />}
                AQI
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={environmentalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{fontSize: 10, fill: '#94a3b8'}} />
              <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} />
              <Tooltip />
              <Legend wrapperStyle={{fontSize: '11px'}} />
              {envVisibility.temperature && (
                <Line type="monotone" dataKey="temperature" stroke="#10B981" strokeWidth={2} dot={{r: 3}} name="Temperature (°C)" />
              )}
              {envVisibility.humidity && (
                <Line type="monotone" dataKey="humidity" stroke="#3B82F6" strokeWidth={2} dot={{r: 3}} name="Humidity (%)" />
              )}
              {envVisibility.co2 && (
                <Line type="monotone" dataKey="co2" stroke="#EC4899" strokeWidth={2} dot={{r: 3}} name="CO2 (%)" />
              )}
              {envVisibility.aqi && (
                <Line type="monotone" dataKey="aqi" stroke="#14B8A6" strokeWidth={2} dot={{r: 3}} name="Air Quality Index" />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Downtime Analysis & Event Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={20} className="text-yellow-600" />
            <h3 className="text-sm font-bold text-slate-800 uppercase">Downtime Causes (Pareto Analysis)</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={downtimeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{fontSize: 10, fill: '#94a3b8'}} />
              <YAxis type="category" dataKey="cause" tick={{fontSize: 10, fill: '#94a3b8'}} width={100} />
              <Tooltip />
              <Bar dataKey="occurrences" fill="#EF4444" name="Occurrences" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase">Detailed Event Log</h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-slate-600" />
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Severities</option>
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
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                        event.severity === 'Critical' ? 'bg-red-100 text-red-800' :
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
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      customGranularity === gran
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
