import asyncio
import unittest
from unittest.mock import patch, MagicMock, AsyncMock, call
import sys
import os

# Add repo root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from engine import controller

class TestLocationSimulationRepro(unittest.TestCase):
    """
    Feedback loop asserting the exact bug symptoms:
    1. iOS 17+ devices wasting time on legacy DtSimulateLocation that fails/hangs.
    2. Single-packet injection on iOS closing before locationd accepts the new fix.
    3. Android single-packet injection racing provider activation without settling time or accuracy.
    """

    def test_ios_17_plus_skips_legacy_dt_simulate(self):
        """
        On iOS 17+, legacy DtSimulateLocation does not exist.
        Attempting it causes handshake stall / InvalidServiceError before falling back.
        The controller must bypass DtSimulateLocation directly on iOS >= 17.
        """
        mock_lockdown = MagicMock()
        mock_lockdown.short_info = {"ProductVersion": "17.5"}
        mock_lockdown.serial = "test-udid-17"
        mock_lockdown.get_developer_mode_status = AsyncMock(return_value=True)

        mock_loc_service = AsyncMock()
        mock_dvt_cm = MagicMock()
        mock_dvt_cm.__aenter__ = AsyncMock(return_value=MagicMock())
        mock_dvt_cm.__aexit__ = AsyncMock(return_value=None)
        
        mock_loc_cm = MagicMock()
        mock_loc_cm.__aenter__ = AsyncMock(return_value=mock_loc_service)
        mock_loc_cm.__aexit__ = AsyncMock(return_value=None)

        with patch("pymobiledevice3.lockdown.create_using_usbmux", AsyncMock(return_value=mock_lockdown)), \
             patch("pymobiledevice3.services.simulate_location.DtSimulateLocation") as mock_dt, \
             patch("pymobiledevice3.remote.native_tunnel.establish_native_rsd", AsyncMock(return_value=MagicMock())), \
             patch("pymobiledevice3.services.dvt.instruments.dvt_provider.DvtProvider", return_value=mock_dvt_cm), \
             patch("pymobiledevice3.services.dvt.instruments.location_simulation.LocationSimulation", return_value=mock_loc_cm):

            res = asyncio.run(controller.set_ios_location(37.7749, -122.4194, "test-udid-17"))
            
            self.assertTrue(res.get("success"), f"Expected success but got: {res}")
            # MUST NOT call legacy DtSimulateLocation on iOS 17+
            self.assertEqual(mock_dt.call_count, 0, "DtSimulateLocation should not be called on iOS 17+")

    def test_ios_sends_burst_pulses_for_locationd_acceptance(self):
        """
        Apple locationd filters single-packet sudden jumps as transient noise.
        The simulation must send at least 2 pulses to guarantee immediate acceptance on first press.
        """
        mock_lockdown = MagicMock()
        mock_lockdown.short_info = {"ProductVersion": "17.5"}
        mock_lockdown.serial = "test-udid-17"
        mock_lockdown.get_developer_mode_status = AsyncMock(return_value=True)

        mock_loc_service = AsyncMock()
        mock_dvt_cm = MagicMock()
        mock_dvt_cm.__aenter__ = AsyncMock(return_value=MagicMock())
        mock_dvt_cm.__aexit__ = AsyncMock(return_value=None)
        
        mock_loc_cm = MagicMock()
        mock_loc_cm.__aenter__ = AsyncMock(return_value=mock_loc_service)
        mock_loc_cm.__aexit__ = AsyncMock(return_value=None)

        with patch("pymobiledevice3.lockdown.create_using_usbmux", AsyncMock(return_value=mock_lockdown)), \
             patch("pymobiledevice3.remote.native_tunnel.establish_native_rsd", AsyncMock(return_value=MagicMock())), \
             patch("pymobiledevice3.services.dvt.instruments.dvt_provider.DvtProvider", return_value=mock_dvt_cm), \
             patch("pymobiledevice3.services.dvt.instruments.location_simulation.LocationSimulation", return_value=mock_loc_cm):

            res = asyncio.run(controller.set_ios_location(37.7749, -122.4194, "test-udid-17"))
            
            self.assertTrue(res.get("success"), f"Expected success but got: {res}")
            # Must send at least 2 consecutive pulses so locationd confirms the fix on the first click
            self.assertGreaterEqual(mock_loc_service.set.call_count, 2, "Expected at least 2 location pulses on iOS")

    def test_android_sends_burst_pulses_with_settling_delay(self):
        """
        On Android, add-test-provider and set-test-provider-enabled are asynchronous.
        The simulation must pulse the location at least twice so apps don't miss the first packet.
        """
        executed_cmds = []

        def fake_run(cmd, *args, **kwargs):
            executed_cmds.append(" ".join(cmd))
            ret = MagicMock()
            ret.returncode = 0
            ret.stdout = b""
            ret.stderr = b""
            return ret

        with patch("subprocess.run", side_effect=fake_run):
            res = controller.set_android_location(37.7749, -122.4194, "test-serial-android")
            self.assertTrue(res.get("success"), f"Expected success but got: {res}")

            location_set_cmds = [c for c in executed_cmds if "set-test-provider-location" in c]
            # Must send at least 2 location pulses for each provider (gps and network)
            # 2 providers * at least 2 pulses = at least 4 location set commands
            self.assertGreaterEqual(len(location_set_cmds), 4, f"Expected at least 4 set-test-provider-location calls, got: {len(location_set_cmds)}")

if __name__ == "__main__":
    unittest.main()
