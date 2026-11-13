#include "MediaUploadService.h"

#include <iostream>
#include <fstream>
#include <string>
#include <memory>

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

// server to hold the class
static std::unique_ptr<grpc::Server> server;

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

            std::cout << "[Server] Receiving file: " << filename
                      << " from Producer ID: " << producer_id
                      << " (" << expected_size << " bytes)\n";

            std::string out_path = "producer_" + std::to_string(producer_id) + "_" + filename;

            outfile.open(out_path, std::ios::binary);
            if (!outfile.is_open())
            {
                response->set_status(mediaupload::UPLOAD_STATUS_ERROR);
                response->set_message("Failed to open file on server.");
                return Status(StatusCode::INTERNAL, "File I/O Error");
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

    std::cout << "[Server] Finished receiving " << filename
              << ". Bytes saved: " << bytes_received << "\n";

    response->set_status(mediaupload::UPLOAD_STATUS_ACCEPTED);
    response->set_message("File uploaded successfully.");
    return Status::OK;
}

void runServer()
{
    std::string server_address("0.0.0.0:50051");
    MediaUploadServiceImpl service;

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