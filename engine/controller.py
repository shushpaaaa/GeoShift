import sys
import json
import asyncio
import shutil
import subprocess
import time
from typing import List, Dict, Any

# Map Apple product type identifiers to human-readable names
DEVICE_MAP = {
    "iPhone9,1": "iPhone 7",
    "iPhone9,3": "iPhone 7",
    "iPhone9,2": "iPhone 7 Plus",
    "iPhone9,4": "iPhone 7 Plus",
    "iPhone10,1": "iPhone 8",
    "iPhone10,4": "iPhone 8",
    "iPhone10,2": "iPhone 8 Plus",
    "iPhone10,5": "iPhone 8 Plus",
    "iPhone10,3": "iPhone X",
    "iPhone10,6": "iPhone X",
    "iPhone11,2": "iPhone XS",
    "iPhone11,4": "iPhone XS Max",
    "iPhone11,6": "iPhone XS Max",
    "iPhone11,8": "iPhone XR",
    "iPhone12,1": "iPhone 11",
    "iPhone12,3": "iPhone 11 Pro",
    "iPhone12,5": "iPhone 11 Pro Max",
    "iPhone12,8": "iPhone SE (2nd gen)",
    "iPhone13,1": "iPhone 12 mini",
    "iPhone13,2": "iPhone 12",
    "iPhone13,3": "iPhone 12 Pro",
    "iPhone13,4": "iPhone 12 Pro Max",
    "iPhone14,4": "iPhone 13 mini",
    "iPhone14,5": "iPhone 13",
    "iPhone14,2": "iPhone 13 Pro",
    "iPhone14,3": "iPhone 13 Pro Max",
    "iPhone14,6": "iPhone SE (3rd gen)",
    "iPhone14,7": "iPhone 14",
    "iPhone14,8": "iPhone 14 Plus",
    "iPhone15,2": "iPhone 14 Pro",
    "iPhone15,3": "iPhone 14 Pro Max",
    "iPhone15,4": "iPhone 15",
    "iPhone15,5": "iPhone 15 Plus",
    "iPhone16,1": "iPhone 15 Pro",
    "iPhone16,2": "iPhone 15 Pro Max",
    "iPhone17,1": "iPhone 16 Pro",
    "iPhone17,2": "iPhone 16 Pro Max",
    "iPhone17,3": "iPhone 16",
    "iPhone17,4": "iPhone 16 Plus",
}

def get_adb_path() -> str:
    return shutil.which("adb") or "/opt/homebrew/bin/adb"

async def get_ios_devices() -> List[Dict[str, Any]]:
    devices = []
    try:
        from pymobiledevice3.usbmux import list_devices
        from pymobiledevice3.lockdown import create_using_usbmux
        
        mux_devices = await list_devices()
        for d in mux_devices:
            udid = getattr(d, "serial", str(d))
            conn_type = getattr(d, "connection_type", "USB")
            dev_info = {
                "platform": "ios",
                "udid": udid,
                "connection": conn_type,
                "name": "iPhone",
                "model": "iPhone",
                "version": "Unknown",
                "paired": False,
                "developer_mode": True,
            }
            try:
                lockdown = await create_using_usbmux(serial=udid)
                dev_info["name"] = lockdown.short_info.get("DeviceName", "iPhone")
                prod_type = lockdown.short_info.get("ProductType", "")
                dev_info["model"] = DEVICE_MAP.get(prod_type, prod_type or "iPhone")
                dev_info["version"] = lockdown.short_info.get("ProductVersion", "Unknown")
                dev_info["paired"] = True

                # Check Developer Mode status & automatically reveal toggle if hidden
                try:
                    dev_mode = await lockdown.get_developer_mode_status()
                    dev_info["developer_mode"] = bool(dev_mode)
                    if not dev_mode:
                        try:
                            from pymobiledevice3.services.amfi import AmfiService
                            amfi = AmfiService(lockdown)
                            await amfi.reveal_developer_mode_option_in_ui()
                        except Exception:
                            pass
                except Exception:
                    pass
            except Exception as e:
                dev_info["error"] = str(e)

            devices.append(dev_info)
    except Exception:
        pass
    return devices

