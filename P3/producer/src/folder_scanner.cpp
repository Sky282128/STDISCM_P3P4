// producer/src/folder_scanner.cpp
#include "folder_scanner.h"

#include <algorithm>
#include <cctype>
#include <filesystem>
#include <system_error>

namespace fs = std::filesystem;

namespace {

const char* const kVideoExtensions[] = {
    ".mp4", ".mkv", ".avi", ".mov", ".webm", ".flv",
    ".wmv", ".m4v", ".mpg", ".mpeg", ".ts", ".3gp"
};

std::string toLower(std::string text) {
    std::transform(text.begin(), text.end(), text.begin(),
                   [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
    return text;
}

}

bool FolderScanner::isVideoFile(const std::string& filePath) {
    std::string extension = toLower(fs::path(filePath).extension().string());
    for (const char* known : kVideoExtensions) {
        if (extension == known) {
            return true;
        }
    }
    return false;
}

std::vector<std::string> FolderScanner::scan(const std::string& folderPath) {
    std::vector<std::string> videos;
    std::error_code ec;

    if (!fs::is_directory(folderPath, ec) || ec) {
        return videos;
    }

    fs::directory_iterator it(folderPath, ec);
    if (ec) {
        return videos;
    }

    for (const fs::directory_entry& entry : it) {
        std::error_code entryEc;
        if (!entry.is_regular_file(entryEc) || entryEc) {
            continue;
        }
        std::string path = entry.path().string();
        if (isVideoFile(path)) {
            videos.push_back(path);
        }
    }

    std::sort(videos.begin(), videos.end());
    return videos;
}