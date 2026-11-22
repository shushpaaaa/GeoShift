# GeoShift

<p>
  <a href="https://github.com/shushpaaaa/GeoShift/releases/tag/v1.0.0">
    <img src="https://img.shields.io/badge/Release-v1.0.0-4f8ff7?style=flat&labelColor=0e1015" alt="Release v1.0.0" />
  </a>
  <img src="https://img.shields.io/badge/Shell-Rust_%2B_Tauri_v2-1b1f2a?style=flat&labelColor=0e1015" alt="Rust + Tauri v2" />
  <img src="https://img.shields.io/badge/Transport-Apple_DVT_%2F_usbmuxd-1b1f2a?style=flat&labelColor=0e1015" alt="Apple DVT over usbmuxd" />
  <img src="https://img.shields.io/badge/Platform-macOS_%26_Windows-1b1f2a?style=flat&labelColor=0e1015" alt="macOS and Windows" />
</p>

A native desktop GPS simulation controller for iOS devices connected over USB, built in **Rust (Tauri v2)** with an integrated Python DVT instrumentation bridge.

---

## Downloads (`v1.0.0`)

| Platform | Package | Size | Download |
| :--- | :--- | :--- | :--- |
| **macOS (Universal)** | Apple Silicon & Intel `.dmg` | 4.5 MB | [GeoShift_1.0.0_universal.dmg](https://github.com/shushpaaaa/GeoShift/releases/download/v1.0.0/GeoShift_1.0.0_universal.dmg) |
| **macOS (Apple Silicon)** | `aarch64` `.dmg` | 2.5 MB | [GeoShift_1.0.0_aarch64.dmg](https://github.com/shushpaaaa/GeoShift/releases/download/v1.0.0/GeoShift_1.0.0_aarch64.dmg) |
| **macOS (Intel)** | `x64` `.dmg` | 2.7 MB | [GeoShift_1.0.0_x64.dmg](https://github.com/shushpaaaa/GeoShift/releases/download/v1.0.0/GeoShift_1.0.0_x64.dmg) |
| **Windows (Installer)** | NSIS Setup `.exe` | 1.5 MB | [GeoShift-Setup-1.0.0.exe](https://github.com/shushpaaaa/GeoShift/releases/download/v1.0.0/GeoShift-Setup-1.0.0.exe) |
| **Windows (Portable)** | Standalone `.zip` | 2.0 MB | [GeoShift-Windows-Portable.zip](https://github.com/shushpaaaa/GeoShift/releases/download/v1.0.0/GeoShift-Windows-Portable.zip) |

All checksums and archives are published on the [v1.0.0 Release Page](https://github.com/shushpaaaa/GeoShift/releases/tag/v1.0.0).

---

## Capabilities

- **System-wide GPS Override** — Simulates coordinates across all iOS apps (Maps, Camera, Safari, location-aware clients).
- **Instant Hardware Restoration** — One-click `Restore Hardware GPS` immediately clears the ephemeral override and returns to native satellite/cell lock.
- **Interactive Cartography** — High-precision OpenStreetMap Leaflet viewport with dark instrument styling, target reticle, and Nominatim geocoding search.
- **Live USB Auto-Detection** — Automatically tracks USB connection state, device model name, and iOS version.
- **Non-Invasive** — Uses Apple's developer instrumentation services (`com.apple.dt.simulatelocation`) in memory; no jailbreak or persistent OS changes required.

---

## Quick Start (From Source)

### 1. iPhone Preparation
1. Connect your iPhone over USB and tap **Trust This Computer**.
2. On iOS 16+, enable **Developer Mode** under `Settings → Privacy & Security → Developer Mode`.

### 2. Run Locally
```bash
./start.sh
# or
npm start
```

---

## Architecture

- **Desktop Shell:** Rust + Tauri v2 standalone native window.
- **Interface:** Dark graphite instrument layout (`4px` grid, hairline borders, tabular coordinate readouts).
- **iOS Backend:** Integrated `pymobiledevice3` bridge (`engine/controller.py`) executing `com.apple.dt.simulatelocation` and DVT location simulation over `usbmuxd`.
