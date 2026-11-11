// producer/src/folder_scanner.h
#pragma once

#include <string>
#include <vector>

class FolderScanner {
public:
    static std::vector<std::string> scan(const std::string& folderPath);
    static bool isVideoFile(const std::string& filePath);
};