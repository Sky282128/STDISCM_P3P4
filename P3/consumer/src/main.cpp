#include "imgui.h"
#include "imgui_impl_glfw.h"
#include "imgui_impl_opengl3.h"

#include "VideoGallery.h"
#include "MediaUploadService.h"
#include "consumer_config.h"

#include <GLFW/glfw3.h>
#include <cstdio>
#include <filesystem>
#include <functional>
#include <iostream>
#include <optional>
#include <thread>
#include <vector>

namespace {

namespace fs = std::filesystem;

void processUploads(UploadQueue<UploadJob>& uploadQueue) {
    std::error_code directoryError;
    fs::create_directories("uploads", directoryError);
    if (directoryError) {
        std::cerr << "[Worker] Failed to create uploads directory: "
                  << directoryError.message() << "\n";
        return;
    }

    while (true) {
        std::optional<UploadJob> job = uploadQueue.pop();
        if (!job.has_value()) {
            return;
        }

        const fs::path destination =
            fs::path("uploads") /
            ("producer_" + std::to_string(job->producerId) + "_" + job->filename);

        std::error_code moveError;
        fs::rename(job->temporaryPath, destination, moveError);
        if (moveError) {
            std::cerr << "[Worker] Failed to save " << job->filename << ": "
                      << moveError.message() << "\n";
        } else {
            std::cout << "[Worker] Saved " << destination.string() << "\n";
        }
    }
}

}

int main(int argc, char** argv)
{
    ConsumerConfig config;
    std::string error;
    if (!ConsumerConfig::parse(argc, argv, config, error)) {
        if (error == "help") {
            std::cout << ConsumerConfig::usage();
            return 0;
        }
        std::cerr << error << "\n" << ConsumerConfig::usage();
        return 2;
    }

    std::cout << "Consumers: " << config.consumerCount
              << ", queue capacity: " << config.queueCapacity << "\n";

    UploadQueue<UploadJob> uploadQueue(config.queueCapacity);
    const int consumerCount = config.consumerCount;
    std::vector<std::thread> consumerThreads;
    consumerThreads.reserve(consumerCount);

    // 1. Initialize GLFW and create a window
    if (!glfwInit())
        return 1;

    const char *glsl_version = "#version 330";
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
#ifdef __APPLE__
    glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GL_TRUE);
#endif

        GLFWwindow *window = glfwCreateWindow(1280, 720, "Video Player", nullptr, nullptr);

        if (!window)
            return 1;

        // This code is for maximizing the Video Player window.
        GLFWmonitor* monitor = glfwGetPrimaryMonitor();

        if (monitor != nullptr)
        {
            const GLFWvidmode* mode = glfwGetVideoMode(monitor);

            if (mode != nullptr)
            {
                glfwSetWindowSize(window, mode->width, mode->height);
                glfwSetWindowPos(window, 0, 0);
            }
        }

        glfwMakeContextCurrent(window);
        glfwSwapInterval(1);
    // This code is for setting up the OpenGL window.
    glfwMakeContextCurrent(window);
    glfwSwapInterval(1);
    // 2. Initialize Dear ImGui context and backends
    IMGUI_CHECKVERSION();
    ImGui::CreateContext();
    ImGuiIO &io = ImGui::GetIO();
    io.ConfigFlags |= ImGuiConfigFlags_NavEnableKeyboard; // Optional keyboard navigation

    ImGui::StyleColorsDark();

    ImGui_ImplGlfw_InitForOpenGL(window, true);
    ImGui_ImplOpenGL3_Init(glsl_version);

    for (int i = 0; i < consumerCount; ++i) {
        consumerThreads.emplace_back(processUploads, std::ref(uploadQueue));
    }

    // Start the grpc server
    std::thread grpc_thread(runServer, std::ref(uploadQueue));

    // This variable is for controlling the visibility of the Gallery.
    bool showGallery = true;

    // 3. Main loop
    while (!glfwWindowShouldClose(window))
    {
        glfwPollEvents();

        // Start a new ImGui frame
        ImGui_ImplOpenGL3_NewFrame();
        ImGui_ImplGlfw_NewFrame();
        ImGui::NewFrame();

        // This code is for displaying the Gallery directly.
        gallery::RenderGallery(&showGallery);
        // Render ImGui draw data onto the OpenGL framebuffer
        ImGui::Render();
        int display_w, display_h;
        glfwGetFramebufferSize(window, &display_w, &display_h);
        glViewport(0, 0, display_w, display_h);
        glClearColor(0.12f, 0.12f, 0.14f, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT);

        ImGui_ImplOpenGL3_RenderDrawData(ImGui::GetDrawData());
        glfwSwapBuffers(window);
    }

    // 4. Cleanup
    stopServer();
    uploadQueue.stop();
    for (std::thread& worker : consumerThreads) {
        worker.join();
    }
    if (grpc_thread.joinable())
    {
        grpc_thread.join(); // Waits for the RunServer thread to safely exit
    }

    ImGui_ImplOpenGL3_Shutdown();
    ImGui_ImplGlfw_Shutdown();
    ImGui::DestroyContext();
    glfwDestroyWindow(window);
    glfwTerminate();
    return 0;
}