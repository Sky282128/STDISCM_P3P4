// consumer/src/consumer_config.h
#pragma once

#include <cstddef>
#include <string>

struct ConsumerConfig {
    int consumerCount = 2;
    std::size_t queueCapacity = 10;

    static bool parse(int argc, char** argv, ConsumerConfig& out, std::string& error);
    static std::string usage();
};