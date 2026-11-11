// producer/src/producer_worker.cpp
#include "producer_worker.h"

#include <filesystem>
#include <string>
#include <utility>
#include <vector>

#include "folder_scanner.h"
#include "logger.h"

namespace fs = std::filesystem;

ProducerWorker::ProducerWorker(std::uint32_t producerId, std::string folderPath, UploadClient& client)
    : producerId_(producerId), folderPath_(std::move(folderPath)), client_(client) {
    stats_.producerId = producerId_;
}

const WorkerStats& ProducerWorker::stats() const {
    return stats_;
}

void ProducerWorker::run() {
    const std::string tag = "[Producer " + std::to_string(producerId_) + "] ";

    std::vector<std::string> videos = FolderScanner::scan(folderPath_);
    stats_.filesFound = static_cast<std::uint32_t>(videos.size());

    if (videos.empty()) {
        Logger::error(tag + "No videos found in " + folderPath_);
        return;
    }

    Logger::info(tag + "Found " + std::to_string(videos.size()) + " video(s) in " + folderPath_);

    for (const std::string& path : videos) {
        const std::string name = fs::path(path).filename().string();
        Logger::info(tag + "Uploading " + name);

        UploadResult result = client_.upload(path, producerId_);
        stats_.bytesSent += result.bytesSent;

        if (!result.transportOk) {
            ++stats_.failed;
            Logger::error(tag + "Failed to upload " + name + ": " + result.message);
            continue;
        }

        switch (result.status) {
            case mediaupload::UPLOAD_STATUS_ACCEPTED:
                ++stats_.accepted;
                Logger::info(tag + "Accepted " + name);
                break;
            case mediaupload::UPLOAD_STATUS_DROPPED_QUEUE_FULL:
                ++stats_.dropped;
                Logger::info(tag + "Dropped (queue full) " + name);
                break;
            case mediaupload::UPLOAD_STATUS_DUPLICATE:
                ++stats_.duplicates;
                Logger::info(tag + "Duplicate " + name);
                break;
            default:
                ++stats_.failed;
                Logger::error(tag + "Consumer error for " + name + ": " + result.message);
                break;
        }
    }

    Logger::info(tag + "Done");
}