#pragma once

// This code is for using strings to store file paths.
#include <string>

// This code is for running the audio decoder in a separate thread.
#include <thread>

// This code is for safely sharing boolean states between threads.
#include <atomic>

// This code is for using fixed-width integer types.
#include <cstdint>

// This class is for handling audio playback.
class AudioPlayer
{
public:
    // This function is for creating an AudioPlayer object.
    AudioPlayer() = default;

    // This function is for cleaning up the audio player when the object is destroyed.
    ~AudioPlayer();

    // This code is for preventing AudioPlayer objects from being copied.
    AudioPlayer(const AudioPlayer&) = delete;
    AudioPlayer& operator=(const AudioPlayer&) = delete;

    // This function is for loading the audio source from a video file.
    bool Load(const std::string& filePath);

    // This function is for starting or resuming audio playback.
    void Play();

    // This function is for pausing audio playback.
    void Pause();

    // This function is for stopping audio playback and clearing the queued audio.
    void Stop();

    // This function is for shutting down the audio system and releasing its resources.
    void Shutdown();

    // This function is for checking whether audio is currently being decoded.
    bool IsLoading() const;

    // This function is for checking whether an audio source is ready for playback.
    bool IsReady() const;

private:
    // This function is for initializing the SDL audio device.
    bool Initialize();

    // This function is for decoding audio and streaming it to the audio device.
    void DecodeAudio();

    // This variable is for storing the SDL audio device ID.
    unsigned int audioDevice = 0;

    // This variable is for checking whether the audio device has been initialized.
    bool initialized = false;

    // This variable is for storing the path of the currently selected audio file.
    std::string currentFile;

    // This variable is for running audio decoding separately from the main thread.
    std::thread decodeThread;

    // This variable is for tracking whether audio is currently loading.
    std::atomic<bool> loading{false};

    // This variable is for tracking whether an audio source is ready.
    std::atomic<bool> ready{false};

    // This variable is for tracking whether audio is currently playing.
    std::atomic<bool> playing{false};

    // This variable is for signaling the decoder thread to stop.
    std::atomic<bool> stopRequested{false};

    // This variable is for tracking whether audio decoding has finished.
    std::atomic<bool> finished{false};
};