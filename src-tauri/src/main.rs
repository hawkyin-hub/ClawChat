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

#[tauri::command]
fn get_nicknames() -> Result<Value, String> {
    let home = std::env::var("HOME").map_err(|e| e.to_string())?;
    let config_path = Path::new(&home).join(".openclaw").join("openclaw.json");

    if !config_path.exists() {
        return Ok(json!({ "assistant": null, "user": null }));
    }

    let raw = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
    let config: Value = serde_json::from_str(&raw).map_err(|e| e.to_string())?;

    // Get workspace from agents.defaults.workspace
    let workspace = config
        .get("agents")
        .and_then(|a| a.get("defaults"))
        .and_then(|d| d.get("workspace"))
        .and_then(|w| w.as_str());

    let mut assistant_name: Option<String> = None;
    let mut user_name: Option<String> = None;

    if let Some(ws) = workspace {
        let ws_path = Path::new(ws);

        // Read IDENTITY.md for assistant name
        let identity_path = ws_path.join("IDENTITY.md");
        if identity_path.exists() {
            if let Ok(content) = fs::read_to_string(&identity_path) {
                // Parse IDENTITY.md - name can be on same line or next line
                // Pattern: "- **Name:**" followed by "_xxx_" on same or next line
                let lines: Vec<&str> = content.lines().collect();
                for (i, line) in lines.iter().enumerate() {
                    let line = line.trim();
                    if line.starts_with("- **Name:**") {
                        // Try same line first
                        if let Some(name) = line.split(':').nth(1) {
                            let name = name.trim().trim_matches(|c| c == '_' || c == '*');
                            if !name.is_empty() {
                                assistant_name = Some(name.to_string());
                                break;
                            }
                        }
                        // Try next line
                        if i + 1 < lines.len() {
                            let next_line = lines[i + 1].trim().trim_matches(|c| c == '_' || c == '*');
                            if !next_line.is_empty() {
                                assistant_name = Some(next_line.to_string());
                                break;
                            }
                        }
                    }
                }
            }
        }

        // Read USER.md for user name
        let user_path = ws_path.join("USER.md");
        if user_path.exists() {
            if let Ok(content) = fs::read_to_string(&user_path) {
                // Parse USER.md - name is on same line: "- **Name:**xxx"
                let lines: Vec<&str> = content.lines().collect();
                for (i, line) in lines.iter().enumerate() {
                    let line = line.trim();
                    if line.starts_with("- **Name:**") {
                        // Try same line first
                        if let Some(name) = line.split(':').nth(1) {
                            let name = name.trim().trim_matches(|c| c == '_' || c == '*');
                            if !name.is_empty() {
                                user_name = Some(name.to_string());
                                break;
                            }
                        }
                        // Try next line
                        if i + 1 < lines.len() {
                            let next_line = lines[i + 1].trim().trim_matches(|c| c == '_' || c == '*');
                            if !next_line.is_empty() {
                                user_name = Some(next_line.to_string());
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(json!({ "assistant": assistant_name, "user": user_name }))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![detect_gateway, get_current_model, get_model_menu, get_nicknames])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
