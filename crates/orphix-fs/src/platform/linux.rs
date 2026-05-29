use std::fs::DirEntry;

pub fn should_skip_entry(_entry: &DirEntry, name: &str) -> bool {
    name.starts_with('.') && name != ".gitignore"
}
