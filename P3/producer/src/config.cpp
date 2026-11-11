// producer/src/config.cpp
#include "config.h"

#include <cstdlib>
#include <exception>

namespace {

bool parsePositive(const std::string& text, long long maxValue, long long& value) {
    try {
        std::size_t consumed = 0;
        long long parsed = std::stoll(text, &consumed);
        if (consumed != text.size() || parsed <= 0 || parsed > maxValue) {
            return false;
        }
        value = parsed;
        return true;
    } catch (const std::exception&) {
        return false;
    }
}

bool applyValue(Config& config, const std::string& name, const std::string& value, std::string& error) {
    long long number = 0;

    if (name == "--producers") {
        if (!parsePositive(value, 1024, number)) {
            error = "Invalid producer count: " + value;
            return false;
        }
        config.producerCount = static_cast<int>(number);
        return true;
    }

    if (name == "--address") {
        if (value.empty()) {
            error = "Consumer address cannot be empty";
            return false;
        }
        config.consumerAddress = value;
        return true;
    }

    if (name == "--videos") {
        if (value.empty()) {
            error = "Video directory cannot be empty";
            return false;
        }
        config.videoRootDir = value;
        return true;
    }

    if (name == "--chunk-size") {
        if (!parsePositive(value, 64LL * 1024 * 1024, number)) {
            error = "Invalid chunk size: " + value;
            return false;
        }
        config.chunkSizeBytes = static_cast<std::size_t>(number);
        return true;
    }

    error = "Unknown argument: " + name;
    return false;
}

bool applyEnv(Config& config, const char* envName, const char* flagName, std::string& error) {
    const char* value = std::getenv(envName);
    if (value == nullptr) {
        return true;
    }
    return applyValue(config, flagName, value, error);
}

}

bool Config::parse(int argc, char** argv, Config& out, std::string& error) {
    Config result;

    if (!applyEnv(result, "PRODUCER_COUNT", "--producers", error) ||
        !applyEnv(result, "CONSUMER_ADDRESS", "--address", error) ||
        !applyEnv(result, "VIDEO_ROOT_DIR", "--videos", error) ||
        !applyEnv(result, "CHUNK_SIZE", "--chunk-size", error)) {
        return false;
    }

    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];

        if (arg == "--help" || arg == "-h") {
            error = "help";
            return false;
        }

        if (i + 1 >= argc) {
            error = "Missing value for " + arg;
            return false;
        }

        std::string value = argv[++i];
        if (!applyValue(result, arg, value, error)) {
            return false;
        }
    }

    out = result;
    return true;
}

std::string Config::usage() {
    return
        "Usage: producer [options]\n"
        "  --producers <n>     Number of producer threads (default 1)\n"
        "  --address <h:p>     Consumer gRPC address (default localhost:50051)\n"
        "  --videos <dir>      Root folder containing producer_1, producer_2, ... (default videos)\n"
        "  --chunk-size <b>    Bytes per gRPC chunk (default 1048576)\n"
        "  --help              Show this message\n"
        "\n"
        "Environment variables used when a flag is not given:\n"
        "  PRODUCER_COUNT, CONSUMER_ADDRESS, VIDEO_ROOT_DIR, CHUNK_SIZE\n";
}