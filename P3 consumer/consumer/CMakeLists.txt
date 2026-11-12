# consumer/CMakeLists.txt
cmake_minimum_required(VERSION 3.16)
project(consumer LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

file(GLOB IMGUI_SOURCES 
    "vendor/imgui/*.cpp"
)

find_package(OpenGL REQUIRED)
find_package(glfw3 REQUIRED)

find_package(Threads REQUIRED)

find_package(Protobuf CONFIG QUIET)
if(NOT Protobuf_FOUND)
    find_package(Protobuf REQUIRED)
endif()

find_package(gRPC CONFIG QUIET)
if(gRPC_FOUND)
    set(GRPC_LIBS gRPC::grpc++)
    set(GRPC_PLUGIN $<TARGET_FILE:gRPC::grpc_cpp_plugin>)
else()
    find_package(PkgConfig REQUIRED)
    pkg_check_modules(GRPCPP REQUIRED IMPORTED_TARGET grpc++)
    find_program(GRPC_PLUGIN_PATH grpc_cpp_plugin REQUIRED)
    set(GRPC_LIBS PkgConfig::GRPCPP)
    set(GRPC_PLUGIN ${GRPC_PLUGIN_PATH})
endif()

set(PROTO_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../proto)
set(PROTO_FILE ${PROTO_DIR}/upload.proto)
set(GEN_DIR ${CMAKE_CURRENT_BINARY_DIR}/generated)
file(MAKE_DIRECTORY ${GEN_DIR})

set(PROTO_GEN_SRCS
    ${GEN_DIR}/upload.pb.cc
    ${GEN_DIR}/upload.grpc.pb.cc
)
set(PROTO_GEN_HDRS
    ${GEN_DIR}/upload.pb.h
    ${GEN_DIR}/upload.grpc.pb.h
)

add_custom_command(
    OUTPUT ${PROTO_GEN_SRCS} ${PROTO_GEN_HDRS}
    COMMAND $<TARGET_FILE:protobuf::protoc>
    ARGS --proto_path=${PROTO_DIR}
         --cpp_out=${GEN_DIR}
         --grpc_out=${GEN_DIR}
         --plugin=protoc-gen-grpc=${GRPC_PLUGIN}
         ${PROTO_FILE}
    DEPENDS ${PROTO_FILE}
    VERBATIM
)


file(GLOB CONSUMER_SRCS CONFIGURE_DEPENDS ${CMAKE_CURRENT_SOURCE_DIR}/src/*.cpp ${CMAKE_CURRENT_SOURCE_DIR}/src/windows/*.cpp)

add_executable(consumer ${CONSUMER_SRCS} ${PROTO_GEN_SRCS} ${IMGUI_SOURCES})

target_include_directories(consumer PRIVATE
    ${GEN_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${CMAKE_CURRENT_SOURCE_DIR}/src/windows
    vendor/imgui
)

target_link_libraries(consumer PRIVATE
    ${GRPC_LIBS}
    protobuf::libprotobuf
    Threads::Threads
    OpenGL::GL
    glfw
)