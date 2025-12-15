import React from 'react';
import { LayoutDashboard, History, Settings, Pin, PinOff } from 'lucide-react';

const SidePanel = ({ activeTab, setActiveTab, isOpen, isPinned, togglePin, onMouseEnter, onMouseLeave }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'historical', label: 'Historical Data', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div 
      className={`bg-[#E8F1F8] flex flex-col h-full border-r border-slate-200 transition-all duration-300 ease-in-out ${isOpen ? 'w-64' : 'w-0'} overflow-hidden`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Logo Area */}
      <div className="p-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-400 rounded-md flex items-center justify-center shadow-sm relative overflow-hidden">
            {/* Simple visual approximation of a robot arm icon */}
            <div className="w-6 h-1 bg-slate-800 absolute top-4 left-1 rotate-45"></div>
            <div className="w-2 h-2 bg-slate-800 rounded-full absolute top-2 right-2"></div>
            <div className="w-4 h-2 bg-slate-800 absolute bottom-2 left-2"></div>
          </div>
          <span className="font-bold text-lg text-slate-800">Nexus Core</span>
        </div>
        <button 
          onClick={togglePin}
          className={`p-1.5 rounded-lg transition-colors ${isPinned ? 'bg-blue-500 text-white' : 'hover:bg-slate-200 text-slate-600'}`}
          title={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
        >
          {isPinned ? <Pin size={18} /> : <PinOff size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-[#5FA5F9] text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Icon size={20} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Emergency Stop */}
      <div className="p-4 mt-auto">
        <div className="bg-slate-600 rounded-xl p-4 text-center shadow-lg">
          <p className="text-slate-300 text-xs mb-3 leading-tight">
            Stops all active machinery immediately. Use only in <br/> <span className="font-bold">EMERGENCIES</span>
          </p>
          <button className="w-full bg-[#DC3838] hover:bg-red-700 text-white font-bold py-3 rounded-lg shadow-md transition-colors flex items-center justify-center gap-2">
            EMERGENCY STOP
          </button>
        </div>
      </div>
    </div>
  );
};

export default SidePanel;
