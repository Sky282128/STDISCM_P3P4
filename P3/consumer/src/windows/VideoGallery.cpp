
#include "VideoGallery.h"
#include "AudioPlayer.h"
#include "imgui.h"

#include <iostream>
#include <filesystem>
#include <vector>
#include <algorithm>
#include <string>
#include <cctype>
#include <chrono>

#include <GLFW/glfw3.h>
#include <opencv2/opencv.hpp>

#ifndef GL_CLAMP_TO_EDGE
#define GL_CLAMP_TO_EDGE 0x812F
#endif

namespace fs = std::filesystem;

namespace
{
    // This code is for storing the normal video playback state.
    // This code stores the state needed for normal video playback.
    // It keeps track of the selected video, current frame, audio, and texture.
    cv::VideoCapture videoCapture;
    AudioPlayer audioPlayer;
    cv::Mat currentFrame;

    GLuint videoTexture = 0;

    bool isPlaying = false;
    double videoFPS = 30.0;

    std::chrono::steady_clock::time_point nextFrameTime;

    fs::path selectedVideo;


    // This code is for storing the separate hover preview state.

    // This code stores a separate video capture for the muted hover preview.
    // Keeping it separate prevents the preview from interrupting normal playback.
    cv::VideoCapture previewCapture;
    cv::Mat previewFrame;

    GLuint previewTexture = 0;

    fs::path hoveredVideo;

    double previewFPS = 30.0;

    bool previewActive = false;
    bool previewFinished = false;

    std::chrono::steady_clock::time_point previewStartTime;
    std::chrono::steady_clock::time_point nextPreviewFrameTime;


    // This function is for converting an OpenCV frame into an OpenGL texture.

    // This function converts an OpenCV frame into a texture that OpenGL can display.
    void UpdateOpenGLTexture(
        const cv::Mat& frame,
        GLuint& texture
    )
    {
        if (frame.empty())
            return;

        cv::Mat rgbFrame;

        cv::cvtColor(
            frame,
            rgbFrame,
            cv::COLOR_BGR2RGB
        );

        if (texture == 0)
            glGenTextures(1, &texture);

        glBindTexture(GL_TEXTURE_2D, texture);

        glTexParameteri(
            GL_TEXTURE_2D,
            GL_TEXTURE_MIN_FILTER,
            GL_LINEAR
        );

        glTexParameteri(
            GL_TEXTURE_2D,
            GL_TEXTURE_MAG_FILTER,
            GL_LINEAR
        );

        glTexParameteri(
            GL_TEXTURE_2D,
            GL_TEXTURE_WRAP_S,
            GL_CLAMP_TO_EDGE
        );

        glTexParameteri(
            GL_TEXTURE_2D,
            GL_TEXTURE_WRAP_T,
            GL_CLAMP_TO_EDGE
        );

        glPixelStorei(GL_UNPACK_ALIGNMENT, 1);

        glTexImage2D(
            GL_TEXTURE_2D,
            0,
            GL_RGB,
            rgbFrame.cols,
            rgbFrame.rows,
            0,
            GL_RGB,
            GL_UNSIGNED_BYTE,
            rgbFrame.data
        );

        glBindTexture(GL_TEXTURE_2D, 0);
    }


    // This function is for updating the normal video texture.

    // This function updates the OpenGL texture using the current normal video frame.
    void UpdateTexture()
    {
        UpdateOpenGLTexture(
            currentFrame,
            videoTexture
        );
    }


    // This function is for updating the hover preview texture.

    // This function updates the OpenGL texture using the current hover preview frame.
    void UpdatePreviewTexture()
    {
        UpdateOpenGLTexture(
            previewFrame,
            previewTexture
        );
    }


    // This function is for opening the selected video.

    // This function opens the selected video and prepares its first frame and audio.
    bool OpenVideo(const fs::path& path)
    {
        videoCapture.release();
        currentFrame.release();

        isPlaying = false;
        selectedVideo = path;

        // Load audio independently.
        audioPlayer.Load(path.string());

        if (!videoCapture.open(path.string()))
        {
            std::cerr
                << "Failed to open video: "
                << path
                << std::endl;

            selectedVideo.clear();
            return false;
        }

        videoFPS = videoCapture.get(
            cv::CAP_PROP_FPS
        );

        if (videoFPS <= 0 || videoFPS > 240)
            videoFPS = 30.0;

        if (!videoCapture.read(currentFrame))
        {
            std::cerr
                << "Failed to read first video frame: "
                << path
                << std::endl;

            videoCapture.release();
            selectedVideo.clear();
            return false;
        }

        return true;
    }


    // This function is for starting the muted hover preview.

