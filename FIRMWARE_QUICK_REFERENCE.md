# Firmware Quick Reference Card

## Factory Management System - IoT Device Integration

---

## MQTT Connection

```
Host:     mqtt.protonest.co
Port:     8883
SSL/TLS:  Required
Protocol: MQTT v3.1.1+
```

### Client ID

⚠️ **MUST match device name** registered in ProtoNest (case-sensitive)

---

## Topic Format

```
protonest/<deviceId>/<category>/fmc/<topic>
```

- `category`: `stream` (sensor data) or `state` (commands)

---

## SENSOR TOPICS (Publish)

| Sensor | Topic | Payload Example |
|--------|-------|-----------------|
| Temperature | `protonest/<id>/stream/fmc/temperature` | `{"temperature": "25.5"}` |
| Humidity | `protonest/<id>/stream/fmc/humidity` | `{"humidity": "55.0"}` |
| Vibration | `protonest/<id>/stream/fmc/vibration` | `{"vibration": "3.2"}` |
| Pressure | `protonest/<id>/stream/fmc/pressure` | `{"pressure": "101325"}` |
| Noise | `protonest/<id>/stream/fmc/noise` | `{"noise": "65.3"}` |
| CO2 | `protonest/<id>/stream/fmc/co2` | `{"co2": "35"}` |
| Units | `protonest/<id>/stream/fmc/units` | `{"units": "1250"}` |

### Message Properties
```
QoS:    1
Retain: true
Format: JSON (values as STRINGS)
```

---

## COMMAND TOPICS (Subscribe)

### Wildcard Subscription (Recommended)
```
protonest/<deviceId>/state/fmc/#
```

### Machine Control
**Topic**: `protonest/<id>/state/fmc/machineControl`

```json
{"status": "RUN"}   // Start machine
{"status": "STOP"}  // Stop machine
{"status": "IDLE"}  // Set idle
```

### Ventilation Control
**Topic**: `protonest/<id>/state/fmc/ventilation`

```json
{
  "ventilation": "on",     // "on", "off", or "auto"
  "mode": "manual",        // "manual" or "auto"
  "timestamp": "2026-01-22T10:12:30Z"
}
```

---

## NORMAL RANGES

| Sensor | Optimal | Warning | Critical |
|--------|---------|---------|----------|
| Temperature | 20-25°C | >35°C | >40°C |
| Humidity | 40-60% | >70% | >80% |
| Vibration | 0-5 mm/s | >7 mm/s | >10 mm/s |
| Pressure | 100-103 kPa | ±5 kPa | ±10 kPa |
| Noise | <65 dB | >75 dB | >85 dB |
| CO2 | <45% | 45-70% | >70% |

---

## PUBLISHING FREQUENCY

| Data Type | Interval |
|-----------|----------|
| Vibration, Noise | 2-5 sec |
| Temperature, Humidity | 10-15 sec |
| Pressure | 5-10 sec |
| CO2 | 30 sec |
| Units | On event |

---

## ESP32 MINIMAL EXAMPLE

```c
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* mqtt_server = "mqtt.protonest.co";
const int mqtt_port = 8883;
const char* device_id = "devicetestuc";

WiFiClientSecure espClient;
PubSubClient client(espClient);

void publishSensor(const char* sensor, float value) {
  StaticJsonDocument<64> doc;
  char topic[100], payload[64];
  
  snprintf(topic, sizeof(topic), 
    "protonest/%s/stream/fmc/%s", device_id, sensor);
  
  doc[sensor] = String(value, 1);
  serializeJson(doc, payload);
  
  client.publish(topic, payload, true);
}

void callback(char* topic, byte* payload, unsigned int len) {
  StaticJsonDocument<256> doc;
  deserializeJson(doc, payload, len);
  
  if (strstr(topic, "machineControl")) {
    const char* status = doc["status"];
    // Handle: RUN, STOP, IDLE
  }
  
  if (strstr(topic, "ventilation")) {
    const char* vent = doc["ventilation"];
    const char* mode = doc["mode"];
    // Handle: on/off/auto, manual/auto
  }
}

void setup() {
  espClient.setCACert(rootCA);
  espClient.setCertificate(clientCert);
  espClient.setPrivateKey(clientKey);
  
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();
  
  // Publish sensors every 5 seconds
  static unsigned long last = 0;
  if (millis() - last > 5000) {
    last = millis();
    publishSensor("temperature", readTemp());
    publishSensor("humidity", readHumidity());
    publishSensor("vibration", readVibration());
  }
}
```

---

## RESOURCES

| Resource | URL |
|----------|-----|
| Platform | https://protonestconnect.co |
| MQTT Broker | mqtt.protonest.co:8883 |
| API | https://api.protonestconnect.co/api/v1/user |
| WebSocket | wss://api.protonestconnect.co/ws |

---

**Version**: 4.0 | **Updated**: January 22, 2026
