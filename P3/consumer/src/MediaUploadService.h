#pragma once

#include <grpcpp/grpcpp.h>

#include "upload.grpc.pb.h"
#include "UploadJob.h"
#include "UploadQueue.h"

class MediaUploadServiceImpl final : public mediaupload::MediaUpload::Service {
public:
    explicit MediaUploadServiceImpl(UploadQueue<UploadJob>& uploadQueue);

    grpc::Status Upload(grpc::ServerContext* context, 
                        grpc::ServerReader<mediaupload::UploadRequest>* reader, 
                        mediaupload::UploadResponse* response) override;

private:
    UploadQueue<UploadJob>& uploadQueue_;
};

void runServer(UploadQueue<UploadJob>& uploadQueue);
void stopServer();