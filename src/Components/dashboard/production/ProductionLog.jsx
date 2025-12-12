import Card from '../../common/Card';

const ProductionLog = ({ logs, variant = 'default', className = '' }) => {
  return (
    <Card variant={variant} className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-800">Recent Production Log</h3>
          <p className="text-xs text-slate-500">Live scan feed with status highlights</p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-500 font-semibold uppercase tracking-wide">
          Live Feed
        </span>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-100 shadow-sm">
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Time</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">RFID Tag</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {logs.map((log, index) => (
                <tr key={index} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-700">{log.time}</td>
                  <td className="px-4 py-3 text-sm font-mono text-slate-800">{log.rfid}</td>
                  <td className="px-4 py-3 text-sm text-slate-800">{log.product}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      log.status === 'Scanned' 
                        ? 'bg-emerald-50 text-emerald-700' 
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
};

export default ProductionLog;
