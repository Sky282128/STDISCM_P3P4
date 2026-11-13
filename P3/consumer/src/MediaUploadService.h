#pragma once

#include <grpcpp/grpcpp.h>
#include "upload.grpc.pb.h"

class MediaUploadServiceImpl final : public mediaupload::MediaUpload::Service {
public:
    grpc::Status Upload(grpc::ServerContext* context, 
                        grpc::ServerReader<mediaupload::UploadRequest>* reader, 
                        mediaupload::UploadResponse* response) override;
};

void runServer();
void stopServer();