# GeoShift

A native desktop GPS simulation controller for iOS devices connected over USB, built in **Rust** (Tauri v2) and designed with the **unslop** craft principles.

---

## Capabilities

* **System-wide GPS Override:** Spoofs coordinates across all iOS apps (Maps, Camera, Safari, QR attendance scanners).
* **Instant Reversion:** One-click reset (`Restore Hardware GPS`) that immediately hands control back to true satellite/cell telemetry.
* **Interactive Cartography:** High-precision OpenStreetMap Leaflet viewport with custom dark instrument styling and target reticle.
* **Geocoding Search:** Direct address, landmark, or facility lookup via Nominatim.
* **Live USB Auto-Detection:** Automatically monitors connection state, model name (e.g. *iPhone 11 Pro Max*), and iOS version.
* **Non-Invasive:** Ephemeral in-memory Apple Developer Instrumentation override; no permanent system files modified and no jailbreak required.

---

## Quick Start

### 1. iPhone Setup
1. Plug your iPhone into your Mac using a Lightning-to-USB cable.
2. Unlock your phone and tap **Trust This Computer** (enter your passcode).
3. If on iOS 16 or newer: Ensure **Developer Mode** is turned on in:
   `Settings > Privacy & Security > Developer Mode`

### 2. Launch the Application
Run:
```bash
./start.sh
```
or:
```bash
npm start
```

---

## Architecture

* **Desktop Shell:** Rust + Tauri v2 native macOS window (non-browser standalone app).
* **Interface:** Unslop-compliant dark graphite instrument layout (`#0f0f10`, `#141415`, `#19191b`), 4px spacing scale, hairline borders, and tabular monospace readouts. Zero slop, zero glow gradients, zero emojis.
* **iOS Backend:** Integrated `pymobiledevice3` bridge (`engine/controller.py`) executing Apple's `com.apple.dt.simulatelocation` and DVT location simulation services over `usbmuxd`.
