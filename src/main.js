// GeoShift — iOS Location Simulation Frontend Engine
import { getDeviceIconSvg } from "./device-icons.js";

// Tauri IPC wrapper with fallback for dev preview
const tauriInvoke = window.__TAURI__?.core?.invoke || (async (cmd, args) => {
  console.log(`[Dev Mock IPC] ${cmd}:`, args);
  if (cmd === "get_devices") return JSON.stringify([]);
  if (cmd === "set_location") return JSON.stringify({ success: true, mock: true, lat: args.lat, lng: args.lng });
  if (cmd === "clear_location") return JSON.stringify({ success: true, mock: true, cleared: true });
  if (cmd === "resolve_url") return args.url;
  return "{}";
});

// DOM Elements
const deviceGlyphContainerEl = document.getElementById("device-glyph-container");
const statusDotEl = document.getElementById("status-dot");
const deviceStateTextEl = document.getElementById("device-state-text");
const deviceModelEl = document.getElementById("device-model");
const deviceOsEl = document.getElementById("device-os");
const deviceUdidEl = document.getElementById("device-udid");

const searchFormEl = document.getElementById("search-form");
const searchInputEl = document.getElementById("search-input");
const pasteQuickBtn = document.getElementById("paste-quick-btn");

const latInputEl = document.getElementById("lat-input");
const lngInputEl = document.getElementById("lng-input");
const formattedCoordsEl = document.getElementById("formatted-coords");
const overlayCoordsEl = document.getElementById("overlay-coords");
const centerTargetBtn = document.getElementById("center-target-btn");
const mapFabCenterBtn = document.getElementById("map-fab-center");
const reticleInfoEl = document.getElementById("reticle-info");

// Preset Elements
const addPresetTriggerBtn = document.getElementById("add-preset-trigger-btn");
const addPresetForm = document.getElementById("add-preset-form");
const presetNameInput = document.getElementById("preset-name-input");
const presetCancelBtn = document.getElementById("preset-cancel-btn");
const presetListEl = document.getElementById("preset-list");

const simulateBtn = document.getElementById("simulate-btn");
const clearBtn = document.getElementById("clear-btn");
const logStreamEl = document.getElementById("log-stream");
const clearLogBtn = document.getElementById("clear-log-btn");

// Developer Mode Modal & Action Controls
const devModeCardBtn = document.getElementById("dev-mode-card-btn");
const devModeModal = document.getElementById("dev-mode-modal");
const devModeModalTitle = document.getElementById("dev-mode-modal-title");
const devModeModalSubtitle = document.getElementById("dev-mode-modal-subtitle");
const devModeModalClose = document.getElementById("dev-mode-modal-close");
const devModeCancelBtn = document.getElementById("dev-mode-cancel-btn");
const devModeActivateBtn = document.getElementById("dev-mode-activate-btn");
const devModeAlert = document.getElementById("dev-mode-alert");

let lastAutoPromptedDevModeUdid = null;
let activeDevModeDevice = null;

