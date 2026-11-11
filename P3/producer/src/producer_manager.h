// producer/src/producer_manager.h
#pragma once

#include <vector>

#include "config.h"
#include "producer_worker.h"

class ProducerManager {
public:
    explicit ProducerManager(const Config& config);

    int run();

private:
    void printSummary() const;

    Config config_;
    std::vector<WorkerStats> results_;
};