def get_android_devices() -> List[Dict[str, Any]]:
    devices = []
    adb = get_adb_path()
    try:
        proc = subprocess.run([adb, "devices", "-l"], capture_output=True, text=True, timeout=2.0)
        lines = proc.stdout.strip().splitlines()
        if len(lines) > 1:
            for line in lines[1:]:
                line = line.strip()
                if not line:
                    continue
                parts = line.split()
                if len(parts) < 2:
                    continue
                serial = parts[0]
                state = parts[1]
                props = dict(p.split(":", 1) for p in parts[2:] if ":" in p)

                brand = props.get("model", "Android")
                raw_model = props.get("model", props.get("device", "Android Device"))
                model = raw_model
                version = "Android"

                # If device is authorized, query rich props
                if state == "device":
                    try:
                        marketname = subprocess.check_output([adb, "-s", serial, "shell", "getprop", "ro.product.marketname"], text=True, timeout=1.0).strip()
                        b = subprocess.check_output([adb, "-s", serial, "shell", "getprop", "ro.product.brand"], text=True, timeout=1.0).strip()
                        m = subprocess.check_output([adb, "-s", serial, "shell", "getprop", "ro.product.model"], text=True, timeout=1.0).strip()
                        v = subprocess.check_output([adb, "-s", serial, "shell", "getprop", "ro.build.version.release"], text=True, timeout=1.0).strip()
                        if marketname:
                            model = marketname
                        elif b or m:
                            model = f"{b.capitalize()} {m}".strip()
                        if v:
                            version = f"Android {v}"
                    except Exception:
                        pass
                else:
                    # In unauthorized state, make model name clean if known prefix
                    if raw_model.startswith("240") or raw_model.startswith("231") or raw_model.startswith("220"):
                        model = f"Redmi {raw_model}"
                    elif raw_model.startswith("SM-"):
                        model = f"Samsung {raw_model}"

                dev_info = {
                    "platform": "android",
                    "udid": serial,
                    "connection": "USB",
                    "name": model,
                    "model": model,
                    "version": version,
                    "paired": state == "device",
                    "developer_mode": state == "device",
                    "state": state,
                }
                if state == "unauthorized":
                    dev_info["error"] = "Unlock screen & tap 'Allow USB Debugging'"
                devices.append(dev_info)
    except Exception:
        pass
    return devices

async def get_devices() -> List[Dict[str, Any]]:
    ios_devs = await get_ios_devices()
    android_devs = get_android_devices()
    return ios_devs + android_devs

def parse_ios_version(version_str: str) -> float:
    try:
        parts = str(version_str).strip().split(".")
        if len(parts) >= 2:
            return float(f"{parts[0]}.{parts[1]}")
        return float(parts[0])
    except Exception:
        return 16.0

async def set_ios_location(lat: float, lng: float, udid: str = None) -> Dict[str, Any]:
    from pymobiledevice3.lockdown import create_using_usbmux
    from pymobiledevice3.services.simulate_location import DtSimulateLocation

    lockdown = await create_using_usbmux(serial=udid)
    version_str = lockdown.short_info.get("ProductVersion", "16.0")
    major_version = parse_ios_version(version_str)
    is_modern_ios = major_version >= 17.0

    # 1. Verify Developer Mode
    try:
        dev_mode = await lockdown.get_developer_mode_status()
        if not dev_mode:
            return {
                "success": False,
                "error": (
                    "Developer Mode is disabled on your iPhone. "
                    "On your iPhone, open Settings > Privacy & Security > Developer Mode, "
                    "toggle it ON, and tap Restart. After rebooting, unlock your device and tap 'Turn On'."
                ),
                "developer_mode_disabled": True,
            }
    except Exception:
        pass

    # 2. Legacy simulate_location service ONLY for iOS < 17
    # On iOS 17+, com.apple.dt.simulatelocation was removed by Apple in favor of RSD DVT.
    # Bypassing it directly prevents socket stalls, InvalidServiceError, and the need for a 2nd click.
    dt_error = None
    if not is_modern_ios:
        try:
            try:
                from pymobiledevice3.services.mobile_image_mounter import auto_mount
                await auto_mount(lockdown)
            except Exception:
                pass

            loc = DtSimulateLocation(lockdown)
            # Send burst of 2 pulses to satisfy locationd outlier filter
            await loc.set(lat, lng)
            await asyncio.sleep(0.08)
            await loc.set(lat, lng)
            return {"success": True, "platform": "ios", "lat": lat, "lng": lng, "version": version_str, "method": "dt_simulate"}
        except Exception as e:
            dt_error = e

    # 3. DVT Location Simulation (iOS 17+ or fallback over native remoted RSD tunnel)
    try:
        from pymobiledevice3.remote import native_tunnel
        from pymobiledevice3.services.dvt.instruments.dvt_provider import DvtProvider
        from pymobiledevice3.services.dvt.instruments.location_simulation import LocationSimulation

        serial = getattr(lockdown, "serial", None)
        rsd = await native_tunnel.establish_native_rsd(serial=serial)

        try:
            from pymobiledevice3.services.mobile_image_mounter import auto_mount
            await auto_mount(rsd)
        except Exception:
            pass

        async with DvtProvider(rsd) as dvt:
            async with LocationSimulation(dvt) as loc_service:
                # Send burst of 3 location updates spaced 80ms apart.
                # Apple locationd filters single sudden leaps as transient sensor noise.
                # Sending 3 consecutive pulses confirms the fix so running apps update on the 1st press.
                for i in range(3):
                    await loc_service.set(lat, lng)
                    if i < 2:
                        await asyncio.sleep(0.08)
                return {"success": True, "platform": "ios", "lat": lat, "lng": lng, "version": version_str, "method": "dvt"}
    except Exception as dvt_error:
        err_msg = str(dvt_error) if dvt_error else str(dt_error)
        if "Developer Mode" in err_msg or "com.apple.instruments.dtservicehub" in err_msg or "InvalidServiceError" in err_msg:
            err_msg = (
                "iOS Developer Mode is required. "
                "On your iPhone: Settings > Privacy & Security > Developer Mode -> Turn ON -> Restart -> Tap 'Turn On'."
            )
        return {"success": False, "platform": "ios", "error": err_msg}

