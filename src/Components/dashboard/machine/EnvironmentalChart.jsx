import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../../common/Card';

const EnvironmentalChart = ({ data }) => {
  const [visibleMetrics, setVisibleMetrics] = useState({
    temperature: true,
    humidity: true,
    noise: true,
    aqi: true,
  });

  const toggleMetric = (metric) => {
    setVisibleMetrics(prev => ({
      ...prev,
      [metric]: !prev[metric],
    }));
  };

  const metrics = [
    { key: 'temperature', label: 'Temperature', color: '#ef4444', axis: 'left', unit: '°C' },
    { key: 'humidity', label: 'Humidity', color: '#3b82f6', axis: 'left', unit: '%' },
    { key: 'noise', label: 'Noise', color: '#f59e0b', axis: 'right', unit: 'dB' },
    { key: 'aqi', label: 'Air Quality', color: '#10b981', axis: 'right', unit: 'AQI' },
  ];

  return (
    <Card className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Environmental Monitoring</h3>
          <p className="text-sm text-slate-500">24-hour trend analysis with multi-axis visualization</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {metrics.map(metric => (
            <button
              key={metric.key}
              onClick={() => toggleMetric(metric.key)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all shadow-sm border-2 ${
                visibleMetrics[metric.key]
                  ? 'text-white border-transparent'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
              style={visibleMetrics[metric.key] ? { backgroundColor: metric.color, borderColor: metric.color } : {}}
            >
              {metric.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.6} />
            <XAxis 
              dataKey="time" 
              stroke="#475569"
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
              tickMargin={10}
              axisLine={{ stroke: '#94a3b8', strokeWidth: 1.5 }}
            />
            <YAxis 
              yAxisId="left"
              stroke="#475569"
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
              tickMargin={10}
              axisLine={{ stroke: '#94a3b8', strokeWidth: 1.5 }}
              label={{ value: 'Temp / Humidity', angle: -90, position: 'insideLeft', style: { fill: '#475569', fontSize: 12, fontWeight: 600 } }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="#475569"
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
              tickMargin={10}
              axisLine={{ stroke: '#94a3b8', strokeWidth: 1.5 }}
              label={{ value: 'Noise / AQI', angle: 90, position: 'insideRight', style: { fill: '#475569', fontSize: 12, fontWeight: 600 } }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 16px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
              }}
              labelStyle={{ fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}
              itemStyle={{ padding: '4px 0', fontSize: '13px', fontWeight: 500 }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
              iconSize={16}
            />
            {visibleMetrics.temperature && (
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="temperature" 
                stroke="#ef4444" 
                strokeWidth={3}
                dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
                name="Temperature (°C)"
              />
            )}
            {visibleMetrics.humidity && (
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="humidity" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
                name="Humidity (%)"
              />
            )}
            {visibleMetrics.noise && (
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="noise" 
                stroke="#f59e0b" 
                strokeWidth={3}
                dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
                name="Noise (dB)"
              />
            )}
            {visibleMetrics.aqi && (
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="aqi" 
                stroke="#10b981" 
                strokeWidth={3}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
                name="AQI"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default EnvironmentalChart;