function openDevModeModal(device) {
  if (!device) return;
  activeDevModeDevice = device;
  if (devModeModalSubtitle) {
    devModeModalSubtitle.textContent = `${device.model || device.name || "iPhone"} (${device.version ? `iOS ${device.version}` : "iOS"})`;
  }
  if (devModeAlert) {
    devModeAlert.classList.add("hidden");
    devModeAlert.textContent = "";
    devModeAlert.className = "modal-alert hidden";
  }
  if (devModeActivateBtn) {
    devModeActivateBtn.disabled = false;
    devModeActivateBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
      <span>Turn On Developer Mode</span>
    `;
  }
  devModeModal?.classList.remove("hidden");
}

function closeDevModeModal() {
  devModeModal?.classList.add("hidden");
}

// App State (Default to User's Shenzhen / Tianjin Univ Facility)
let currentLat = 22.591426;
let currentLng = 114.010025;
let map;
let marker;
let isSimulating = false;
let connectedDevices = [];

// Storage Key for Presets
const PRESETS_STORAGE_KEY = "geoshift_saved_presets";

const INITIAL_DEFAULT_PRESETS = [
  { id: "default-facility", name: "Tianjin Univ / HKUST Shenzhen", lat: 22.591426, lng: 114.010025 },
  { id: "default-tianjin-main", name: "Tianjin Univ Peiyang Park", lat: 38.996931, lng: 117.306280 },
];

// Helper: Append to Activity Log
function addLog(message, type = "normal") {
  const entry = document.createElement("div");
  entry.className = `log-entry ${type}`;
  const time = new Date().toLocaleTimeString("en-GB", { hour12: false });
  entry.textContent = `[${time}] ${message}`;
  logStreamEl.appendChild(entry);
  logStreamEl.scrollTop = logStreamEl.scrollHeight;
}

// Helper: Format Coordinate String (e.g. 22.591426° N, 114.010025° E)
function formatCoordinates(lat, lng) {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  const absLat = Math.abs(lat).toFixed(6);
  const absLng = Math.abs(lng).toFixed(6);
  return `${absLat}° ${latDir}, ${absLng}° ${lngDir}`;
}

// Center / Travel to Pinned Location
function centerOnTarget(zoomLevel = 16) {
  if (!map) return;
  map.flyTo([currentLat, currentLng], zoomLevel, {
    animate: true,
    duration: 1.2,
  });
  addLog(`Traveling to pin (${currentLat.toFixed(5)}, ${currentLng.toFixed(5)})`);
}

// Update Location State & Map Pin
function setTargetLocation(lat, lng, flyToTarget = false) {
  currentLat = parseFloat(lat);
  currentLng = parseFloat(lng);

  latInputEl.value = currentLat.toFixed(6);
  lngInputEl.value = currentLng.toFixed(6);

  const formatted = formatCoordinates(currentLat, currentLng);
  formattedCoordsEl.textContent = formatted;
  overlayCoordsEl.textContent = `${currentLat.toFixed(6)}, ${currentLng.toFixed(6)}`;

  if (marker) {
    marker.setLatLng([currentLat, currentLng]);
  }

  if (flyToTarget && map) {
    centerOnTarget(map.getZoom() < 14 ? 15 : map.getZoom());
  }
}

// Preset Storage Management
function getPresets() {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(INITIAL_DEFAULT_PRESETS));
      return INITIAL_DEFAULT_PRESETS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_DEFAULT_PRESETS;
  } catch (e) {
    return INITIAL_DEFAULT_PRESETS;
  }
}

function savePreset(name, lat, lng) {
  if (!name || name.trim() === "") return;
  const presets = getPresets();
  const newPreset = {
    id: "preset-" + Date.now(),
    name: name.trim(),
    lat: parseFloat(lat),
    lng: parseFloat(lng),
  };
  presets.unshift(newPreset);
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  renderPresets();
  addLog(`Saved preset: "${newPreset.name}"`, "success");
}

function deletePreset(id, itemElement = null) {
  let presets = getPresets();
  presets = presets.filter((p) => p.id !== id);
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));

  if (itemElement && itemElement.parentNode) {
    itemElement.remove();
    if (presets.length === 0) {
      presetListEl.innerHTML = `
        <div class="empty-presets-notice">No saved presets. Click 'Save Current Pin' above.</div>
      `;
    }
  } else {
    renderPresets();
  }
  addLog(`Removed preset.`);
}

function renderPresets() {
  const presets = getPresets();
  presetListEl.innerHTML = "";

  if (presets.length === 0) {
    const emptyNotice = document.createElement("div");
    emptyNotice.className = "empty-presets-notice";
    emptyNotice.textContent = "No saved presets. Click 'Save Current Pin' above.";
    presetListEl.appendChild(emptyNotice);
    return;
  }

  presets.forEach((p) => {
    const item = document.createElement("div");
    item.className = "preset-item";

    const content = document.createElement("div");
    content.className = "preset-item-content";

    const nameSpan = document.createElement("span");
    nameSpan.className = "preset-name";
    nameSpan.textContent = p.name;

    const coordsSpan = document.createElement("span");
    coordsSpan.className = "preset-coords";
    coordsSpan.textContent = `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`;

    content.appendChild(nameSpan);
    content.appendChild(coordsSpan);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "preset-delete-btn";
    deleteBtn.setAttribute("aria-label", "Delete");
    deleteBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;

    // Completely isolate delete button from item row & prevent tooltip/context pop-ups
    const stopAll = (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };
    deleteBtn.addEventListener("pointerdown", stopAll);
    deleteBtn.addEventListener("mousedown", stopAll);
    deleteBtn.addEventListener("mouseup", stopAll);
    deleteBtn.addEventListener("dblclick", stopAll);
    deleteBtn.addEventListener("contextmenu", stopAll);
    deleteBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      deletePreset(p.id, item);
    });

    item.appendChild(content);
    item.appendChild(deleteBtn);

    item.addEventListener("click", () => {
      setTargetLocation(p.lat, p.lng, false);
      centerOnTarget(16);
      addLog(`Loaded preset: ${p.name}`);
    });

    presetListEl.appendChild(item);
  });
}

// Deep decode URLs that have multiple layers of percent-encoding
function multiDecode(raw) {
  let text = String(raw || "");
  for (let i = 0; i < 3; i++) {
    if (text.includes("%")) {
      try { text = decodeURIComponent(text); } catch (e) { break; }
    } else {
      break;
    }
  }
  return text;
}

// Extract coordinates from Google Maps, Apple Maps, AMap (AutoNavi), Baidu, or raw text
function extractCoordinatesFromUrl(rawText) {
  try {
    const text = multiDecode(rawText);

    // 1. Google Maps @lat,lng
    const atMatch = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

    // 2. AMap / AutoNavi p=POI,lat,lng or p=lat,lng
    const aMapPMatch = text.match(/[?&;]p=[^,]+,(-?\d+\.\d+),(-?\d+\.\d+)/i);
    if (aMapPMatch) return { lat: parseFloat(aMapPMatch[1]), lng: parseFloat(aMapPMatch[2]) };

    // 3. Query param coordinates (center=, ll=, sll=, q=, daddr=, loc=, coordinate=)
    const qMatch = text.match(/[?&;](?:center|ll|sll|q|daddr|loc|coordinate)=(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/i);
    if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };

    // 4. /place/lat+lng or /place/lat,lng
    const placeMatch = text.match(/\/place\/(-?\d+\.\d+)[,\+](-?\d+\.\d+)/i);
    if (placeMatch) return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };

    // 5. Raw coordinates in text (e.g. 22.591426, 114.010025)
    const rawCoordMatch = text.match(/(-?\d{1,3}\.\d{3,})[,\s]+(-?\d{1,3}\.\d{3,})/);
    if (rawCoordMatch) return { lat: parseFloat(rawCoordMatch[1]), lng: parseFloat(rawCoordMatch[2]) };
  } catch (e) {}

  return null;
}

// Extract readable place name from Google / Apple Maps / AMap URLs
function extractPlaceNameFromUrl(rawText) {
  try {
    const text = multiDecode(rawText);

    // AMap / AutoNavi p=POI,lat,lng,PlaceTitle
    const aMapPMatch = text.match(/[?&;]p=[^,]+,[^,]+,[^,]+,([^&;,]+)/i);
    if (aMapPMatch) return aMapPMatch[1].replace(/\+/g, " ").trim();

    // Title parameter
    const titleMatch = text.match(/[?&;]title=([^&;]+)/i);
    if (titleMatch) return titleMatch[1].replace(/\+/g, " ").trim();

    // Google Maps /place/PlaceName/
    const placeMatch = text.match(/\/place\/([^/@?]+)/i);
    if (placeMatch) return placeMatch[1].replace(/\+/g, " ").trim();

    // Query parameter q=PlaceName
    const qMatch = text.match(/[?&;]q=([^&;]+)/i);
    if (qMatch && !qMatch[1].match(/^-?\d/)) return qMatch[1].replace(/\+/g, " ").trim();
  } catch (e) {}
  return null;
}

// Handle Map Link Paste / Coordinate Import
async function handleLocationInput(rawInput) {
  let text = (rawInput || "").trim();
  if (!text) return;

  addLog(`Processing input: "${text.substring(0, 48)}..."`);

  // If it's a URL
  if (text.startsWith("http://") || text.startsWith("https://")) {
    let coords = extractCoordinatesFromUrl(text);

    // If coordinates weren't directly visible (e.g. surl.amap.com, maps.app.goo.gl or short links)
    if (!coords) {
      addLog("Resolving map short link redirect...");
      try {
        const resolved = await tauriInvoke("resolve_url", { url: text });
        if (resolved && resolved !== text) {
          text = resolved;
          coords = extractCoordinatesFromUrl(text);
        }
      } catch (err) {
        console.error("Resolve link error:", err);
      }
    }

    if (coords) {
      const placeName = extractPlaceNameFromUrl(text) || `Pin (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`;
      setTargetLocation(coords.lat, coords.lng, false);
      centerOnTarget(16);
      savePreset(placeName, coords.lat, coords.lng);
      addLog(`Imported location from link: "${placeName}"`, "success");
      return;
    }

    // If URL has a place name without direct coords
    const queryName = extractPlaceNameFromUrl(text);
    if (queryName) {
      addLog(`Geocoding venue from link: "${queryName}"...`);
      await searchAddress(queryName, true);
      return;
    }
  }

  // Check if raw coordinates
  const rawCoords = extractCoordinatesFromUrl(text);
  if (rawCoords) {
    const name = `Pin (${rawCoords.lat.toFixed(4)}, ${rawCoords.lng.toFixed(4)})`;
    setTargetLocation(rawCoords.lat, rawCoords.lng, false);
    centerOnTarget(16);
    savePreset(name, rawCoords.lat, rawCoords.lng);
    addLog(`Target pin set to ${rawCoords.lat.toFixed(5)}, ${rawCoords.lng.toFixed(5)}`, "success");
    return;
  }

  // Fallback: Geocode text address via Nominatim
  await searchAddress(text, true);
}

// Search Place / Address via Nominatim
async function searchAddress(query, autoSave = false) {
  if (!query || query.trim() === "") return;
  addLog(`Geocoding query: "${query}"...`);

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "GeoShift-GPS-Tool/1.0" },
    });
    const results = await resp.json();

    if (results && results.length > 0) {
      const first = results[0];
      const lat = parseFloat(first.lat);
      const lng = parseFloat(first.lon);
      setTargetLocation(lat, lng, false);
      centerOnTarget(16);
      const shortName = first.display_name.split(",")[0] || query;
      if (autoSave) {
        savePreset(shortName, lat, lng);
      }
      addLog(`Found: ${first.display_name.substring(0, 48)}...`, "success");
    } else {
      addLog(`Location not found for: "${query}"`, "error");
    }
  } catch (err) {
    addLog(`Geocoding error: ${err.message}`, "error");
  }
}

// Initialize Leaflet Map with High-Speed Simultaneous Tile Rendering
function initMap() {
  map = L.map("map", {
    center: [currentLat, currentLng],
    zoom: 16,
    zoomControl: true,
    preferCanvas: true,
  });

  // High-performance OpenStreetMap with multi-subdomain concurrent downloads
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    subdomains: ["a", "b", "c"],
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    minZoom: 2,
    updateWhenIdle: false,     // Render continuously during pan/zoom (no chunk delays!)
    updateWhenZooming: true,   // Seamless simultaneous tile updating
    updateInterval: 15,        // Check and fetch chunks every 15ms (13x faster than default 200ms)
    keepBuffer: 24,            // Cache 24 tiles in memory around viewport for instant panning
    crossOrigin: true,
  }).addTo(map);

  // Precision Target Marker Icon
  const reticleIcon = L.divIcon({
    className: "custom-reticle-marker",
    html: `
      <svg width="34" height="34" viewBox="0 0 32 32" fill="none" style="filter: drop-shadow(0 2px 6px rgba(0,0,0,0.7));">
        <circle cx="16" cy="16" r="6" stroke="#4cc38a" stroke-width="2" fill="#141415" />
        <circle cx="16" cy="16" r="2" fill="#4cc38a" />
        <line x1="16" y1="2" x2="16" y2="10" stroke="#4cc38a" stroke-width="1.8" />
        <line x1="16" y1="22" x2="16" y2="30" stroke="#4cc38a" stroke-width="1.8" />
        <line x1="2" y1="16" x2="10" y2="16" stroke="#4cc38a" stroke-width="1.8" />
        <line x1="22" y1="16" x2="30" y2="16" stroke="#4cc38a" stroke-width="1.8" />
      </svg>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

  marker = L.marker([currentLat, currentLng], {
    icon: reticleIcon,
    draggable: true,
  }).addTo(map);

  marker.on("dragend", () => {
    const pos = marker.getLatLng();
    setTargetLocation(pos.lat, pos.lng, false);
    addLog(`Pin moved to ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`);
  });

  // Map Click Listener
  map.on("click", (e) => {
    setTargetLocation(e.latlng.lat, e.latlng.lng, false);
    addLog(`Placed pin at ${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`);
  });
}

// Poll Connected iOS Devices via Tauri
async function pollDevices() {
  try {
    const raw = await tauriInvoke("get_devices");
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed) && parsed.length > 0) {
      connectedDevices = parsed;
      const dev = parsed[0];

      if (deviceGlyphContainerEl) {
        deviceGlyphContainerEl.innerHTML = getDeviceIconSvg(dev);
      }

      const platformName = dev.platform === "android" ? "Android" : "iPhone";
      const osLabel = dev.platform === "android" ? (dev.version || "Android") : `iOS ${dev.version || "Unknown"}`;

      if (dev.developer_mode === false) {
        statusDotEl.className = "status-dot connected";
        deviceStateTextEl.textContent = dev.platform === "android" ? "Android Connected (Auth Required)" : "iPhone Connected (Dev Mode OFF)";
        deviceModelEl.textContent = dev.model || dev.name || platformName;
        deviceOsEl.textContent = osLabel;
        deviceUdidEl.textContent = dev.error || (dev.platform === "android" ? "Tap 'Allow USB Debugging' on phone screen" : "Enable in Settings > Privacy & Security > Developer Mode");

        if (dev.platform === "ios") {
          devModeCardBtn?.classList.remove("hidden");
          // Automatically trigger popup modal once per device connection
          if (lastAutoPromptedDevModeUdid !== dev.udid) {
            lastAutoPromptedDevModeUdid = dev.udid;
            openDevModeModal(dev);
          }
        } else {
          devModeCardBtn?.classList.add("hidden");
        }
      } else {
        devModeCardBtn?.classList.add("hidden");
        statusDotEl.className = isSimulating ? "status-dot active" : "status-dot connected";
        deviceStateTextEl.textContent = isSimulating ? "GPS Override Active" : `${platformName} Connected (Ready)`;
        deviceModelEl.textContent = dev.model || dev.name || platformName;
        deviceOsEl.textContent = osLabel;
        deviceUdidEl.textContent = dev.udid ? `ID: ${dev.udid.substring(0, 16)}...` : "USB Link Ready";
      }
    } else {
      connectedDevices = [];
      devModeCardBtn?.classList.add("hidden");
      lastAutoPromptedDevModeUdid = null;
      if (deviceGlyphContainerEl) {
        deviceGlyphContainerEl.innerHTML = getDeviceIconSvg(null);
      }
      statusDotEl.className = "status-dot";
      deviceStateTextEl.textContent = "No Device Connected";
      deviceModelEl.textContent = "—";
      deviceOsEl.textContent = "—";
      deviceUdidEl.textContent = "Connect phone via USB cable";
    }
  } catch (err) {
    deviceStateTextEl.textContent = "USB Monitor Idle";
  }
}

