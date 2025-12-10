import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../../common/Card';

const ProductionChart = ({ data }) => {
  return (
    <Card>
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Production Trend (Last 7 Days)</h3>
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
