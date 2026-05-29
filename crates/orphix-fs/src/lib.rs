use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

mod platform;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub mtime: f64,
}

/// List directory contents (one level, no recursion)
pub fn list_dir(path: &str) -> Result<Vec<FileEntry>, String> {
    let dir = Path::new(path);
    if !dir.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }

    let entries = fs::read_dir(dir).map_err(|e| format!("Failed to read dir: {}", e))?;
    let mut result: Vec<FileEntry> = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let file_name = entry.file_name().to_string_lossy().to_string();

        if platform::should_skip_entry(&entry, &file_name) {
            continue;
        }

        let metadata = entry
            .metadata()
            .map_err(|e| format!("Failed to stat: {}", e))?;
        let mtime = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs_f64())
            .unwrap_or(0.0);

        result.push(FileEntry {
            name: file_name,
            path: entry.path().to_string_lossy().to_string(),
            is_dir: metadata.is_dir(),
            size: metadata.len(),
            mtime,
        });
    }

    // Sort: directories first, then alphabetical
    result.sort_by(|a, b| {
        if a.is_dir != b.is_dir {
            return if a.is_dir {
                std::cmp::Ordering::Less
            } else {
                std::cmp::Ordering::Greater
            };
        }
        a.name.to_lowercase().cmp(&b.name.to_lowercase())
    });

    Ok(result)
}

/// Read file content as UTF-8
pub fn read_file(path: &str) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| format!("Failed to read file: {}", e))
}

/// Write file content
pub fn write_file(path: &str, content: &str) -> Result<(), String> {
    fs::write(path, content).map_err(|e| format!("Failed to write file: {}", e))
}

/// Create a file or directory
pub fn create(path: &str, is_dir: bool) -> Result<(), String> {
    if is_dir {
        fs::create_dir_all(path).map_err(|e| format!("Failed to create dir: {}", e))
    } else {
        fs::write(path, "").map_err(|e| format!("Failed to create file: {}", e))
    }
}

/// Rename a file or directory
pub fn rename(old_path: &str, new_path: &str) -> Result<(), String> {
    fs::rename(old_path, new_path).map_err(|e| format!("Failed to rename: {}", e))
}

/// Delete a file or directory (recursive)
pub fn delete(path: &str) -> Result<(), String> {
    let p = Path::new(path);
    if p.is_dir() {
        fs::remove_dir_all(path).map_err(|e| format!("Failed to delete dir: {}", e))
    } else {
        fs::remove_file(path).map_err(|e| format!("Failed to delete file: {}", e))
    }
}

/// Copy a file
pub fn copy(src: &str, dest: &str) -> Result<(), String> {
    fs::copy(src, dest).map_err(|e| format!("Failed to copy: {}", e))?;
    Ok(())
}

/// Move a file or directory
pub fn move_path(src: &str, dest: &str) -> Result<(), String> {
    fs::rename(src, dest).map_err(|e| format!("Failed to move: {}", e))
}

/// Get file/directory metadata
pub fn stat(path: &str) -> Result<FileEntry, String> {
    let p = Path::new(path);
    let metadata = fs::metadata(path).map_err(|e| format!("Failed to stat: {}", e))?;
    let mtime = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs_f64())
        .unwrap_or(0.0);

    Ok(FileEntry {
        name: p
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
        path: path.to_string(),
        is_dir: metadata.is_dir(),
        size: metadata.len(),
        mtime,
    })
}
