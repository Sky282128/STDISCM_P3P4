// producer/src/producer_manager.cpp
#include "producer_manager.h"

#include <filesystem>
#include <iomanip>
#include <memory>
#include <sstream>
#include <string>
#include <thread>
#include <vector>

#include "logger.h"
#include "upload_client.h"

namespace fs = std::filesystem;

namespace {

std::string formatMegabytes(std::uint64_t bytes) {
    std::ostringstream out;
    out << std::fixed << std::setprecision(2)
        << static_cast<double>(bytes) / (1024.0 * 1024.0) << " MB";
    return out.str();
}

}

ProducerManager::ProducerManager(const Config& config) : config_(config) {}

int ProducerManager::run() {
    Logger::info("Connecting to consumer at " + config_.consumerAddress);
    Logger::info("Starting " + std::to_string(config_.producerCount) + " producer thread(s)");

    UploadClient client(config_.consumerAddress, config_.chunkSizeBytes);

    std::vector<std::unique_ptr<ProducerWorker>> workers;
    workers.reserve(static_cast<std::size_t>(config_.producerCount));

    for (int i = 1; i <= config_.producerCount; ++i) {
        std::string folder =
            (fs::path(config_.videoRootDir) / ("producer_" + std::to_string(i))).string();
        workers.push_back(std::make_unique<ProducerWorker>(
            static_cast<std::uint32_t>(i), folder, client));
    }

    std::vector<std::thread> threads;
    threads.reserve(workers.size());

    for (const std::unique_ptr<ProducerWorker>& worker : workers) {
        ProducerWorker* raw = worker.get();
        threads.emplace_back([raw]() { raw->run(); });
    }

    for (std::thread& thread : threads) {
        thread.join();
    }

    results_.clear();
    for (const std::unique_ptr<ProducerWorker>& worker : workers) {
        results_.push_back(worker->stats());
    }

    printSummary();

    for (const WorkerStats& stats : results_) {
        if (stats.failed > 0) {
            return 1;
        }
    }
    return 0;
}

void ProducerManager::printSummary() const {
    WorkerStats total;

    Logger::info("---------------- Summary ----------------");

    for (const WorkerStats& stats : results_) {
        Logger::info("Producer " + std::to_string(stats.producerId) +
                     ": found=" + std::to_string(stats.filesFound) +
                     " accepted=" + std::to_string(stats.accepted) +
                     " dropped=" + std::to_string(stats.dropped) +
                     " duplicates=" + std::to_string(stats.duplicates) +
                     " failed=" + std::to_string(stats.failed) +
                     " sent=" + formatMegabytes(stats.bytesSent));

        total.filesFound += stats.filesFound;
        total.accepted += stats.accepted;
        total.dropped += stats.dropped;
        total.duplicates += stats.duplicates;
        total.failed += stats.failed;
        total.bytesSent += stats.bytesSent;
    }

    Logger::info("Total: found=" + std::to_string(total.filesFound) +
                 " accepted=" + std::to_string(total.accepted) +
                 " dropped=" + std::to_string(total.dropped) +
                 " duplicates=" + std::to_string(total.duplicates) +
                 " failed=" + std::to_string(total.failed) +
                 " sent=" + formatMegabytes(total.bytesSent));
}