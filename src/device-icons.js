// GeoShift — Device Hardware Silhouette Database & Icon Renderer
// Provides authentic miniature vector graphics for iOS and Android hardware models

export function getDeviceIconSvg(device) {
  if (!device) {
    // Disconnected / Idle State: Phone wireframe with USB cable
    return `
      <svg class="device-glyph disconnected" viewBox="0 0 28 48" width="24" height="42" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Phone Outline -->
        <rect x="2" y="2" width="24" height="36" rx="5" stroke="var(--border-subtle)" stroke-width="1.2" stroke-dasharray="2.5 2"/>
        <!-- Screen Area -->
        <rect x="4" y="4" width="20" height="32" rx="3.5" fill="rgba(255,255,255,0.02)"/>
        <!-- Top Speaker bar -->
        <line x1="11" y1="6" x2="17" y2="6" stroke="var(--border-subtle)" stroke-width="1" stroke-linecap="round"/>
        <!-- USB Cable Plug hovering below -->
        <rect x="11" y="40" width="6" height="4" rx="1" fill="var(--bg-raised)" stroke="var(--text-muted)" stroke-width="0.8"/>
        <line x1="14" y1="44" x2="14" y2="48" stroke="var(--text-muted)" stroke-width="1.2"/>
        <!-- USB Pin -->
        <rect x="12.5" y="38" width="3" height="2" fill="var(--color-positive)" opacity="0.8"/>
      </svg>
    `;
  }

  const modelLower = (device.model || "").toLowerCase();
  const nameLower = (device.name || "").toLowerCase();
  const platform = (device.platform || "ios").toLowerCase();

  // 1. APPLE IPAD FAMILY
  if (modelLower.includes("ipad") || nameLower.includes("ipad")) {
    return `
      <svg class="device-glyph connected apple" viewBox="0 0 34 46" width="28" height="38" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="32" height="44" rx="5" fill="#181B20" stroke="#3D4452" stroke-width="1.2"/>
        <rect x="3" y="3" width="28" height="40" rx="3.5" fill="#0A0C0E"/>
        <circle cx="17" cy="5.5" r="1" fill="#4B5363"/>
        <line x1="13" y1="41" x2="21" y2="41" stroke="#4B5363" stroke-width="1" stroke-linecap="round"/>
      </svg>
    `;
  }

  // 2. APPLE IPHONE — DYNAMIC ISLAND FAMILY (14 Pro, 14 Pro Max, 15, 15 Pro, 16, 16 Pro)
  const isDynamicIsland = 
    modelLower.includes("14 pro") ||
    modelLower.includes("15") ||
    modelLower.includes("16");

  if (platform === "ios" && isDynamicIsland) {
    const isMax = modelLower.includes("max") || modelLower.includes("plus");
    const h = isMax ? 46 : 44;
    return `
      <svg class="device-glyph connected apple" viewBox="0 0 28 48" width="24" height="42" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Titanium/Steel Outer Frame -->
        <rect x="1" y="1" width="26" height="${h}" rx="6" fill="#181B20" stroke="#485162" stroke-width="1.2"/>
        <!-- Side Buttons (Volume & Action) -->
        <line x1="0.5" y1="10" x2="0.5" y2="13" stroke="#3A404D" stroke-width="1"/>
        <line x1="0.5" y1="16" x2="0.5" y2="21" stroke="#3A404D" stroke-width="1"/>
        <line x1="0.5" y1="23" x2="0.5" y2="28" stroke="#3A404D" stroke-width="1"/>
        <line x1="27.5" y1="17" x2="27.5" y2="25" stroke="#3A404D" stroke-width="1"/>
        <!-- OLED Display -->
        <rect x="2.5" y="2.5" width="23" height="${h - 3}" rx="4.5" fill="#0A0C0E"/>
        <!-- Dynamic Island Pill Cutout -->
        <rect x="10" y="4.5" width="8" height="2.4" rx="1.2" fill="#181B20"/>
        <circle cx="16" cy="5.7" r="0.6" fill="#0A0C0E"/>
        <!-- iOS Home Indicator -->
        <line x1="10" y1="${h - 3}" x2="18" y2="${h - 3}" stroke="#485162" stroke-width="1" stroke-linecap="round"/>
      </svg>
    `;
  }

  // 3. APPLE IPHONE — CLASSIC NOTCH FAMILY (X, XS, XR, 11, 11 Pro, 11 Pro Max, 12, 13, 14)
  const isNotch = 
    modelLower.includes("iphone 11") ||
    modelLower.includes("iphone 12") ||
    modelLower.includes("iphone 13") ||
    modelLower.includes("iphone 14") ||
    modelLower.includes("iphone x");

  if (platform === "ios" && (isNotch || true)) {
    // Check if Pro Max (taller proportions)
    const isProMax = modelLower.includes("max") || modelLower.includes("plus");
    const h = isProMax ? 46 : 43;
    const notchWidth = modelLower.includes("13") || modelLower.includes("14") ? 8 : 10;
    const notchX = 14 - notchWidth / 2;

    return `
      <svg class="device-glyph connected apple iphone-notch" viewBox="0 0 28 48" width="24" height="42" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Outer Chassis -->
        <rect x="1" y="1" width="26" height="${h}" rx="6" fill="#181B20" stroke="#485162" stroke-width="1.2"/>
        <!-- Side Buttons -->
        <line x1="0.5" y1="11" x2="0.5" y2="15" stroke="#3A404D" stroke-width="1"/>
        <line x1="0.5" y1="17" x2="0.5" y2="22" stroke="#3A404D" stroke-width="1"/>
        <line x1="27.5" y1="16" x2="27.5" y2="23" stroke="#3A404D" stroke-width="1"/>
        <!-- OLED Screen Area -->
        <rect x="2.5" y="2.5" width="23" height="${h - 3}" rx="4.5" fill="#0A0C0E"/>
        <!-- Apple Sensor Notch -->
        <path d="M ${notchX} 2.5 L ${notchX} 5.5 A 1.2 1.2 0 0 0 ${notchX + 1.2} 6.7 L ${notchX + notchWidth - 1.2} 6.7 A 1.2 1.2 0 0 0 ${notchX + notchWidth} 5.5 L ${notchX + notchWidth} 2.5 Z" fill="#181B20"/>
        <line x1="12" y1="4" x2="16" y2="4" stroke="#333946" stroke-width="0.8" stroke-linecap="round"/>
        <!-- Home Bar Indicator -->
        <line x1="10" y1="${h - 3}" x2="18" y2="${h - 3}" stroke="#485162" stroke-width="1" stroke-linecap="round"/>
      </svg>
    `;
  }

  // 4. ANDROID: XIAOMI / REDMI / POCO
  const isXiaomi = 
    modelLower.includes("redmi") ||
    modelLower.includes("xiaomi") ||
    modelLower.includes("poco") ||
    modelLower.startsWith("240") ||
    modelLower.startsWith("231") ||
    modelLower.startsWith("220");

  if (isXiaomi) {
    return `
      <svg class="device-glyph connected android xiaomi" viewBox="0 0 28 48" width="24" height="42" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Modern Slim Bezel Chassis -->
        <rect x="1" y="1" width="26" height="45" rx="5" fill="#181B20" stroke="#3E4554" stroke-width="1.2"/>
        <!-- Side Power/Volume Buttons -->
        <line x1="27.5" y1="13" x2="27.5" y2="19" stroke="#3A404D" stroke-width="1"/>
        <line x1="27.5" y1="22" x2="27.5" y2="27" stroke="#3A404D" stroke-width="1"/>
        <!-- DotDisplay AMOLED Screen -->
        <rect x="2.5" y="2.5" width="23" height="42" rx="3.8" fill="#0A0C0E"/>
        <!-- Tiny Center Punch-Hole Selfie Camera -->
        <circle cx="14" cy="5.5" r="1.2" fill="#181B20" stroke="#252A34" stroke-width="0.6"/>
        <circle cx="14" cy="5.5" r="0.5" fill="#38BDF8"/>
        <!-- Android Gesture Bar -->
        <line x1="11" y1="42" x2="17" y2="42" stroke="#3D4452" stroke-width="1" stroke-linecap="round"/>
      </svg>
    `;
  }

  // 5. ANDROID: SAMSUNG GALAXY
  const isSamsung = 
    modelLower.includes("samsung") ||
    modelLower.includes("galaxy") ||
    modelLower.startsWith("sm-");

  if (isSamsung) {
    const isUltra = modelLower.includes("ultra");
    const rx = isUltra ? 2.5 : 5; // Note/Ultra has boxier corners
    return `
      <svg class="device-glyph connected android samsung" viewBox="0 0 28 48" width="24" height="42" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Galaxy Armor Aluminum Chassis -->
        <rect x="1" y="1" width="26" height="45" rx="${rx}" fill="#181B20" stroke="#424A5A" stroke-width="1.2"/>
        <line x1="27.5" y1="14" x2="27.5" y2="20" stroke="#3A404D" stroke-width="1"/>
        <line x1="27.5" y1="23" x2="27.5" y2="28" stroke="#3A404D" stroke-width="1"/>
        <!-- Dynamic AMOLED Screen -->
        <rect x="2.2" y="2.2" width="23.6" height="42.6" rx="${rx - 0.5}" fill="#0A0C0E"/>
        <!-- Infinity-O Camera Cutout -->
        <circle cx="14" cy="5.2" r="1.1" fill="#181B20" stroke="#2D333F" stroke-width="0.5"/>
        <circle cx="14" cy="5.2" r="0.4" fill="#38BDF8"/>
        <!-- One UI Gesture Bar -->
        <line x1="11" y1="42.5" x2="17" y2="42.5" stroke="#3D4452" stroke-width="1" stroke-linecap="round"/>
      </svg>
    `;
  }

  // 6. ANDROID: GOOGLE PIXEL
  const isPixel = modelLower.includes("pixel");
  if (isPixel) {
    return `
      <svg class="device-glyph connected android pixel" viewBox="0 0 28 48" width="24" height="42" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Pixel Curvature Chassis -->
        <rect x="1" y="1" width="26" height="45" rx="5.5" fill="#181B20" stroke="#424A5A" stroke-width="1.2"/>
        <line x1="27.5" y1="13" x2="27.5" y2="17" stroke="#3A404D" stroke-width="1"/>
        <line x1="27.5" y1="20" x2="27.5" y2="26" stroke="#3A404D" stroke-width="1"/>
        <!-- Actua OLED Display -->
        <rect x="2.5" y="2.5" width="23" height="42" rx="4.2" fill="#0A0C0E"/>
        <!-- Centered Punch Hole -->
        <circle cx="14" cy="5.4" r="1.2" fill="#181B20" stroke="#252A34" stroke-width="0.6"/>
        <!-- Material You Pill -->
        <line x1="11" y1="42" x2="17" y2="42" stroke="#485162" stroke-width="1" stroke-linecap="round"/>
      </svg>
    `;
  }

  // 7. GENERIC SMARTPHONE FALLBACK (Other Android / OnePlus / Motorola / Sony)
  return `
    <svg class="device-glyph connected generic" viewBox="0 0 28 48" width="24" height="42" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="26" height="45" rx="5" fill="#181B20" stroke="#3D4452" stroke-width="1.2"/>
      <rect x="2.5" y="2.5" width="23" height="42" rx="3.8" fill="#0A0C0E"/>
      <circle cx="14" cy="5.5" r="1.1" fill="#181B20"/>
      <line x1="11" y1="42" x2="17" y2="42" stroke="#3D4452" stroke-width="1" stroke-linecap="round"/>
    </svg>
  `;
}
