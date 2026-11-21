Unicode false
Name "GeoShift"
OutFile "../dist/GeoShift-Setup-1.0.0.exe"
InstallDir "$LOCALAPPDATA\Programs\GeoShift"
InstallDirRegKey HKCU "Software\GeoShift" "Install_Dir"
RequestExecutionLevel user

SetCompressor /SOLID lzma

!include "MUI2.nsh"
!include "FileFunc.nsh"

; Branding and Icons
!define MUI_ICON "icons/icon.ico"
!define MUI_UNICON "icons/icon.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "installer-header.bmp"
!define MUI_WELCOMEFINISHPAGE_BITMAP "installer-sidebar.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "installer-sidebar.bmp"

!define MUI_ABORTWARNING

; Welcome Page
!insertmacro MUI_PAGE_WELCOME

; Directory Selection Page
!insertmacro MUI_PAGE_DIRECTORY

; Installation Page
!insertmacro MUI_PAGE_INSTFILES

; Finish Page with Run Checkbox
!define MUI_FINISHPAGE_RUN "$INSTDIR\GeoShift.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Launch GeoShift"
!insertmacro MUI_PAGE_FINISH

; Uninstaller Pages
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

Section "GeoShift Application" SecMain
    SetOutPath "$INSTDIR"
    File /oname=GeoShift.exe "target/x86_64-pc-windows-gnu/release/tauri-app.exe"
    File "target/x86_64-pc-windows-gnu/release/WebView2Loader.dll"
    File "icons/icon.ico"

    ; Create Shortcuts
    CreateDirectory "$SMPROGRAMS\GeoShift"
    CreateShortcut "$SMPROGRAMS\GeoShift\GeoShift.lnk" "$INSTDIR\GeoShift.exe" "" "$INSTDIR\icon.ico" 0
    CreateShortcut "$SMPROGRAMS\GeoShift\Uninstall GeoShift.lnk" "$INSTDIR\Uninstall.exe"
    CreateShortcut "$DESKTOP\GeoShift.lnk" "$INSTDIR\GeoShift.exe" "" "$INSTDIR\icon.ico" 0

    ; Write Registry Keys for Add/Remove Programs
    WriteRegStr HKCU "Software\GeoShift" "Install_Dir" "$INSTDIR"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\GeoShift" "DisplayName" "GeoShift"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\GeoShift" "UninstallString" '"$INSTDIR\Uninstall.exe"'
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\GeoShift" "DisplayIcon" '"$INSTDIR\icon.ico"'
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\GeoShift" "Publisher" "GeoShift"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\GeoShift" "DisplayVersion" "1.0.0"
    WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\GeoShift" "NoModify" 1
    WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\GeoShift" "NoRepair" 1

    ; Create Uninstaller
    WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd

Section "Uninstall"
    Delete "$INSTDIR\GeoShift.exe"
    Delete "$INSTDIR\WebView2Loader.dll"
    Delete "$INSTDIR\icon.ico"
    Delete "$INSTDIR\Uninstall.exe"
    RMDir "$INSTDIR"

    Delete "$SMPROGRAMS\GeoShift\GeoShift.lnk"
    Delete "$SMPROGRAMS\GeoShift\Uninstall GeoShift.lnk"
    RMDir "$SMPROGRAMS\GeoShift"
    Delete "$DESKTOP\GeoShift.lnk"

    DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\GeoShift"
    DeleteRegKey HKCU "Software\GeoShift"
SectionEnd
