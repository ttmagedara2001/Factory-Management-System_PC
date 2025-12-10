import Badge from '../common/Badge';

const Header = ({ userId, factoryStatus, selectedDevice, onDeviceChange, devices }) => {
  return (
    <header className="bg-white shadow-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Left: Logo and User ID */}
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-bold text-slate-900">
              ⚡ Nexus Core
            </h1>
            <div className="text-sm text-slate-500">
              User ID: <span className="font-mono text-slate-700">{userId}</span>
            </div>
          </div>

          {/* Center: Device Selector */}
          <div className="flex-1 max-w-xs mx-8">
            <select
              value={selectedDevice}
              onChange={(e) => onDeviceChange(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
            >
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
            </select>
          </div>

          {/* Right: Factory Status */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-500">Factory Status:</span>
            <Badge status={factoryStatus}>{factoryStatus.toUpperCase()}</Badge>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
