// producer/src/main.cpp
#include <iostream>
#include <string>

#include "config.h"
#include "logger.h"
#include "producer_manager.h"

int main(int argc, char** argv) {
    Config config;
    std::string error;

    if (!Config::parse(argc, argv, config, error)) {
        if (error == "help") {
            std::cout << Config::usage();
            return 0;
        }
        Logger::error(error);
        std::cerr << Config::usage();
        return 2;
    }

    ProducerManager manager(config);
    return manager.run();
}