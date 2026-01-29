use serde_json::{Map, Value};
use std::fs;
use std::path::PathBuf;

fn get_config_path() -> Result<PathBuf, Box<dyn std::error::Error>> {
    let mut path = dirs::config_dir().ok_or("Could not find config directory")?;
    path.push("Chottu");
    fs::create_dir_all(&path)?;
    path.push("config.json");
    Ok(path)
}

pub fn save_setting(key: &str, value: &str) -> Result<(), Box<dyn std::error::Error>> {
    let config_path = get_config_path()?;
    
    let mut config: Map<String, Value> = if config_path.exists() {
        let content = fs::read_to_string(&config_path)?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Map::new()
    };
    
    config.insert(key.to_string(), Value::String(value.to_string()));
    
    let json = serde_json::to_string_pretty(&config)?;
    fs::write(config_path, json)?;
    
    Ok(())
}

pub fn load_setting(key: &str) -> Result<String, Box<dyn std::error::Error>> {
    let config_path = get_config_path()?;
    
    if !config_path.exists() {
        return Err("Config file not found".into());
    }
    
    let content = fs::read_to_string(config_path)?;
    let config: Map<String, Value> = serde_json::from_str(&content)?;
    
    config
        .get(key)
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| format!("Setting '{}' not found", key).into())
}