// producer/src/producer_worker.h
#pragma once

#include <cstdint>
#include <string>

#include "upload_client.h"

struct WorkerStats {
    std::uint32_t producerId = 0;
    std::uint32_t filesFound = 0;
    std::uint32_t accepted = 0;
    std::uint32_t dropped = 0;
    std::uint32_t duplicates = 0;
    std::uint32_t failed = 0;
    std::uint64_t bytesSent = 0;
};

class ProducerWorker {
public:
    ProducerWorker(std::uint32_t producerId, std::string folderPath, UploadClient& client);

    void run();

    const WorkerStats& stats() const;

private:
    std::uint32_t producerId_;
    std::string folderPath_;
    UploadClient& client_;
    WorkerStats stats_;
};