const ConnectionStatus = ({ 
  websocketConnected = false, 
  mqttConnected = false,
  realtimeActive = false,
  historicalActive = false 
}) => {
  const StatusIndicator = ({ label, connected, variant = 'default' }) => {
    const bgColor = variant === 'green' 
      ? 'bg-green-50' 
      : variant === 'blue' 
      ? 'bg-blue-50' 
      : 'bg-slate-50';
    
    const textColor = variant === 'green' 
      ? 'text-green-700' 
      : variant === 'blue' 
      ? 'text-blue-700' 
      : 'text-slate-700';
    
    const borderColor = variant === 'green' 
      ? 'border-green-200' 
      : variant === 'blue' 
      ? 'border-blue-200' 
      : 'border-slate-200';

    return (
      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border ${bgColor} ${borderColor}`}>
        <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'} shadow-sm`}>
          {connected && (
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping"></div>
          )}
        </div>
        <span className={`text-sm font-medium ${textColor}`}>{label}</span>
      </div>
    );
  };

  const SystemStatus = ({ realtimeActive, historicalActive }) => {
    const isOnline = realtimeActive || historicalActive;
    
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border bg-slate-50 border-slate-200">
        <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} shadow-sm`}>
          {isOnline && (
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping"></div>
          )}
        </div>
        <span className="text-sm font-medium text-slate-700">
          System Status: <span className="font-semibold">{isOnline ? 'Online' : 'Offline'}</span>
          {realtimeActive && <span className="ml-1">• Real-Time: Active</span>}
          {historicalActive && <span className="ml-1">• Historical: HTTP API</span>}
        </span>
      </div>
    );
  };

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Connection Status Row 1 */}
          <StatusIndicator 
            label={`WebSocket (Real-Time): ${websocketConnected ? 'Connected' : 'Disconnected'}`}
            connected={websocketConnected}
            variant="green"
          />
          
          {/* Connection Status Row 2 */}
          <StatusIndicator 
            label={`MQTT Stream: ${mqttConnected ? 'Receiving Data' : 'No Data'}`}
            connected={mqttConnected}
            variant="blue"
          />
        </div>
        
        {/* System Status Row 3 - Full Width */}
        <div className="mt-3">
          <SystemStatus 
            realtimeActive={realtimeActive} 
            historicalActive={historicalActive}
          />
        </div>
      </div>
    </div>
  );
};

export default ConnectionStatus;
