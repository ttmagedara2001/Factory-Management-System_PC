import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../../common/Card';

const MultiSensorChart = ({ data }) => {
  const [visibleMetrics, setVisibleMetrics] = useState({
    vibration: true,
    temperature: true,
    pressure: true,
  });

  const toggleMetric = (metric) => {
    setVisibleMetrics(prev => ({
      ...prev,
      [metric]: !prev[metric],
    }));
  };

  const metrics = [
    { key: 'vibration', label: 'Vibration', color: '#8b5cf6', unit: 'mm/s' },
    { key: 'temperature', label: 'Temperature', color: '#ef4444', unit: '°C' },
    { key: 'pressure', label: 'Pressure', color: '#3b82f6', unit: 'bar' },
  ];

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Real-Time Sensor Data</h3>
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
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            dataKey="time" 
            stroke="#64748b"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
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
          {visibleMetrics.vibration && (
            <Line 
              type="monotone" 
              dataKey="vibration" 
              stroke="#8b5cf6" 
              strokeWidth={2}
              dot={false}
              name="Vibration (mm/s)"
            />
          )}
          {visibleMetrics.temperature && (
            <Line 
              type="monotone" 
              dataKey="temperature" 
              stroke="#ef4444" 
              strokeWidth={2}
              dot={false}
              name="Temperature (°C)"
            />
          )}
          {visibleMetrics.pressure && (
            <Line 
              type="monotone" 
              dataKey="pressure" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={false}
              name="Pressure (bar)"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default MultiSensorChart;