def set_android_location(lat: float, lng: float, serial: str = None) -> Dict[str, Any]:
    adb = get_adb_path()
    cmd_prefix = [adb]
    if serial:
        cmd_prefix.extend(["-s", serial])

    try:
        # Enable mock location permission for shell if needed
        subprocess.run(cmd_prefix + ["shell", "settings", "put", "secure", "mock_location", "1"], capture_output=True, timeout=2.0)

        # Use cmd location providers (standard on Android 11+)
        # Add test provider and enable both GPS and Network providers
        for provider in ["gps", "network"]:
            subprocess.run(cmd_prefix + ["shell", "cmd", "location", "providers", "add-test-provider", provider], capture_output=True, timeout=2.0)
            subprocess.run(cmd_prefix + ["shell", "cmd", "location", "providers", "set-test-provider-enabled", provider, "true"], capture_output=True, timeout=2.0)

        # Brief settling delay so Android LocationManagerService finishes provider state transition
        time.sleep(0.08)

        # Send burst of 2 location pulses spaced 80ms apart
        # so Google Play Services FusedLocationProvider and listener apps commit the new coordinates immediately on 1st press
        for i in range(2):
            for provider in ["gps", "network"]:
                subprocess.run(
                    cmd_prefix + ["shell", "cmd", "location", "providers", "set-test-provider-location", provider, "--location", f"{lat},{lng}"],
                    capture_output=True,
                    timeout=2.0
                )
            if i < 1:
                time.sleep(0.08)

        return {"success": True, "platform": "android", "lat": lat, "lng": lng, "method": "adb_cmd_location"}
    except Exception as e:
        return {"success": False, "platform": "android", "error": f"ADB simulation failed: {e}"}

async def set_location(lat: float, lng: float) -> Dict[str, Any]:
    devices = await get_devices()
    if not devices:
        return {"success": False, "error": "No iOS or Android device connected over USB."}

    # Simulate on all connected devices (or primary)
    results = []
    for d in devices:
        platform = d.get("platform", "ios")
        udid = d.get("udid")
        if platform == "android":
            res = set_android_location(lat, lng, udid)
            results.append(res)
        else:
            res = await set_ios_location(lat, lng, udid)
            results.append(res)

    # Return primary result
    success_count = sum(1 for r in results if r.get("success"))
    if success_count > 0:
        return {"success": True, "lat": lat, "lng": lng, "devices": results}
    else:
        return results[0] if results else {"success": False, "error": "Location simulation failed."}

