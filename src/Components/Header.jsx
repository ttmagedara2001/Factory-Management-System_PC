import React, { useState, useEffect, useRef } from 'react';
import { Bell, User, ChevronDown, Menu } from 'lucide-react';
import { useAuth } from '../Context/AuthContext';

const Header = ({ toggleSidebar, setBellClicked, setShowNotifications, showNotifications, devices, selectedDevice, onDeviceChange, alertCount = 0 }) => {
  const { auth } = useAuth();
  
  // Extract username from email (before @) or use full userId
  const username = auth?.userId 
    ? auth.userId.includes('@') 
      ? auth.userId.split('@')[0].toUpperCase() 
      : auth.userId.toUpperCase()
    : 'USER1233';
  const [showDeviceDropdown, setShowDeviceDropdown] = useState(false);
  const dropdownRef = useRef(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDeviceDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  const handleBellClick = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      setBellClicked(true);
      setTimeout(() => {
        const alertsSection = document.getElementById('active-alerts');
        if (alertsSection) {
          alertsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      setTimeout(() => setBellClicked(false), 3000);
    }
  };

  return (
    <header className="h-16 bg-[#DCEBF5] flex items-center justify-between px-8 border-b border-slate-200 gap-6">
      {/* Hamburger Menu */}
      <button 
        onClick={toggleSidebar}
        className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
      >
        <Menu size={24} className="text-slate-700" />
      </button>
      
      <div className="flex items-center gap-6">
      {/* Device Select */}
      <div className="relative" ref={dropdownRef}>
        <button 
          onClick={() => setShowDeviceDropdown(!showDeviceDropdown)}
          className="bg-[#93C5FD] text-slate-800 px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 shadow-sm hover:bg-[#7CB9F9] transition-colors"
        >
          {devices?.find(d => d.id === selectedDevice)?.name || 'Select Device'}
          <ChevronDown size={16} className={`transition-transform ${showDeviceDropdown ? 'rotate-180' : ''}`} />
        </button>
        
        {/* Dropdown Menu */}
        {showDeviceDropdown && (
          <div className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-xl border border-slate-200 py-2 min-w-[240px] z-50">
            {devices?.map((device) => (
              <button
                key={device.id}
                onClick={() => {
                  onDeviceChange(device.id);
                  setShowDeviceDropdown(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors ${
                  selectedDevice === device.id ? 'bg-blue-100 font-semibold text-blue-700' : 'text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    selectedDevice === device.id ? 'bg-green-500' : 'bg-slate-300'
                  }`}></div>
                  {device.name}
                </div>
                <div className="text-xs text-slate-500 ml-4 mt-0.5">{device.id}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-8 w-px bg-slate-400 mx-2"></div>

      {/* User Profile */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center text-slate-600">
          <User size={20} />
        </div>
        <span className="text-slate-700 font-semibold text-sm">{username}</span>
      </div>

      {/* Notifications */}
      <button 
        onClick={handleBellClick}
        className={`relative p-2 rounded-lg transition-all duration-300 group ${
          showNotifications ? 'bg-yellow-100' : 'hover:bg-slate-200'
        }`}
      >
        <Bell size={24} className={`transition-colors duration-300 ${
          showNotifications ? 'text-yellow-600' : 'text-slate-700 group-hover:text-yellow-500'
        }`} />
        {alertCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#FCD34D] text-slate-900 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#DCEBF5]">
            {alertCount}
          </span>
        )}
      </button>
      </div>
    </header>
  );
};

export default Header;