// Event Listeners Setup
function setupListeners() {
  // Search Form Submit
  searchFormEl.addEventListener("submit", (e) => {
    e.preventDefault();
    handleLocationInput(searchInputEl.value);
  });

  // Direct Paste Listener on Search Input
  searchInputEl.addEventListener("paste", (e) => {
    const pasted = (e.clipboardData || window.clipboardData)?.getData("text");
    if (pasted && (pasted.includes("http") || pasted.includes("maps") || pasted.includes("amap") || pasted.includes(","))) {
      setTimeout(() => {
        handleLocationInput(pasted);
      }, 50);
    }
  });

  // Paste Quick Button from Clipboard
  pasteQuickBtn?.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        searchInputEl.value = text;
        handleLocationInput(text);
      } else {
        addLog("Clipboard is empty.");
      }
    } catch (err) {
      addLog("Clipboard permission denied. Use Cmd+V to paste into the search box.");
    }
  });

  // Coordinate Input Manual Edits
  const handleCoordInputChange = () => {
    const lat = parseFloat(latInputEl.value);
    const lng = parseFloat(lngInputEl.value);
    if (!isNaN(lat) && !isNaN(lng)) {
      setTargetLocation(lat, lng, true);
    }
  };
  latInputEl.addEventListener("change", handleCoordInputChange);
  lngInputEl.addEventListener("change", handleCoordInputChange);

  // Center / Travel to Pin Buttons
  centerTargetBtn?.addEventListener("click", () => centerOnTarget(16));
  mapFabCenterBtn?.addEventListener("click", () => centerOnTarget(16));
  reticleInfoEl?.addEventListener("click", () => centerOnTarget(16));

  // Developer Mode Modal Triggers & USB Activation
  devModeModalClose?.addEventListener("click", closeDevModeModal);
  devModeCancelBtn?.addEventListener("click", closeDevModeModal);
  devModeModal?.addEventListener("click", (e) => {
    if (e.target === devModeModal) {
      closeDevModeModal();
    }
  });

  devModeCardBtn?.addEventListener("click", () => {
    if (connectedDevices.length > 0) {
      openDevModeModal(connectedDevices[0]);
    }
  });

  devModeActivateBtn?.addEventListener("click", async () => {
    if (!devModeActivateBtn) return;
    devModeActivateBtn.disabled = true;
    devModeActivateBtn.innerHTML = `<span>Sending Activation Signal...</span>`;
    addLog("Sending iOS Developer Mode activation signal over USB...", "normal");

    try {
      const raw = await tauriInvoke("enable_developer_mode", {
        udid: activeDevModeDevice?.udid || null,
      });
      const res = JSON.parse(raw);

      if (res.success) {
        if (devModeAlert) {
          devModeAlert.className = "modal-alert";
          devModeAlert.textContent = res.message || "Activation signal sent! Follow the steps on your iPhone.";
          devModeAlert.classList.remove("hidden");
        }
        devModeActivateBtn.innerHTML = `<span>Signal Sent ✓ (Restart iPhone)</span>`;
        addLog(`Developer Mode command sent: ${res.message}`, "success");
      } else {
        if (devModeAlert) {
          devModeAlert.className = "modal-alert error";
          devModeAlert.textContent = res.error || "Failed to communicate with device. Make sure iPhone is unlocked & trusted.";
          devModeAlert.classList.remove("hidden");
        }
        devModeActivateBtn.disabled = false;
        devModeActivateBtn.innerHTML = `<span>Try Again</span>`;
        addLog(`Developer Mode activation error: ${res.error}`, "error");
      }
    } catch (err) {
      if (devModeAlert) {
        devModeAlert.className = "modal-alert error";
        devModeAlert.textContent = `Error: ${err}`;
        devModeAlert.classList.remove("hidden");
      }
      devModeActivateBtn.disabled = false;
      devModeActivateBtn.innerHTML = `<span>Try Again</span>`;
      addLog(`Developer Mode activation exception: ${err}`, "error");
    }
  });

  // Preset Add / Cancel Form Toggles
  addPresetTriggerBtn?.addEventListener("click", () => {
    addPresetForm.classList.toggle("hidden");
    if (!addPresetForm.classList.contains("hidden")) {
      presetNameInput.focus();
    }
  });

  presetCancelBtn?.addEventListener("click", () => {
    addPresetForm.classList.add("hidden");
    presetNameInput.value = "";
  });

  addPresetForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = presetNameInput.value.trim();
    if (name) {
      savePreset(name, currentLat, currentLng);
      presetNameInput.value = "";
      addPresetForm.classList.add("hidden");
    }
  });

  // Action: Simulate Location
  simulateBtn.addEventListener("click", async () => {
    addLog(`Engaging simulation -> ${currentLat.toFixed(6)}, ${currentLng.toFixed(6)}...`);
    simulateBtn.disabled = true;

    try {
      const raw = await tauriInvoke("set_location", {
        lat: currentLat,
        lng: currentLng,
      });
      const res = JSON.parse(raw);

      if (res.success) {
        isSimulating = true;
        statusDotEl.className = "status-dot active";
        addLog(`GPS overridden successfully! Device is now reporting target location.`, "success");
      } else {
        if (res.developer_mode_disabled) {
          addLog("Simulation blocked: Developer Mode is disabled on iPhone.", "error");
          addLog("Prompting Developer Mode activation dialog...", "normal");
          if (connectedDevices.length > 0) {
            openDevModeModal(connectedDevices[0]);
          }
        } else {
          addLog(`Simulation failed: ${res.error || "Check iPhone trust & USB connection"}`, "error");
        }
      }
    } catch (err) {
      addLog(`Error: ${err}`, "error");
    } finally {
      simulateBtn.disabled = false;
    }
  });

  // Action: Clear / Restore Hardware GPS
  clearBtn.addEventListener("click", async () => {
    addLog("Clearing GPS simulation & restoring hardware satellites...");
    clearBtn.disabled = true;

    try {
      const raw = await tauriInvoke("clear_location");
      const res = JSON.parse(raw);

      if (res.success) {
        isSimulating = false;
        statusDotEl.className = connectedDevices.length > 0 ? "status-dot connected" : "status-dot";
        addLog("Hardware GPS restored. Real location re-engaged.", "success");
      } else {
        addLog(`Reset response: ${res.error || "Device not responding"}`, "error");
      }
    } catch (err) {
      addLog(`Error: ${err}`, "error");
    } finally {
      clearBtn.disabled = false;
    }
  });

  // Clear Log Button
  clearLogBtn.addEventListener("click", () => {
    logStreamEl.innerHTML = "";
    addLog("Log cleared.");
  });

  // Map Style Toggle
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  const themeToggleText = document.getElementById("theme-toggle-text");
  themeToggleBtn?.addEventListener("click", () => {
    document.body.classList.toggle("light-map");
    const isLight = document.body.classList.contains("light-map");
    themeToggleText.textContent = isLight ? "Standard Map" : "Dark Instrument";
  });
}

// Prevent default OS/browser context menu popups anywhere in the native window
window.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});

// Lifecycle Init
window.addEventListener("DOMContentLoaded", () => {
  initMap();
  setTargetLocation(currentLat, currentLng, false);
  renderPresets();
  setupListeners();

  if (deviceGlyphContainerEl) {
    deviceGlyphContainerEl.innerHTML = getDeviceIconSvg(null);
  }

  // Initial device scan and periodic poller (every 2.5 seconds)
  pollDevices();
  setInterval(pollDevices, 2500);
});
