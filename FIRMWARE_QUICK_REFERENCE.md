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

| Sensor      | Topic                                   | Payload Example                              | Unit    |
| ----------- | --------------------------------------- | -------------------------------------------- | ------- |
| Temperature | `protonest/<id>/stream/fmc/temperature` | `{"temperature": "25.5"}`                    | °C      |
| Humidity    | `protonest/<id>/stream/fmc/humidity`    | `{"humidity": "55.0"}`                       | %       |
| Vibration   | `protonest/<id>/stream/fmc/vibration`   | `{"vibration": "3.2"}`                       | mm/s    |
| Pressure    | `protonest/<id>/stream/fmc/pressure`    | `{"pressure": "1.05"}`                       | **bar** |
| Noise       | `protonest/<id>/stream/fmc/noise`       | `{"noise": "65.3"}`                          | dB      |
| CO2         | `protonest/<id>/stream/fmc/co2`         | `{"co2": "35"}`                              | %       |
| Product     | `protonest/<id>/stream/fmc/product`     | `{"productID": "...", "productName": "..."}` | —       |

> ⚠️ **AQI** is calculated client-side from temperature, humidity and CO2 — do **not** publish an `fmc/aqi` topic.  
> ⚠️ **Units** are derived by counting `fmc/product` records — do **not** publish an `fmc/units` topic.

### Message Properties

```
QoS:    1
Retain: true (sensors), false (products)
Format: JSON (values as STRINGS)
```

---

## COMMAND TOPICS (Subscribe)

### Wildcard Subscription (Recommended)

```
protonest/<deviceId>/state/fmc/#
```

### Machine Control ⚡

**Topic**: `protonest/<id>/state/fmc/machineControl`

```json
{"status": "RUN"}   // Start machine
{"status": "STOP"}  // Stop machine
{"status": "IDLE"}  // Set idle
```

**Flow**: Dashboard → HTTP API → MQTT → Your Device

### Emergency Stop 🚨

**Topic**: `protonest/<id>/state/fmc/emergencyStop`

```json
{"emergencyStop": true,  "reason": "EMERGENCY STOP", "timestamp": "..."} // Stop
{"emergencyStop": false, "reason": "RESUMED",        "timestamp": "..."} // Resume
```

**Flow**: Dashboard → WebSocket STOMP + HTTP API → MQTT → Your Device

### Control Mode

**Topic**: `protonest/<id>/state/fmc/controlMode`

```json
{"controlMode": "manual"} // Manual mode — user controls machine
{"controlMode": "auto"}   // Auto mode  — system manages machine
```

**Flow**: Dashboard → WebSocket STOMP + HTTP API → MQTT → Your Device

### Ventilation Control

**Topic**: `protonest/<id>/state/fmc/ventilation`

```json
{
  "ventilation": "on", // "on", "off"
  "mode": "manual" // "manual" or "auto"
}
```

---

## UNIT COUNT (Production Tracking)

**⚠️ No direct `units` topic!**

Units are calculated from product records:

1. Firmware publishes each product to `fmc/product`
2. Dashboard fetches products via HTTP (last 24 hrs)
3. Dashboard counts records = unit count

```json
// Publish each product scan
{ "productID": "PROD-001", "productName": "Widget A" }
```

---

## NORMAL RANGES

| Sensor      | Unit    | Optimal       | Warning        | Critical     |
| ----------- | ------- | ------------- | -------------- | ------------ |
| Temperature | °C      | 20–25         | >35            | >40          |
| Humidity    | %       | 40–60         | >70            | >80          |
| Vibration   | mm/s    | 0–5           | >7             | >10          |
| Pressure    | **bar** | **0.95–1.10** | <0.95 or >1.10 | <0.5 or >1.5 |
| Noise       | dB      | <65           | >75            | >85          |
| CO2         | %       | <45           | 45–70          | >70          |

---

## PUBLISHING FREQUENCY

| Data Type             | Interval  |
| --------------------- | --------- |
| Vibration, Noise      | 2-5 sec   |
| Temperature, Humidity | 10-15 sec |
| Pressure              | 5-10 sec  |
| CO2                   | 30 sec    |
| Product               | On event  |

---

## TESTING WITH MQTTX

### 1. Subscribe to all state topics

```
Topic: protonest/devicetestuc/state/fmc/#
QoS: 1
```

### 2. Test machine control

```
Topic: protonest/devicetestuc/state/fmc/machineControl
QoS: 1, Retain: true
Payload: {"status": "RUN"}
```

### 3. Test emergency stop

```
Topic: protonest/devicetestuc/state/fmc/emergencyStop
QoS: 1, Retain: true
Payload: {"emergencyStop": true, "reason": "EMERGENCY STOP"}
```

### 4. Test resume after emergency stop

```
Topic: protonest/devicetestuc/state/fmc/emergencyStop
QoS: 1, Retain: true
Payload: {"emergencyStop": false, "reason": "RESUMED"}
```

### 5. Test control mode switch

```
Topic: protonest/devicetestuc/state/fmc/controlMode
QoS: 1, Retain: true
Payload: {"controlMode": "manual"}
```

Your firmware should receive and respond to all commands above.

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

void publishProduct(const char* productID, const char* productName) {
  StaticJsonDocument<128> doc;
  char topic[100], payload[128];

  snprintf(topic, sizeof(topic),
    "protonest/%s/stream/fmc/product", device_id);

  doc["productID"] = productID;
  doc["productName"] = productName;
  serializeJson(doc, payload);

  client.publish(topic, payload, false);  // Retain = false
}

void callback(char* topic, byte* payload, unsigned int len) {
  StaticJsonDocument<256> doc;
  deserializeJson(doc, payload, len);

  if (strstr(topic, "machineControl")) {
    const char* status = doc["status"];
    if (strcmp(status, "RUN") == 0)  startMachine();
    if (strcmp(status, "STOP") == 0) stopMachine();
    if (strcmp(status, "IDLE") == 0) setIdle();
  }

  if (strstr(topic, "emergencyStop")) {
    bool stopped = doc["emergencyStop"];
    if (stopped) emergencyStop();   // halt everything immediately
    else         resumeFromStop();  // restore normal operation
  }

  if (strstr(topic, "controlMode")) {
    const char* mode = doc["controlMode"];
    if (strcmp(mode, "auto") == 0)   enableAutoMode();
    else                             enableManualMode();
  }

  if (strstr(topic, "ventilation")) {
    const char* vent = doc["ventilation"];
    const char* mode = doc["mode"];
    // Handle: on/off, manual/auto
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
    publishSensor("pressure", readPressure()); // in bar
  }

  // Publish product on detection
  if (productDetected()) {
    publishProduct("PROD-001", "Widget");
  }
}
```

---

## RESOURCES

| Resource    | URL                                    |
| ----------- | -------------------------------------- |
| Platform    | https://protonestconnect.co            |
| MQTT Broker | mqtt.protonest.co:8883                 |
| API         | https://api.protonestconnect.co/api/v1 |
| WebSocket   | wss://api.protonestconnect.co/ws       |

---

**Version**: 4.2 | **Updated**: February 18, 2026

---

## RESOURCES

| Resource    | URL                                    |
| ----------- | -------------------------------------- |
| Platform    | https://protonestconnect.co            |
| MQTT Broker | mqtt.protonest.co:8883                 |
| API         | https://api.protonestconnect.co/api/v1 |
| WebSocket   | wss://api.protonestconnect.co/ws       |

---

**Version**: 4.2 | **Updated**: February 18, 2026
