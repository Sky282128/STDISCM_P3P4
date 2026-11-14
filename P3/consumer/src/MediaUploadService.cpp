#include "MediaUploadService.h"

#include <atomic>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>
#include <memory>
#include <system_error>
#include <utility>

using grpc::Server;
using grpc::ServerBuilder;
using grpc::ServerContext;
using grpc::ServerReader;
using grpc::Status;
using grpc::StatusCode;

using mediaupload::MediaUpload;
using mediaupload::UploadRequest;
using mediaupload::UploadResponse;
using mediaupload::UploadStatus;

namespace fs = std::filesystem;

// server to hold the class
static std::unique_ptr<grpc::Server> server;
static std::atomic_uint64_t next_upload_id{1};

MediaUploadServiceImpl::MediaUploadServiceImpl(UploadQueue<UploadJob>& uploadQueue)
    : uploadQueue_(uploadQueue) {}

Status MediaUploadServiceImpl::Upload(ServerContext *context,
                                      ServerReader<UploadRequest> *reader,
                                      UploadResponse *response)
{
    UploadRequest request;
    bool is_first_message = true;
    std::ofstream outfile;
    std::string filename;
    uint32_t producer_id = 0;
    uint64_t expected_size = 0;
    uint64_t bytes_received = 0;
    std::string temporary_path;

    // Read messages from the client stream
    while (reader->Read(&request))
    {
        if (is_first_message)
        {
            if (!request.has_info())
            {
                response->set_status(mediaupload::UPLOAD_STATUS_ERROR);
                response->set_message("Expected FileInfo in the first message.");
                return Status(StatusCode::INVALID_ARGUMENT, "Missing FileInfo");
            }

            filename = request.info().filename();
            producer_id = request.info().producer_id();
            expected_size = request.info().file_size();

            const std::string safe_filename = fs::path(filename).filename().string();
            if (safe_filename.empty()) {
                response->set_status(mediaupload::UPLOAD_STATUS_ERROR);
                response->set_message("Filename cannot be empty.");
                return Status(StatusCode::INVALID_ARGUMENT, "Invalid filename");
            }
            filename = safe_filename;

            std::cout << "[Server] Receiving file: " << filename
                      << " from Producer ID: " << producer_id
                      << " (" << expected_size << " bytes)\n";

            std::error_code directory_error;
            fs::create_directories("upload_tmp", directory_error);
            if (directory_error) {
                response->set_status(mediaupload::UPLOAD_STATUS_ERROR);
                response->set_message("Failed to create temporary upload directory.");
                return Status(StatusCode::INTERNAL, "Temporary directory error");
            }

            temporary_path =
                (fs::path("upload_tmp") /
                 ("upload_" + std::to_string(next_upload_id.fetch_add(1)) + "_" + filename))
                    .string();

            outfile.open(temporary_path, std::ios::binary);
            if (!outfile.is_open())
            {
                response->set_status(mediaupload::UPLOAD_STATUS_ERROR);
                response->set_message("Failed to open temporary upload file.");
                return Status(StatusCode::INTERNAL, "Temporary file I/O error");
            }

            is_first_message = false;
        }
        else
        {
            if (!request.has_chunk())
            {
                response->set_status(mediaupload::UPLOAD_STATUS_ERROR);
                response->set_message("Expected chunk payload.");
                return Status(StatusCode::INVALID_ARGUMENT, "Missing chunk payload");
            }

            const std::string &chunk_data = request.chunk();
            outfile.write(chunk_data.data(), chunk_data.size());
            bytes_received += chunk_data.size();
        }
    }

    if (outfile.is_open())
    {
        outfile.close();
    }

    if (is_first_message)
    {
        response->set_status(mediaupload::UPLOAD_STATUS_ERROR);
        response->set_message("Stream ended prematurely.");
        return Status(StatusCode::INVALID_ARGUMENT, "Empty stream");
    }

    if (bytes_received != expected_size) {
        std::error_code remove_error;
        fs::remove(temporary_path, remove_error);
        response->set_status(mediaupload::UPLOAD_STATUS_ERROR);
        response->set_message("Received file size does not match the declared size.");
        return Status(StatusCode::INVALID_ARGUMENT, "Incomplete upload");
    }

    std::cout << "[Server] Finished receiving " << filename
              << ". Bytes received: " << bytes_received << "\n";

    UploadJob job;
    job.temporaryPath = temporary_path;
    job.filename = filename;
    job.producerId = producer_id;

    if (!uploadQueue_.tryPush(std::move(job))) {
        std::error_code remove_error;
        fs::remove(temporary_path, remove_error);
        response->set_status(mediaupload::UPLOAD_STATUS_DROPPED_QUEUE_FULL);
        response->set_message("Upload queue is full.");
        return Status::OK;
    }

    response->set_status(mediaupload::UPLOAD_STATUS_ACCEPTED);
    response->set_message("Upload queued successfully.");
    return Status::OK;
}

void runServer(UploadQueue<UploadJob>& uploadQueue)
{
    std::string server_address("0.0.0.0:50051");
    MediaUploadServiceImpl service(uploadQueue);

    ServerBuilder builder;
    builder.AddListeningPort(server_address, grpc::InsecureServerCredentials());
    builder.RegisterService(&service);

    server = builder.BuildAndStart();
    if (server)
    {
        std::cout << "Server listening on " << server_address << "\n";
        server->Wait();
    }
    else
    {
        std::cerr << "Failed to start gRPC server on " << server_address << ". Port may be in use.\n";
    }
    server->Wait();
}

void stopServer()
{
    if (server)
    {
        server->Shutdown();
    }
}