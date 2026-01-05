import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import RealTimeWindow from './RealTimeWindow';
import FactoryStatus from './FactoryStatus';


const productionData = [];
const logData = [];


const Dashboard = ({ bellClicked, thresholds, sensorData, webSocketClient, selectedDevice, onDeviceChange, devices, alerts, setAlerts }) => {
  // No local device selection; use selectedDevice prop only

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">

      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <h1 className="text-lg sm:text-xl font-bold text-slate-800 uppercase tracking-wide">Dashboard</h1>
          {/* Show selected device name */}
          <span className="px-2 py-1 rounded text-xs sm:text-base font-semibold text-blue-700 bg-blue-50">
            <span className="hidden sm:inline">{devices?.find((d) => d.id === selectedDevice)?.name || selectedDevice}</span>
            <span className="sm:hidden">{devices?.find((d) => d.id === selectedDevice)?.name?.split(' - ')[0] || 'Device'}</span>
            <span className="text-[10px] sm:text-xs text-slate-500 ml-1 sm:ml-2 hidden md:inline">({selectedDevice})</span>
          </span>
        </div>
        <FactoryStatus />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
        {/* Left Column (Main Metrics) - Spans 8 cols on large screens */}
        <div className="lg:col-span-8">

          {/* Production & Logistics Header */}
          <h2 className="text-xs sm:text-sm font-bold text-slate-800 uppercase mb-3 sm:mb-4">Production and Logistics</h2>

          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            {/* Daily Production */}
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Daily Production</h3>
              <div className="text-2xl sm:text-4xl font-extrabold text-slate-800 mb-2">{sensorData?.units ?? '--'}</div>
              <div className="flex items-center gap-2">
                <div className="flex items-center text-green-500 text-xs font-bold bg-green-50 px-1 rounded">
                  <TrendingUp size={12} className="mr-1" />
                  +2.3%
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Target 1024 Units</span>
              </div>
            </div>

            {/* Overall Efficiency */}
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Overall Efficiency</h3>
              <div className="text-2xl sm:text-4xl font-extrabold text-slate-800 mb-2">87.3%</div>
              <div className="flex items-center gap-2">
                <div className="flex items-center text-green-500 text-xs font-bold bg-green-50 px-1 rounded">
                  <TrendingUp size={12} className="mr-1" />
                  +2.3%
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Above Target</span>
              </div>
            </div>
          </div>

          {/* OEE Bar */}
          <div className="bg-white p-3 sm:p-5 rounded-xl shadow-sm border border-slate-100 mb-4 sm:mb-8">
            <div className="flex justify-between items-end mb-2">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase">Overall Equipment Efficiency (OEE)</h3>
              <span className="text-xs font-bold text-green-500">92.5%</span>
            </div>
            <div className="h-6 sm:h-8 bg-slate-50 rounded w-full flex gap-[2px] overflow-hidden">
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

        {/* Right Column (Logs & Charts) - Spans 4 cols on large screens */}
        <div className="lg:col-span-4 space-y-4 sm:space-y-6">

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
                  {logData.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 text-slate-600 font-medium">
                      <td className="p-2 pl-3 whitespace-nowrap">{row.date}</td>
                      <td className="p-2 whitespace-nowrap">{row.time}</td>
                      <td className="p-2 whitespace-nowrap">{row.tag}</td>
                      <td className="p-2 truncate max-w-[120px]">{row.product}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Overall Efficiency Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-[10px] font-bold text-slate-800 uppercase mb-6">Overall Efficiency</h3>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={productionData}>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    interval="preserveStartEnd"
                  />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#60A5FA"
                    strokeWidth={3}
                    dot={{ r: 0 }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Active Alerts (only for selected device, filtered in App.jsx) */}
          <div
            id="active-alerts"
            className={`bg-white p-6 rounded-xl shadow-sm border border-slate-100 transition-all duration-500 ${bellClicked ? 'ring-4 ring-yellow-400 ring-opacity-75 shadow-2xl shadow-yellow-200' : ''
              }`}
          >
            <h3 className="text-[10px] font-bold text-slate-800 uppercase mb-4">Active Alerts</h3>
            <div className="space-y-3">
              {alerts && alerts.length > 0 ? (
                alerts.slice(0, 5).map((alert, i) => (
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
