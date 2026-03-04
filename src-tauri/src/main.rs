#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::{json, Value};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[tauri::command]
fn detect_gateway() -> Result<Value, String> {
    let home = std::env::var("HOME").map_err(|e| e.to_string())?;
    let config_path = Path::new(&home).join(".openclaw").join("openclaw.json");

    if !config_path.exists() {
        return Ok(json!({ "found": false }));
    }

    let raw = fs::read_to_string(config_path).map_err(|e| e.to_string())?;
    let config: Value = serde_json::from_str(&raw).map_err(|e| e.to_string())?;

    let gateway = config.get("gateway");
    let token = gateway
        .and_then(|g| g.get("auth"))
        .and_then(|a| a.get("token"))
        .and_then(|t| t.as_str());

    if let Some(token) = token {
        let port = gateway
            .and_then(|g| g.get("port"))
            .and_then(|p| p.as_u64())
            .unwrap_or(18789);
        let url = format!("ws://localhost:{}", port);
        Ok(json!({ "found": true, "url": url, "token": token }))
    } else {
        Ok(json!({ "found": false }))
    }
}

#[tauri::command]
fn get_current_model() -> Result<Value, String> {
    let home = std::env::var("HOME").map_err(|e| e.to_string())?;
    let config_path = Path::new(&home).join(".openclaw").join("openclaw.json");

    if !config_path.exists() {
        return Ok(json!({ "currentModel": null }));
    }

    let raw = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
    let config: Value = serde_json::from_str(&raw).map_err(|e| e.to_string())?;

    // Read from agents.list[].model.primary
    let agents = config.get("agents").and_then(|a| a.get("list"));
    let current_model = agents
        .and_then(|list| list.as_array())
        .and_then(|arr| arr.first())
        .and_then(|agent| agent.get("model"))
        .and_then(|model| model.get("primary"))
        .and_then(|primary| primary.as_str());

    Ok(json!({ "currentModel": current_model }))
}

#[tauri::command]
fn get_model_menu() -> Result<Value, String> {
    let home = std::env::var("HOME").map_err(|e| e.to_string())?;
    let config_path = Path::new(&home).join(".openclaw").join("openclaw.json");

    if !config_path.exists() {
        return Ok(json!({}));
    }

    let raw = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
    let config: Value = serde_json::from_str(&raw).map_err(|e| e.to_string())?;

    let mut menu_data: HashMap<String, Vec<String>> = HashMap::new();

    // 1. Extract explicit providers from config.models.providers
    if let Some(providers) = config.get("models").and_then(|m| m.get("providers")).and_then(|p| p.as_object()) {
        for (provider_id, provider_config) in providers {
            if let Some(models) = provider_config.get("models").and_then(|m| m.as_array()) {
                let model_ids: Vec<String> = models
                    .iter()
                    .filter_map(|m| m.get("id").and_then(|id| id.as_str()))
                    .map(|s| s.to_string())
                    .collect();
                if !model_ids.is_empty() {
                    menu_data.insert(provider_id.clone(), model_ids);
                }
            }
        }
    }

    // 2. Extract global referenced models from config.agents.defaults.models
    if let Some(defaults) = config.get("agents").and_then(|a| a.get("defaults")).and_then(|d| d.get("models")) {
        if let Some(models_obj) = defaults.as_object() {
            for full_id in models_obj.keys() {
                if full_id.contains('/') {
                    let parts: Vec<&str> = full_id.split('/').collect();
                    if parts.len() >= 2 {
                        let provider = parts[0];
                        let model_id = parts[1..].join("/");
                        let entry = menu_data.entry(provider.to_string()).or_insert_with(Vec::new);
                        if !entry.contains(&model_id) {
                            entry.push(model_id);
                        }
                    }
                }
            }
        }
    }

    // Sort providers and models
    let mut sorted: HashMap<String, Vec<String>> = HashMap::new();
    let mut keys: Vec<&String> = menu_data.keys().collect();
    keys.sort();
    for provider in keys {
        let mut models = menu_data[provider].clone();
        models.sort();
        sorted.insert(provider.clone(), models);
    }

    // Convert to JSON Value
    let result: Value = serde_json::to_value(&sorted).map_err(|e| e.to_string())?;
    Ok(result)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![detect_gateway, get_current_model, get_model_menu])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
