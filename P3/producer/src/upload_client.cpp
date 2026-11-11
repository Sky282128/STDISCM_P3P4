// producer/src/upload_client.cpp
#include "upload_client.h"

#include <filesystem>
#include <fstream>
#include <system_error>
#include <vector>

#include <grpcpp/grpcpp.h>

namespace fs = std::filesystem;

UploadClient::UploadClient(const std::string& address, std::size_t chunkSizeBytes)
    : stub_(mediaupload::MediaUpload::NewStub(
          grpc::CreateChannel(address, grpc::InsecureChannelCredentials()))),
      chunkSizeBytes_(chunkSizeBytes) {}

UploadResult UploadClient::upload(const std::string& filePath, std::uint32_t producerId) {
    UploadResult result;

    std::ifstream file(filePath, std::ios::binary);
    if (!file) {
        result.message = "Could not open file: " + filePath;
        return result;
    }

    std::error_code ec;
    std::uint64_t fileSize = fs::file_size(filePath, ec);
    if (ec) {
        result.message = "Could not read file size: " + filePath;
        return result;
    }

    grpc::ClientContext context;
    mediaupload::UploadResponse response;
    std::unique_ptr<grpc::ClientWriter<mediaupload::UploadRequest>> writer(
        stub_->Upload(&context, &response));

    mediaupload::UploadRequest infoRequest;
    mediaupload::FileInfo* info = infoRequest.mutable_info();
    info->set_filename(fs::path(filePath).filename().string());
    info->set_file_size(fileSize);
    info->set_producer_id(producerId);

    bool streamOk = writer->Write(infoRequest);

    std::vector<char> buffer(chunkSizeBytes_);
    while (streamOk && file) {
        file.read(buffer.data(), static_cast<std::streamsize>(buffer.size()));
        std::streamsize bytesRead = file.gcount();
        if (bytesRead <= 0) {
            break;
        }

        mediaupload::UploadRequest chunkRequest;
        chunkRequest.set_chunk(buffer.data(), static_cast<std::size_t>(bytesRead));
        streamOk = writer->Write(chunkRequest);
        if (streamOk) {
            result.bytesSent += static_cast<std::uint64_t>(bytesRead);
        }
    }

    writer->WritesDone();
    grpc::Status status = writer->Finish();

    if (!status.ok()) {
        result.message = "gRPC error: " + status.error_message();
        return result;
    }

    result.transportOk = true;
    result.status = response.status();
    result.message = response.message();
    return result;
}