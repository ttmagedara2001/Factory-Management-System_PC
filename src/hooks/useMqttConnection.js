import { useState, useEffect } from "react";

/**
 * Custom hook for managing MQTT/WebSocket connection
 * This is a placeholder implementation - integrate with your actual MQTT client
 */
const useMqttConnection = (brokerUrl) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulated connection for demo purposes
    // Replace with actual MQTT client logic (e.g., mqtt.js, paho-mqtt)

    const connect = () => {
      try {
        // Simulate connection
        setTimeout(() => {
          setIsConnected(true);
          console.log("MQTT connected to:", brokerUrl);
        }, 1000);

        // Simulate receiving messages
        const interval = setInterval(() => {
          const mockMessage = {
            topic: "factory/sensors",
            payload: {
              vibration: (Math.random() * 8).toFixed(2),
              temperature: (20 + Math.random() * 15).toFixed(1),
              pressure: (3 + Math.random() * 4).toFixed(2),
              timestamp: new Date().toISOString(),
            },
          };
          setMessages((prev) => [...prev.slice(-50), mockMessage]);
        }, 3000);

        return () => {
          clearInterval(interval);
          setIsConnected(false);
        };
      } catch (err) {
        setError(err.message);
        setIsConnected(false);
      }
    };

    const cleanup = connect();
    return cleanup;
  }, [brokerUrl]);

  const publish = (topic, message) => {
    if (!isConnected) {
      console.warn("Not connected to MQTT broker");
      return false;
    }
    // Implement actual publish logic here
    console.log("Publishing to", topic, ":", message);
    return true;
  };

  const subscribe = (topic) => {
    if (!isConnected) {
      console.warn("Not connected to MQTT broker");
      return false;
    }
    // Implement actual subscribe logic here
    console.log("Subscribed to:", topic);
    return true;
  };

  return {
    isConnected,
    messages,
    error,
    publish,
    subscribe,
  };
};

export default useMqttConnection;
