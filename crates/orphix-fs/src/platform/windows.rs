use std::fs::DirEntry;
use std::os::windows::fs::MetadataExt;

const FILE_ATTRIBUTE_HIDDEN: u32 = 0x2;

pub fn should_skip_entry(entry: &DirEntry, name: &str) -> bool {
    if name == ".gitignore" {
        return false;
    }

    name.starts_with('.')
        || entry
            .metadata()
            .map(|metadata| metadata.file_attributes() & FILE_ATTRIBUTE_HIDDEN != 0)
            .unwrap_or(false)
}