    // This function starts a muted preview for the video currently being hovered over.
    void StartHoverPreview(const fs::path& path)
    {
        // Release only the previous preview capture.
        // Never modify the normal video capture here.
        previewCapture.release();
        previewFrame.release();

        previewActive = false;
        previewFinished = false;

        hoveredVideo = path;

        if (!previewCapture.open(path.string()))
        {
            std::cerr
                << "Failed to open preview: "
                << path
                << std::endl;

            hoveredVideo.clear();
            return;
        }

        previewFPS = previewCapture.get(
            cv::CAP_PROP_FPS
        );

        if (previewFPS <= 0 || previewFPS > 240)
            previewFPS = 30.0;

        previewCapture.set(
            cv::CAP_PROP_POS_FRAMES,
            0
        );

        if (!previewCapture.read(previewFrame))
        {
            std::cerr
                << "Could not read preview frame: "
                << path
                << std::endl;

            previewCapture.release();
            hoveredVideo.clear();
            return;
        }

        previewStartTime =
            std::chrono::steady_clock::now();

        nextPreviewFrameTime = previewStartTime;

        previewActive = true;
        previewFinished = false;

        UpdatePreviewTexture();

        std::cout
            << "Hover preview started: "
            << path.filename()
            << std::endl;
    }


    // This function is for updating the hover preview frames.

    // This function advances the hover preview one frame at a time and stops it after 10 seconds.
    void UpdateHoverPreview()
    {
        if (!previewActive || previewFinished)
            return;

        auto now = std::chrono::steady_clock::now();

        double elapsed =
            std::chrono::duration<double>(
                now - previewStartTime
            ).count();

        // Stop after 10 seconds.
        if (elapsed >= 10.0)
        {
            previewFinished = true;

            std::cout
                << "Hover preview finished."
                << std::endl;

            return;
        }

        if (now < nextPreviewFrameTime)
            return;

        if (previewCapture.read(previewFrame))
        {
            UpdatePreviewTexture();

            auto frameDuration =
                std::chrono::duration<double>(
                    1.0 / previewFPS
                );

            nextPreviewFrameTime =
                now +
                std::chrono::duration_cast<
                    std::chrono::steady_clock::duration
                >(frameDuration);
        }
        else
        {
            previewFinished = true;
        }
    }


    // This function is for stopping and resetting the hover preview.

    // This function releases the preview video and resets its playback state.
    void StopHoverPreview()
    {
        previewCapture.release();
        previewFrame.release();

        hoveredVideo.clear();

        previewActive = false;
        previewFinished = false;
    }


    // This function is for displaying a video frame in the GUI.

    // This function displays a video frame in the GUI while preserving its aspect ratio.
// This function is for displaying a resized video frame
// while maintaining its original aspect ratio.
void DisplayVideoFrame(
    const cv::Mat& frame,
    GLuint texture
)
{
    if (frame.empty() || texture == 0)
        return;

    float width =
        static_cast<float>(frame.cols);

    float height =
        static_cast<float>(frame.rows);

    // This code is for increasing the video display size.
    float scale = std::min(
        2000.0f / width,
        540.0f / height
    );

    ImGui::Image(
        static_cast<ImTextureID>(texture),
        ImVec2(
            width * scale,
            height * scale
        ),
        ImVec2(0, 0),
        ImVec2(1, 1)
    );
}
}


// This function is for rendering the Consumer video gallery interface.

