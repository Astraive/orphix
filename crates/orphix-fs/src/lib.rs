use serde::{Deserialize, Serialize};
use std::fmt;
use std::fs;
use std::io;
use std::path::Path;

mod platform;

/// Errors that can occur during filesystem operations.
#[derive(Debug, Serialize)]
#[serde(tag = "type", content = "message")]
pub enum FsError {
    /// The target path is not a directory when one was expected.
    NotADirectory(String),
    /// An I/O error occurred.
    #[serde(serialize_with = "serialize_io_error")]
    Io(io::Error),
    /// The path contains invalid UTF-8.
    InvalidPath(String),
}

fn serialize_io_error<S: serde::Serializer>(error: &io::Error, serializer: S) -> Result<S::Ok, S::Error> {
    serializer.serialize_str(&error.to_string())
}

impl fmt::Display for FsError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            FsError::NotADirectory(path) => write!(f, "Not a directory: {}", path),
            FsError::Io(err) => write!(f, "I/O error: {}", err),
            FsError::InvalidPath(path) => write!(f, "Invalid path: {}", path),
        }
    }
}

impl std::error::Error for FsError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            FsError::Io(err) => Some(err),
            _ => None,
        }
    }
}

impl From<io::Error> for FsError {
    fn from(err: io::Error) -> Self {
        FsError::Io(err)
    }
}

impl From<FsError> for String {
    fn from(err: FsError) -> Self {
        err.to_string()
    }
}

/// Convenience alias for filesystem results.
pub type FsResult<T> = Result<T, FsError>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub mtime: f64,
}

fn file_mtime(metadata: &fs::Metadata) -> f64 {
    metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs_f64())
        .unwrap_or(0.0)
}

/// List directory contents (one level, no recursion).
pub fn list_dir(path: &str) -> FsResult<Vec<FileEntry>> {
    let dir = Path::new(path);
    if !dir.is_dir() {
        return Err(FsError::NotADirectory(path.to_string()));
    }

    let entries = fs::read_dir(dir)?;
    let mut result: Vec<FileEntry> = Vec::new();

    for entry in entries {
        let entry = entry?;
        let file_name = entry.file_name().to_string_lossy().to_string();

        if platform::should_skip_entry(&entry, &file_name) {
            continue;
        }

        let metadata = entry.metadata()?;
        result.push(FileEntry {
            name: file_name,
            path: entry.path().to_string_lossy().to_string(),
            is_dir: metadata.is_dir(),
            size: metadata.len(),
            mtime: file_mtime(&metadata),
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

/// Read file content as UTF-8.
pub fn read_file(path: &str) -> FsResult<String> {
    Ok(fs::read_to_string(path)?)
}

/// Write file content.
pub fn write_file(path: &str, content: &str) -> FsResult<()> {
    Ok(fs::write(path, content)?)
}

/// Create a file or directory.
pub fn create(path: &str, is_dir: bool) -> FsResult<()> {
    if is_dir {
        Ok(fs::create_dir_all(path)?)
    } else {
        Ok(fs::write(path, "")?)
    }
}

/// Rename a file or directory.
pub fn rename(old_path: &str, new_path: &str) -> FsResult<()> {
    Ok(fs::rename(old_path, new_path)?)
}

/// Delete a file or directory (recursive).
pub fn delete(path: &str) -> FsResult<()> {
    let p = Path::new(path);
    if p.is_dir() {
        Ok(fs::remove_dir_all(path)?)
    } else {
        Ok(fs::remove_file(path)?)
    }
}

/// Copy a file.
pub fn copy(src: &str, dest: &str) -> FsResult<()> {
    fs::copy(src, dest)?;
    Ok(())
}

/// Move a file or directory.
pub fn move_path(src: &str, dest: &str) -> FsResult<()> {
    Ok(fs::rename(src, dest)?)
}

/// Get file/directory metadata.
pub fn stat(path: &str) -> FsResult<FileEntry> {
    let p = Path::new(path);
    let metadata = fs::metadata(path)?;
    Ok(FileEntry {
        name: p
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
        path: path.to_string(),
        is_dir: metadata.is_dir(),
        size: metadata.len(),
        mtime: file_mtime(&metadata),
    })
}
