import React from 'react';
import { TrendingUp } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import RealTimeWindow from './RealTimeWindow';
import FactoryStatus from './FactoryStatus';

// Data arrays - to be populated from real API/WebSocket connections
const productionData = [];
const logData = [];
const alerts = [];

const Dashboard = ({ bellClicked, thresholds, sensorData, webSocketClient, selectedDevice }) => {
  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Dashboard Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-xl font-bold text-slate-800 uppercase tracking-wide">Dashboard</h1>
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
              <div className="text-4xl font-extrabold text-slate-800 mb-2">200</div>
              <div className="flex items-center gap-2">
                <div className="flex items-center text-green-500 text-xs font-bold bg-green-50 px-1 rounded">
                  <TrendingUp size={12} className="mr-1"/>
                  +2.3%
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
                    tick={{fontSize: 10, fill: '#94a3b8'}}
                    interval="preserveStartEnd"
                  />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#60A5FA" 
                    strokeWidth={3} 
                    dot={{r: 0}}
                    activeDot={{r: 4}}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Active Alerts */}
          <div 
            id="active-alerts" 
            className={`bg-white p-6 rounded-xl shadow-sm border border-slate-100 transition-all duration-500 ${
              bellClicked ? 'ring-4 ring-yellow-400 ring-opacity-75 shadow-2xl shadow-yellow-200' : ''
            }`}
          >
            <h3 className="text-[10px] font-bold text-slate-800 uppercase mb-4">Active Alerts</h3>
            <div className="space-y-3">
              {alerts.map((alert, i) => (
                <div key={i} className="flex justify-between items-start bg-[#FEF3C7] p-3 rounded-md border-l-4 border-[#FBBF24]">
                  <p className="text-[10px] font-bold text-slate-700 leading-tight w-3/4">
                    {alert.msg}
                  </p>
                  <span className="text-[10px] font-bold text-slate-500">{alert.time}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