namespace gallery
{
    // This function renders the gallery window, uploaded video list, preview, and playback controls.
    void RenderGallery(bool* p_open)
    {
        if (p_open && !*p_open)
            return;

        if (!ImGui::Begin("Gallery", p_open))
        {
            ImGui::End();
            return;
        }


        // This code is for finding supported video files in the uploads folder.

        // This code sets the folder where the Consumer stores uploaded videos.
        fs::path uploadFolder = "../uploads";

        // This code stores the paths of all supported video files found in the upload folder.
        std::vector<fs::path> videos;

        std::error_code ec;

        if (
            fs::exists(uploadFolder, ec) &&
            fs::is_directory(uploadFolder, ec)
        )
        {
            for (
                fs::directory_iterator it(uploadFolder, ec), end;
                !ec && it != end;
                it.increment(ec)
            )
            {
                if (!it->is_regular_file(ec))
                    continue;

                std::string extension =
                    it->path().extension().string();

                // This code converts the extension to lowercase so file checks are case-insensitive.
                std::transform(
                    extension.begin(),
                    extension.end(),
                    extension.begin(),
                    [](unsigned char c)
                    {
                        return static_cast<char>(
                            std::tolower(c)
                        );
                    }
                );

                if (
                    extension == ".mp4" ||
                    extension == ".mkv" ||
                    extension == ".avi" ||
                    extension == ".mov" ||
                    extension == ".webm"
                )
                {
                    videos.push_back(it->path());
                }
            }
        }

        std::sort(
            videos.begin(),
            videos.end()
        );


        // This code is for displaying the uploaded videos in the library.

        ImGui::Text(
            "Uploaded Videos: %zu",
            videos.size()
        );

        ImGui::Separator();

        ImGui::Text("Video Library");

        ImGui::BeginChild(
            "VideoList",
            ImVec2(0, 150),
            true
        );

        // This variable remembers which video the mouse is currently hovering over.
        fs::path currentHoveredVideo;

        for (const auto& video : videos)
        {
            std::string filename =
                video.filename().string();

            bool selected =
                (selectedVideo == video);

            bool clicked = ImGui::Selectable(
                filename.c_str(),
                selected
            );

            // Detect hover immediately after Selectable.
            bool hovered = ImGui::IsItemHovered();

            if (hovered)
            {
                currentHoveredVideo = video;
            }

            if (clicked)
            {
                isPlaying = false;

                audioPlayer.Stop();

                if (!OpenVideo(video))
                {
                    std::cerr
                        << "Failed to open video: "
                        << video
                        << std::endl;
                }
                else
                {
                    UpdateTexture();

                    std::cout
                        << "Selected video: "
                        << filename
                        << std::endl;
                }
            }
        }

        ImGui::EndChild();


        // This code is for starting or stopping the preview based on the hovered video.

        if (!currentHoveredVideo.empty())
        {
            if (currentHoveredVideo != hoveredVideo)
            {
                StartHoverPreview(
                    currentHoveredVideo
                );
            }
        }
        else
        {
            if (!hoveredVideo.empty())
            {
                StopHoverPreview();
            }
        }

        // This code updates the preview frame while a video is being hovered over.
        UpdateHoverPreview();


        // This code is for displaying the hover preview before the normal video player.

        if (
            previewActive &&
            !previewFrame.empty() &&
            previewTexture != 0
        )
        {
            ImGui::Separator();

            ImGui::Text(
                "Hover Preview: %s",
                hoveredVideo.filename().string().c_str()
            );

            if (previewFinished)
            {
                ImGui::Text(
                    "10-second preview finished."
                );
            }
            else
            {
                ImGui::Text(
                    "Playing muted preview..."
                );
            }

            DisplayVideoFrame(
                previewFrame,
                previewTexture
            );
        }


        // This code is for displaying and controlling normal video playback.

        ImGui::Separator();

        if (
            !selectedVideo.empty() &&
            videoCapture.isOpened()
        )
        {
            ImGui::Text(
                "Now Selected: %s",
                selectedVideo.filename().string().c_str()
            );


           
            // This code is for displaying the audio streaming status.

            // This code displays the current audio loading or playback readiness status.
            if (audioPlayer.IsLoading())
            {
                ImGui::Text("Audio: Streaming...");
            }
            else if (audioPlayer.IsReady())
            {
                ImGui::Text("Audio: Ready");
            }
            else
            {
                ImGui::Text("Audio: Unavailable");
            }


            // This code is for starting audio and video playback.

            // This code starts the audio and video playback when Play is clicked.
            if (ImGui::Button("Play"))
            {
                double position =
                    videoCapture.get(cv::CAP_PROP_POS_FRAMES);

                double totalFrames =
                    videoCapture.get(cv::CAP_PROP_FRAME_COUNT);

                // Restart video if it reached the end.
                if (position >= totalFrames)
                {
                    videoCapture.set(
                        cv::CAP_PROP_POS_FRAMES,
                        0
                    );

                    if (videoCapture.read(currentFrame))
                    {
                        UpdateTexture();
                    }
                }

                // Start audio streaming.
                audioPlayer.Play();

                // Start video immediately.
                isPlaying = true;

                nextFrameTime =
                    std::chrono::steady_clock::now();
            }

            ImGui::SameLine();


            // This code is for pausing both audio and video playback.

            // This code pauses both the video frames and the audio stream.
            if (ImGui::Button("Pause"))
            {
                isPlaying = false;
                audioPlayer.Pause();
            }

            ImGui::SameLine();


            // This code is for stopping playback and returning to the first frame.

            // This code stops playback and moves the video back to its first frame.
            if (ImGui::Button("Stop"))
            {
                isPlaying = false;

                audioPlayer.Stop();

                videoCapture.set(
                    cv::CAP_PROP_POS_FRAMES,
                    0
                );

                if (videoCapture.read(currentFrame))
                {
                    UpdateTexture();
                }
            }


            // This code checks whether it is time to display the next video frame.
            auto now =
                std::chrono::steady_clock::now();

            if (
                isPlaying &&
                now >= nextFrameTime
            )
            {
                if (videoCapture.read(currentFrame))
                {
                    UpdateTexture();

                    auto frameDuration =
                        std::chrono::duration<double>(
                            1.0 / videoFPS
                        );

                    nextFrameTime =
                        now +
                        std::chrono::duration_cast<
                            std::chrono::steady_clock::duration
                        >(frameDuration);
                }
                else
                {
                    isPlaying = false;

                    audioPlayer.Stop();
                }
            }



            ImGui::Separator();

            ImGui::Text("Video Playback");

            DisplayVideoFrame(
                currentFrame,
                videoTexture
            );
        }
        else
        {
            ImGui::Text(
                "Select a video to start playback."
            );
        }

        ImGui::End();
    }
}
