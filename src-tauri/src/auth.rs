use keyring::Entry;
use serde_json::Value;
use std::collections::HashMap;

const SERVICE_NAME: &str = "Chottu-Desktop";
const TOKEN_KEY: &str = "device_token";

pub fn save_device_token(token: &str) -> Result<(), Box<dyn std::error::Error>> {
    let entry = Entry::new(SERVICE_NAME, TOKEN_KEY)?;
    entry.set_password(token)?;
    Ok(())
}

pub fn load_device_token() -> Result<String, Box<dyn std::error::Error>> {
    let entry = Entry::new(SERVICE_NAME, TOKEN_KEY)?;
    let token = entry.get_password()?;
    Ok(token)
}

pub async fn pair_device(
    server_url: &str,
    pair_code: &str,
    device_name: &str,
) -> Result<String, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    
    // Start pairing
    let start_response: Value = client
        .post(&format!("{}/pair/start", server_url))
        .send()
        .await?
        .json()
        .await?;
    
    let pair_id = start_response["pair_id"]
        .as_str()
        .ok_or("Invalid pair_id")?;
    
    // Confirm pairing
    let mut confirm_data = HashMap::new();
    confirm_data.insert("pair_id", pair_id);
    confirm_data.insert("code", pair_code);
    confirm_data.insert("device_name", device_name);
    
    let confirm_response: Value = client
        .post(&format!("{}/pair/confirm", server_url))
        .json(&confirm_data)
        .send()
        .await?
        .json()
        .await?;
    
    let token = confirm_response["device_token"]
        .as_str()
        .ok_or("Invalid device_token")?
        .to_string();
    
    // Save token securely
    save_device_token(&token)?;
    
    Ok(token)
}