const AlertBanner = ({ type = 'critical', message, onDismiss }) => {
  const getAlertStyles = () => {
    switch (type) {
      case 'critical':
        return {
          bg: 'bg-red-100',
          border: 'border-red-300',
          text: 'text-red-800',
          icon: '⚠️'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-100',
          border: 'border-yellow-300',
          text: 'text-yellow-800',
          icon: '⚠️'
        };
      case 'info':
        return {
          bg: 'bg-blue-100',
          border: 'border-blue-300',
          text: 'text-blue-800',
          icon: 'ℹ️'
        };
      case 'success':
        return {
          bg: 'bg-green-100',
          border: 'border-green-300',
          text: 'text-green-800',
          icon: '✓'
        };
      default:
        return {
          bg: 'bg-gray-100',
          border: 'border-gray-300',
          text: 'text-gray-800',
          icon: '•'
        };
    }
  };

  const styles = getAlertStyles();

  if (!message) return null;

  return (
    <div className={`${styles.bg} border-b ${styles.border}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <span className="text-2xl">{styles.icon}</span>
            <span className={`font-semibold ${styles.text} text-sm sm:text-base`}>
              {type.toUpperCase()}: {message}
            </span>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className={`${styles.text} hover:opacity-70 transition-opacity p-1 rounded`}
              aria-label="Dismiss alert"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertBanner;
