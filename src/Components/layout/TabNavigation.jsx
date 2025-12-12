const TabNavigation = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'production', label: 'Productions & Logistics' },
    { id: 'machine', label: 'Machine Monitoring' },
  ];

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative px-4 py-3 text-sm font-semibold rounded-t-lg transition-colors ${
                  isActive
                    ? 'text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
                <span
                  className={`absolute left-0 right-0 -bottom-px h-0.5 rounded-full transition-all ${
                    isActive ? 'bg-slate-900 scale-100' : 'bg-transparent scale-0'
                  }`}
                />
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default TabNavigation;
