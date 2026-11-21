import asyncio
import unittest
from unittest.mock import patch, MagicMock, AsyncMock
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from engine import controller

class TestDeveloperModeFlow(unittest.TestCase):
    def test_enable_dev_mode_when_already_enabled(self):
        mock_lockdown = MagicMock()
        mock_lockdown.get_developer_mode_status = AsyncMock(return_value=True)

        with patch("pymobiledevice3.lockdown.create_using_usbmux", AsyncMock(return_value=mock_lockdown)):
            res = asyncio.run(controller.enable_dev_mode("test-udid"))
            self.assertTrue(res.get("success"))
            self.assertTrue(res.get("already_enabled"))

    def test_enable_dev_mode_sends_amfi_signal(self):
        mock_lockdown = MagicMock()
        mock_lockdown.get_developer_mode_status = AsyncMock(return_value=False)

        mock_amfi = MagicMock()
        mock_amfi.reveal_developer_mode_option_in_ui = AsyncMock()
        mock_amfi.enable_developer_mode = AsyncMock()

        with patch("pymobiledevice3.lockdown.create_using_usbmux", AsyncMock(return_value=mock_lockdown)), \
             patch("pymobiledevice3.services.amfi.AmfiService", return_value=mock_amfi):

            res = asyncio.run(controller.enable_dev_mode("test-udid"))
            self.assertTrue(res.get("success"))
            self.assertTrue(res.get("reboot_requested"))
            mock_amfi.reveal_developer_mode_option_in_ui.assert_called_once()
            mock_amfi.enable_developer_mode.assert_called_once_with(enable_post_restart=False)

    def test_enable_dev_mode_handles_passcode(self):
        from pymobiledevice3.exceptions import DeviceHasPasscodeSetError

        mock_lockdown = MagicMock()
        mock_lockdown.get_developer_mode_status = AsyncMock(return_value=False)

        mock_amfi = MagicMock()
        mock_amfi.reveal_developer_mode_option_in_ui = AsyncMock()
        mock_amfi.enable_developer_mode = AsyncMock(side_effect=DeviceHasPasscodeSetError())

        with patch("pymobiledevice3.lockdown.create_using_usbmux", AsyncMock(return_value=mock_lockdown)), \
             patch("pymobiledevice3.services.amfi.AmfiService", return_value=mock_amfi):

            res = asyncio.run(controller.enable_dev_mode("test-udid"))
            self.assertTrue(res.get("success"))
            self.assertTrue(res.get("passcode_required"))

if __name__ == "__main__":
    unittest.main()
