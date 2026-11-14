#include "imgui.h"
#include "imgui_impl_glfw.h"
#include "imgui_impl_opengl3.h"

#include "Testwindow.h"
#include "VideoGallery.h"
#include "MediaUploadService.h"

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

int main()
{
    UploadQueue<UploadJob> uploadQueue(10);
    constexpr int consumerCount = 2;
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

    GLFWwindow *window = glfwCreateWindow(1280, 720, "Dear ImGui + OpenGL", nullptr, nullptr);
    if (!window)
        return 1;
    glfwMakeContextCurrent(window);
    glfwSwapInterval(1); // Enable vsync

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

    // flag to show the test window
    bool showTest = false;

    bool showGallery = false;

    // 3. Main loop
    while (!glfwWindowShouldClose(window))
    {
        glfwPollEvents();

        // Start a new ImGui frame
        ImGui_ImplOpenGL3_NewFrame();
        ImGui_ImplGlfw_NewFrame();
        ImGui::NewFrame();

        ImGui::Begin("main window");
        if (ImGui::Button("Show Test Window"))
        {
            if (showTest == !true)
            {
                showTest = true;
            }
            else
            {
                showTest = false;
            }
        }

        if (ImGui::Button("Show Gallery"))
        {
            if (showGallery == !true)
            {
                showGallery = true;
            }
            else
            {
                showGallery = false;
            }
        }
        ImGui::End();

        gallery::RenderGallery(&showGallery);
        windows::RenderTestWindow(&showTest);

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