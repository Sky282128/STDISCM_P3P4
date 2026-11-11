# producer/Dockerfile
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    ninja-build \
    pkg-config \
    libgrpc++-dev \
    libprotobuf-dev \
    protobuf-compiler \
    protobuf-compiler-grpc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY proto ./proto
COPY producer/CMakeLists.txt ./producer/CMakeLists.txt
COPY producer/src ./producer/src

RUN cmake -S producer -B build -G Ninja -DCMAKE_BUILD_TYPE=Release \
    && cmake --build build

ENV VIDEO_ROOT_DIR=/videos

VOLUME /videos

ENTRYPOINT ["/app/build/producer"]