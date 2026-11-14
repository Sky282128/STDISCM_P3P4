#pragma once

#include <cstdint>
#include <string>

struct UploadJob {
    std::string temporaryPath;
    std::string filename;
    std::uint32_t producerId = 0;
};