async def clear_location() -> Dict[str, Any]:
    devices = await get_devices()
    cleared_count = 0

    # 1. Clear Android devices
    adb = get_adb_path()
    for d in devices:
        if d.get("platform") == "android":
            serial = d.get("udid")
            cmd_prefix = [adb]
            if serial:
                cmd_prefix.extend(["-s", serial])
            for provider in ["gps", "network"]:
                subprocess.run(cmd_prefix + ["shell", "cmd", "location", "providers", "remove-test-provider", provider], capture_output=True, timeout=1.0)
            subprocess.run(cmd_prefix + ["shell", "settings", "put", "secure", "mock_location", "0"], capture_output=True, timeout=1.0)
            cleared_count += 1

    # 2. Clear iOS devices
    for d in devices:
        if d.get("platform", "ios") == "ios":
            udid = d.get("udid")
            version_str = d.get("version", "16.0")
            is_modern_ios = parse_ios_version(version_str) >= 17.0

            if not is_modern_ios:
                try:
                    from pymobiledevice3.lockdown import create_using_usbmux
                    from pymobiledevice3.services.simulate_location import DtSimulateLocation

                    lockdown = await create_using_usbmux(serial=udid)
                    loc = DtSimulateLocation(lockdown)
                    await loc.clear()
                    cleared_count += 1
                    continue
                except Exception:
                    pass

            try:
                from pymobiledevice3.remote import native_tunnel
                from pymobiledevice3.services.dvt.instruments.dvt_provider import DvtProvider
                from pymobiledevice3.services.dvt.instruments.location_simulation import LocationSimulation

                rsd = await native_tunnel.establish_native_rsd(serial=udid)
                async with DvtProvider(rsd) as dvt:
                    async with LocationSimulation(dvt) as loc_service:
                        await loc_service.clear()
                        cleared_count += 1
            except Exception:
                pass

    return {"success": True, "cleared": True, "devices_cleared": cleared_count}

async def enable_dev_mode(udid: str = None) -> Dict[str, Any]:
    try:
        from pymobiledevice3.lockdown import create_using_usbmux
        from pymobiledevice3.services.amfi import AmfiService
        from pymobiledevice3.exceptions import DeviceHasPasscodeSetError

        lockdown = await create_using_usbmux(serial=udid)

        # Check current status first
        try:
            status = await lockdown.get_developer_mode_status()
            if status:
                return {
                    "success": True,
                    "already_enabled": True,
                    "message": "Developer Mode is already active on this iPhone."
                }
        except Exception:
            pass

        amfi = AmfiService(lockdown)

        # 1. Reveal menu toggle in Settings > Privacy & Security
        try:
            await amfi.reveal_developer_mode_option_in_ui()
        except Exception:
            pass

        # 2. Request enable action from AMFI
        try:
            await amfi.enable_developer_mode(enable_post_restart=False)
            return {
                "success": True,
                "reboot_requested": True,
                "message": (
                    "Activation signal sent to iPhone! Your iPhone will now prompt to restart. "
                    "Tap Restart. After it powers on, unlock your screen, tap 'Turn On' on the prompt, and enter your passcode."
                )
            }
        except DeviceHasPasscodeSetError:
            # Device has a passcode set, which requires manual toggle confirmation in Settings
            return {
                "success": True,
                "passcode_required": True,
                "message": (
                    "Developer Mode toggle is now unlocked in Settings! "
                    "On your iPhone: open Settings > Privacy & Security > Developer Mode, toggle it ON, tap Restart, "
                    "and tap 'Turn On' after rebooting."
                )
            }
        except Exception as e:
            # Fallback - the menu has been revealed, provide clear next step
            return {
                "success": True,
                "manual_toggle": True,
                "message": (
                    f"Developer Mode menu revealed! On your iPhone: open Settings > Privacy & Security > Developer Mode, "
                    f"toggle it ON, tap Restart, and tap 'Turn On'."
                )
            }
    except Exception as e:
        return {"success": False, "error": f"Failed to activate Developer Mode: {e}"}

async def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No command provided. Use 'devices', 'set <lat> <lng>', 'clear', or 'enable_dev_mode'."}))
        return

    cmd = sys.argv[1]
    if cmd == "devices":
        res = await get_devices()
        print(json.dumps(res))
    elif cmd == "set":
        if len(sys.argv) < 4:
            print(json.dumps({"error": "Missing lat or lng"}))
            return
        lat = float(sys.argv[2])
        lng = float(sys.argv[3])
        res = await set_location(lat, lng)
        print(json.dumps(res))
    elif cmd == "clear":
        res = await clear_location()
        print(json.dumps(res))
    elif cmd == "enable_dev_mode":
        udid = sys.argv[2] if len(sys.argv) > 2 else None
        res = await enable_dev_mode(udid)
        print(json.dumps(res))
    else:
        print(json.dumps({"error": f"Unknown command: {cmd}"}))

if __name__ == "__main__":
    asyncio.run(main())
