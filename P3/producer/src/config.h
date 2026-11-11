// producer/src/config.h
#pragma once

#include <cstddef>
#include <string>

struct Config {
    int producerCount = 1;
    std::string consumerAddress = "localhost:50051";
    std::string videoRootDir = "videos";
    std::size_t chunkSizeBytes = 1024 * 1024;

    static bool parse(int argc, char** argv, Config& out, std::string& error);
    static std::string usage();
};