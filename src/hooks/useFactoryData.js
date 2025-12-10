import { useState, useEffect } from "react";

/**
 * Custom hook for fetching factory data from API
 * This is a placeholder implementation - integrate with your actual API
 */
const useFactoryData = (deviceId) => {
  const [data, setData] = useState({
    production: {
      daily: 1024,
      target: 2046,
      efficiency: 84.2,
    },
    sensors: {
      vibration: 5.2,
      pressure: 5.2,
      temperature: 28.5,
      humidity: 55.8,
      noiseLevel: 72.4,
      aqi: 68,
      pm25: 22.5,
      co2: 450,
      airQuality: "Good",
    },
    status: "running",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Replace with actual API call
        // const response = await fetch(`/api/factory/${deviceId}`);
        // const result = await response.json();
        // setData(result);

        // Simulated data update
        setTimeout(() => {
          setData((prev) => ({
            ...prev,
            sensors: {
              ...prev.sensors,
              vibration: (Math.random() * 8).toFixed(1),
              pressure: (3 + Math.random() * 4).toFixed(1),
              temperature: (25 + Math.random() * 10).toFixed(1),
              humidity: (40 + Math.random() * 30).toFixed(1),
              noiseLevel: (60 + Math.random() * 25).toFixed(1),
              aqi: Math.floor(30 + Math.random() * 70),
              pm25: (15 + Math.random() * 20).toFixed(1),
              co2: Math.floor(400 + Math.random() * 200),
            },
          }));
          setLoading(false);
        }, 500);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();

    // Poll every 5 seconds
    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, [deviceId]);

  const updateProduction = (value) => {
    setData((prev) => ({
      ...prev,
      production: {
        ...prev.production,
        daily: value,
      },
    }));
  };

  const updateStatus = (status) => {
    setData((prev) => ({
      ...prev,
      status,
    }));
  };

  return {
    data,
    loading,
    error,
    updateProduction,
    updateStatus,
  };
};

export default useFactoryData;
