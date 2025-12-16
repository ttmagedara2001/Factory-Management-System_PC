import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import RealTimeWindow from './RealTimeWindow';
import FactoryStatus from './FactoryStatus';



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


const Dashboard = ({ bellClicked, thresholds, sensorData, webSocketClient, selectedDevice, onDeviceChange, devices, alerts, setAlerts }) => {
  // --- Production Counter and Log State ---
  const [unitCount, setUnitCount] = useState(0);
  const [productionLog, setProductionLog] = useState([]);
  const [yesterdayCount, setYesterdayCount] = useState(0);
  const logRef = useRef([]);

  // --- Load from localStorage on mount (per device, per day) ---
  useEffect(() => {
    if (!selectedDevice) return;
    const key = `unit_counter_${selectedDevice}`;
    const logKey = `unit_log_${selectedDevice}`;
    const raw = localStorage.getItem(key);
    const logRaw = localStorage.getItem(logKey);
    let count = 0;
    let log = [];
    // Today
    const todayStr = new Date().toISOString().slice(0, 10);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.date === todayStr) {
          count = parsed.count;
        }
      } catch {}
    }
    if (logRaw) {
      try {
        const parsed = JSON.parse(logRaw);
        // Only keep today's logs
        log = parsed.filter(l => isInTodayWindow(new Date(l.timestamp)));
      } catch {}
    }
    setUnitCount(count);
    setProductionLog(log);
    logRef.current = log;

    // Yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = `unit_counter_${selectedDevice}`;
    let yCount = 0;
    const yRaw = localStorage.getItem(yKey);
    const yStr = yesterday.toISOString().slice(0, 10);
    if (yRaw) {
      try {
        const parsed = JSON.parse(yRaw);
        if (parsed && parsed.date === yStr) {
          yCount = parsed.count;
        }
      } catch {}
    }
    setYesterdayCount(yCount);
  }, [selectedDevice]);

  // --- Listen for real-time unit stream data ---
  useEffect(() => {
    if (!webSocketClient || !selectedDevice) return;
    // Handler for unit stream
    const handleUnitStream = (data) => {
      // Only handle if data is for this device and is a unit stream
      if (data.sensorType === 'units' && data.value && typeof data.value === 'object') {
        const { tagId, productName } = data.value;
        if (!tagId || !productName) return;
        // Add to log and increment counter
        const now = new Date();
        let updatedLog;
        if (!isInTodayWindow(now)) {
          // New day, reset
          setUnitCount(1);
          updatedLog = [{ tagId, productName, timestamp: now.toISOString() }];
          setProductionLog(updatedLog);
          localStorage.setItem(`unit_counter_${selectedDevice}`, JSON.stringify({ date: now.toISOString().slice(0, 10), count: 1 }));
          localStorage.setItem(`unit_log_${selectedDevice}`, JSON.stringify(updatedLog));
          logRef.current = updatedLog;
        } else {
          setUnitCount(prev => {
            const newCount = prev + 1;
            localStorage.setItem(`unit_counter_${selectedDevice}`, JSON.stringify({ date: now.toISOString().slice(0, 10), count: newCount }));
            return newCount;
          });
          setProductionLog(prev => {
            updatedLog = [{ tagId, productName, timestamp: now.toISOString() }, ...prev];
            localStorage.setItem(`unit_log_${selectedDevice}`, JSON.stringify(updatedLog));
            logRef.current = updatedLog;
            return updatedLog;
          });
        }
        // Dispatch a custom event for real-time update in HistoricalWindow
        window.dispatchEvent(new CustomEvent('unitLogUpdated', { detail: { deviceId: selectedDevice, log: updatedLog || logRef.current } }));
      }
    };
    // Register callback
    const origCallback = webSocketClient.dataCallback;
    webSocketClient.dataCallback = (data) => {
      if (origCallback) origCallback(data);
      handleUnitStream(data);
    };
    return () => {
      webSocketClient.dataCallback = origCallback;
    };
  }, [webSocketClient, selectedDevice]);

  // --- Reset at midnight ---
  useEffect(() => {
    const now = new Date();
    const msToMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0) - now;
    const timeout = setTimeout(() => {
      setUnitCount(0);
      setProductionLog([]);
      if (selectedDevice) {
        localStorage.setItem(`unit_counter_${selectedDevice}`, JSON.stringify({ date: new Date().toISOString().slice(0, 10), count: 0 }));
        localStorage.setItem(`unit_log_${selectedDevice}`, JSON.stringify([]));
      }
    }, msToMidnight + 1000);
    return () => clearTimeout(timeout);
  }, [selectedDevice]);

  // --- Format log for table ---
  const logData = productionLog.map(row => {
    const d = new Date(row.timestamp);
    return {
      date: d.toLocaleDateString(),
      time: d.toLocaleTimeString(),
      tag: row.tagId,
      product: row.productName
    };
  });

  // --- Calculate percent change ---
  let percentChange = 0;
  if (yesterdayCount > 0) {
    percentChange = ((unitCount - yesterdayCount) / yesterdayCount) * 100;
  } else if (unitCount > 0) {
    percentChange = 100;
  }
  const percentChangeStr = `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}%`;

  // --- Main Render ---
  return (
    <div className="p-8 max-w-[1600px] mx-auto">

      {/* Dashboard Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-slate-800 uppercase tracking-wide">Dashboard</h1>
          {/* Show selected device name */}
          <span className="ml-4 px-2 py-1 rounded text-base font-semibold text-blue-700 bg-blue-50">
            {devices?.find((d) => d.id === selectedDevice)?.name || selectedDevice}
            <span className="text-xs text-slate-500 ml-2">({selectedDevice})</span>
          </span>
        </div>
        <FactoryStatus />
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left Column (Main Metrics) - Spans 8 cols */}
        <div className="col-span-12 xl:col-span-8">
          
          {/* Production & Logistics Header */}
          <h2 className="text-sm font-bold text-slate-800 uppercase mb-4">Production and Logistics</h2>

          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Daily Production */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Daily Production</h3>
              <div className="text-4xl font-extrabold text-slate-800 mb-2">{unitCount}</div>
              <div className="flex items-center gap-2">
                <div className={`flex items-center text-xs font-bold bg-green-50 px-1 rounded ${percentChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  <TrendingUp size={12} className="mr-1"/>
                  {percentChangeStr}
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Target 1024 Units</span>
              </div>
            </div>

            {/* Overall Efficiency */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Overall Efficiency</h3>
              <div className="text-4xl font-extrabold text-slate-800 mb-2">87.3%</div>
              <div className="flex items-center gap-2">
                <div className="flex items-center text-green-500 text-xs font-bold bg-green-50 px-1 rounded">
                  <TrendingUp size={12} className="mr-1"/>
                  +2.3%
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Above Target</span>
              </div>
            </div>
          </div>

          {/* OEE Bar */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 mb-8">
            <div className="flex justify-between items-end mb-2">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase">Overall Equipment Efficiency (OEE)</h3>
              <span className="text-xs font-bold text-green-500">92.5%</span>
            </div>
            <div className="h-8 bg-slate-50 rounded w-full flex gap-[2px] overflow-hidden">
              {/* Simulated segmented progress bar */}
              {Array.from({ length: 50 }).map((_, i) => (
                <div 
                  key={i} 
                  className={`flex-1 h-full rounded-sm ${i < 42 ? 'bg-[#4ADE80]' : 'bg-slate-200'}`}
                ></div>
              ))}
            </div>
          </div>

          {/* Real Time Window Component */}
          <RealTimeWindow thresholds={thresholds} sensorData={sensorData} webSocketClient={webSocketClient} selectedDevice={selectedDevice} />

        </div>

        {/* Right Column (Logs & Charts) - Spans 4 cols */}
        <div className="col-span-12 xl:col-span-4 space-y-6">
          
          {/* Production Log */}
          <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-[10px] font-bold text-slate-800 uppercase p-4 pb-2 text-center">Recent Production Log</h3>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#D1D5DB] text-slate-700 font-bold uppercase sticky top-0">
                  <tr>
                    <th className="p-2 pl-3">Date</th>
                    <th className="p-2">Time</th>
                    <th className="p-2">Tag ID</th>
                    <th className="p-2">Product Name</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logData.length === 0 ? (
                    <tr><td colSpan={4} className="text-center text-slate-400 py-4">No production logs for today</td></tr>
                  ) : (
                    logData.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 text-slate-600 font-medium">
                        <td className="p-2 pl-3 whitespace-nowrap">{row.date}</td>
                        <td className="p-2 whitespace-nowrap">{row.time}</td>
                        <td className="p-2 whitespace-nowrap">{row.tag}</td>
                        <td className="p-2 truncate max-w-[120px]">{row.product}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Overall Efficiency Chart removed: productionData is not defined. Add chart logic if needed. */}

          {/* Active Alerts (only for selected device, filtered in App.jsx) */}
          <div 
            id="active-alerts" 
            className={`bg-white p-6 rounded-xl shadow-sm border border-slate-100 transition-all duration-500 ${
              bellClicked ? 'ring-4 ring-yellow-400 ring-opacity-75 shadow-2xl shadow-yellow-200' : ''
            }`}
            style={{ maxHeight: '260px', overflowY: 'auto' }}
          >
            <h3 className="text-[10px] font-bold text-slate-800 uppercase mb-4">Active Alerts</h3>
            <div className="space-y-3">
              {alerts && alerts.length > 0 ? (
                // Only show one alert per unique sensorType, value, and deviceId
                Array.from(
                  new Map(
                    alerts.map(a => [a.sensorType + '_' + a.value + '_' + a.deviceId, a])
                  ).values()
                ).map((alert, i) => (
                  <div key={i} className={`flex justify-between items-start p-3 rounded-md border-l-4 ${alert.severity === 'critical' ? 'bg-red-50 border-red-500' : alert.severity === 'warning' ? 'bg-yellow-50 border-yellow-500' : 'bg-[#FEF3C7] border-[#FBBF24]'}`}>
                    <p className={`text-[10px] font-bold leading-tight w-3/4 ${alert.severity === 'critical' ? 'text-red-900' : alert.severity === 'warning' ? 'text-yellow-900' : 'text-slate-700'}`}>
                      {alert.msg}
                    </p>
                    <span className={`text-[10px] font-bold ${alert.severity === 'critical' ? 'text-red-600' : alert.severity === 'warning' ? 'text-yellow-600' : 'text-slate-500'}`}>{alert.time}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 text-center">No active alerts</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
