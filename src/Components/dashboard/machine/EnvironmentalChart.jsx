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
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Environmental Monitoring (Last 24 Hours)</h3>
        <div className="flex gap-2 flex-wrap">
          {metrics.map(metric => (
            <button
              key={metric.key}
              onClick={() => toggleMetric(metric.key)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                visibleMetrics[metric.key]
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
              }`}
              style={visibleMetrics[metric.key] ? { backgroundColor: metric.color } : {}}
            >
              {metric.label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            dataKey="time" 
            stroke="#64748b"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            yAxisId="left"
            stroke="#64748b"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            stroke="#64748b"
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}
          />
          <Legend />
          {visibleMetrics.temperature && (
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="temperature" 
              stroke="#ef4444" 
              strokeWidth={2}
              dot={false}
              name="Temperature (°C)"
            />
          )}
          {visibleMetrics.humidity && (
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="humidity" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={false}
              name="Humidity (%)"
            />
          )}
          {visibleMetrics.noise && (
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="noise" 
              stroke="#f59e0b" 
              strokeWidth={2}
              dot={false}
              name="Noise (dB)"
            />
          )}
          {visibleMetrics.aqi && (
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="aqi" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={false}
              name="AQI"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default EnvironmentalChart;
