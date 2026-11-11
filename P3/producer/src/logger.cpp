// producer/src/logger.cpp
#include "logger.h"

#include <chrono>
#include <ctime>
#include <iomanip>
#include <iostream>
#include <mutex>
#include <sstream>
#include <thread>

namespace {
std::mutex g_logMutex;
}

void Logger::info(const std::string& message) {
    write("INFO", message);
}

void Logger::error(const std::string& message) {
    write("ERROR", message);
}

void Logger::write(const std::string& level, const std::string& message) {
    auto now = std::chrono::system_clock::now();
    std::time_t timeNow = std::chrono::system_clock::to_time_t(now);
    std::tm localTime{};
#ifdef _WIN32
    localtime_s(&localTime, &timeNow);
#else
    localtime_r(&timeNow, &localTime);
#endif

    std::ostringstream line;
    line << "[" << std::put_time(&localTime, "%H:%M:%S") << "]"
         << "[" << level << "]"
         << "[T" << std::this_thread::get_id() << "] "
         << message << "\n";

    std::lock_guard<std::mutex> lock(g_logMutex);
    if (level == "ERROR") {
        std::cerr << line.str() << std::flush;
    } else {
        std::cout << line.str() << std::flush;
    }
}