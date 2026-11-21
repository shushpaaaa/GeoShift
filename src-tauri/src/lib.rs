use std::process::Command;
use std::path::PathBuf;

fn get_python_path() -> PathBuf {
    let local_venv = PathBuf::from("./.venv/bin/python");
    if local_venv.exists() {
        return local_venv;
    }
    
    let abs_venv = PathBuf::from("/Users/oljashuseynzade/Desktop/tet/.venv/bin/python");
    if abs_venv.exists() {
        return abs_venv;
    }

    PathBuf::from("python3")
}

fn get_controller_path() -> PathBuf {
    let local_script = PathBuf::from("./engine/controller.py");
    if local_script.exists() {
        return local_script;
    }
    PathBuf::from("/Users/oljashuseynzade/Desktop/tet/engine/controller.py")
}

#[tauri::command]
fn get_devices() -> Result<String, String> {
    let python = get_python_path();
    let controller = get_controller_path();

    let output = Command::new(&python)
        .arg(&controller)
        .arg("devices")
        .output()
        .map_err(|e| format!("Failed to execute python controller: {}", e))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Controller failed: {}", err));
    }

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    Ok(stdout)
}

#[tauri::command]
fn set_location(lat: f64, lng: f64) -> Result<String, String> {
    let python = get_python_path();
    let controller = get_controller_path();

    let output = Command::new(&python)
        .arg(&controller)
        .arg("set")
        .arg(lat.to_string())
        .arg(lng.to_string())
        .output()
        .map_err(|e| format!("Failed to execute python controller: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    Ok(stdout)
}

#[tauri::command]
fn clear_location() -> Result<String, String> {
    let python = get_python_path();
    let controller = get_controller_path();

    let output = Command::new(&python)
        .arg(&controller)
        .arg("clear")
        .output()
        .map_err(|e| format!("Failed to execute python controller: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    Ok(stdout)
}

#[tauri::command]
fn enable_developer_mode(udid: Option<String>) -> Result<String, String> {
    let python = get_python_path();
    let controller = get_controller_path();

    let mut cmd = Command::new(&python);
    cmd.arg(&controller).arg("enable_dev_mode");
    if let Some(u) = udid {
        cmd.arg(u);
    }

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to execute python controller: {}", e))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Controller failed: {}", err));
    }

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    Ok(stdout)
}

#[tauri::command]
fn resolve_url(url: String) -> Result<String, String> {
    let output = Command::new("curl")
        .args([
            "-sIL",
            "-A",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
            "-o",
            "/dev/null",
            "-w",
            "%{url_effective}",
            &url,
        ])
        .output()
        .map_err(|e| format!("Failed to resolve URL: {}", e))?;

    let final_url = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if final_url.is_empty() {
        Ok(url)
    } else {
        Ok(final_url)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_devices,
            set_location,
            clear_location,
            enable_developer_mode,
            resolve_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
