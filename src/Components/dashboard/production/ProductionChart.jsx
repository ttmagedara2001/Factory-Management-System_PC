import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../../common/Card';

const ProductionChart = ({ data, variant = 'default', className = '' }) => {
  const handleExportCSV = () => {
    const csvContent = [
      ['Day', 'Production', 'Target'],
      ...data.map(row => [row.day, row.production, row.target])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production_data_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card variant={variant} className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-800">Production vs. Time</h3>
          <p className="text-xs text-slate-500">Daily output compared to target</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
        >
          Export .csv
        </button>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            dataKey="day" 
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
          <Legend 
            wrapperStyle={{ fontSize: '14px' }}
          />
          <Line 
            type="monotone" 
            dataKey="production" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 4 }}
            name="Daily Production"
          />
          <Line 
            type="monotone" 
            dataKey="target" 
            stroke="#64748b" 
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: '#64748b', r: 4 }}
            name="Target"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default ProductionChart;
