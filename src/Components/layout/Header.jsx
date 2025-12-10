import Badge from '../common/Badge';

const Header = ({ userId, factoryStatus, selectedDevice, onDeviceChange, devices }) => {
  const getStatusStyles = () => {
    if (factoryStatus === 'running') return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    if (factoryStatus === 'fault') return 'bg-red-100 text-red-700 border-red-300';
    return 'bg-amber-100 text-amber-700 border-amber-300';
  };

  return (
    <header className="bg-white shadow-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Left: Logo and Authentication */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🏭</span>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Nexus Core
                </h1>
                <div className="text-xs text-emerald-600 font-medium">
                  Authentication: Successful
                </div>
              </div>
            </div>
            <div className="text-xs text-slate-500 border-l border-slate-300 pl-4">
              User ID: <span className="font-mono text-slate-700 font-semibold">{userId}</span>
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

          {/* Right: Factory Status & Notifications */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 font-medium">Factory Status:</span>
            <span className={`px-4 py-1 rounded-full font-bold text-sm border ${getStatusStyles()}`}>
              {factoryStatus.toUpperCase()}
            </span>
            <button className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors border border-slate-200">
              <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
