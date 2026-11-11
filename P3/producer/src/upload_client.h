// producer/src/upload_client.h
#pragma once

#include <cstddef>
#include <cstdint>
#include <memory>
#include <string>

#include "upload.grpc.pb.h"

struct UploadResult {
    bool transportOk = false;
    mediaupload::UploadStatus status = mediaupload::UPLOAD_STATUS_UNSPECIFIED;
    std::string message;
    std::uint64_t bytesSent = 0;
};

class UploadClient {
public:
    UploadClient(const std::string& address, std::size_t chunkSizeBytes);

    UploadResult upload(const std::string& filePath, std::uint32_t producerId);

private:
    std::unique_ptr<mediaupload::MediaUpload::Stub> stub_;
    std::size_t chunkSizeBytes_;
};