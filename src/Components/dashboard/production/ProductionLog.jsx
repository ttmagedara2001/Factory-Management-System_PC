import Card from '../../common/Card';

const ProductionLog = ({ logs }) => {
  return (
    <Card>
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Production Log</h3>
      <div className="overflow-hidden">
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Time</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">RFID Tag</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Product</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {logs.map((log, index) => (
                <tr key={index} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-600">{log.time}</td>
                  <td className="px-4 py-3 text-sm font-mono text-slate-700">{log.rfid}</td>
                  <td className="px-4 py-3 text-sm text-slate-800">{log.product}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
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
