// producer/src/logger.h
#pragma once

#include <string>

class Logger {
public:
    static void info(const std::string& message);
    static void error(const std::string& message);

private:
    static void write(const std::string& level, const std::string& message);
};