// consumer/src/consumer_config.cpp
#include "consumer_config.h"

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

bool applyValue(ConsumerConfig& config, const std::string& name, const std::string& value, std::string& error) {
    long long number = 0;

    if (name == "--consumers") {
        if (!parsePositive(value, 256, number)) {
            error = "Invalid consumer thread count: " + value;
            return false;
        }
        config.consumerCount = static_cast<int>(number);
        return true;
    }

    if (name == "--queue") {
        if (!parsePositive(value, 100000, number)) {
            error = "Invalid queue length: " + value;
            return false;
        }
        config.queueCapacity = static_cast<std::size_t>(number);
        return true;
    }

    error = "Unknown argument: " + name;
    return false;
}

bool applyEnv(ConsumerConfig& config, const char* envName, const char* flagName, std::string& error) {
    const char* value = std::getenv(envName);
    if (value == nullptr) {
        return true;
    }
    return applyValue(config, flagName, value, error);
}

}

bool ConsumerConfig::parse(int argc, char** argv, ConsumerConfig& out, std::string& error) {
    ConsumerConfig result;

    if (!applyEnv(result, "CONSUMER_COUNT", "--consumers", error) ||
        !applyEnv(result, "QUEUE_CAPACITY", "--queue", error)) {
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

std::string ConsumerConfig::usage() {
    return
        "Usage: consumer [options]\n"
        "  --consumers <n>   Number of consumer worker threads (default 2)\n"
        "  --queue <n>       Maximum queue length, extra uploads are dropped (default 10)\n"
        "  --help            Show this message\n"
        "\n"
        "Environment variables used when a flag is not given:\n"
        "  CONSUMER_COUNT, QUEUE_CAPACITY\n";
}