
#include "AudioPlayer.h"

#include <iostream>
#include <vector>
#include <thread>
#include <chrono>
#include <algorithm>
#include <limits>

#include <SDL.h>

extern "C"
{
#include <libavformat/avformat.h>
#include <libavcodec/avcodec.h>
#include <libavutil/channel_layout.h>
#include <libavutil/samplefmt.h>
#include <libavutil/mathematics.h>
#include <libswresample/swresample.h>
}

namespace
{
    constexpr int OUTPUT_RATE = 44100;
    constexpr int OUTPUT_CHANNELS = 2;
    constexpr int OUTPUT_BYTES_PER_SAMPLE = 2;

    // Keep approximately half a second of audio queued.
    constexpr Uint32 MAX_QUEUED_AUDIO = 88200;
}


// This function is for cleaning up the audio player when the object is destroyed.

AudioPlayer::~AudioPlayer()
{
    Shutdown();
}


// This function is for initializing the SDL audio device.

bool AudioPlayer::Initialize()
{
    if (initialized)
        return true;

    if (SDL_InitSubSystem(SDL_INIT_AUDIO) != 0)
    {
        std::cerr
            << "SDL audio initialization failed: "
            << SDL_GetError()
            << std::endl;

        return false;
    }

    SDL_AudioSpec desired{};

    desired.freq = OUTPUT_RATE;
    desired.format = AUDIO_S16SYS;
    desired.channels = OUTPUT_CHANNELS;
    desired.samples = 1024;

    SDL_AudioDeviceID device =
        SDL_OpenAudioDevice(
            nullptr,
            0,
            &desired,
            nullptr,
            0
        );

    if (device == 0)
    {
        std::cerr
            << "Could not open audio device: "
            << SDL_GetError()
            << std::endl;

        SDL_QuitSubSystem(SDL_INIT_AUDIO);

        return false;
    }

    audioDevice = device;
    initialized = true;

    // Start paused until Play is pressed.
    SDL_PauseAudioDevice(device, 1);

    return true;
}


// This function is for preparing the audio from the selected video.

bool AudioPlayer::Load(const std::string& filePath)
{
    // Stop and clean up the previous audio.
    Stop();

    if (!Initialize())
        return false;

    currentFile = filePath;

    ready.store(true);
    loading.store(false);
    finished.store(false);

    std::cout
        << "Audio source ready: "
        << filePath
        << std::endl;

    // Do not decode the entire file here.
    // Decoding starts when Play is pressed.

    return true;
}


// This function is for starting or resuming audio playback.

void AudioPlayer::Play()
{
    if (!initialized || !ready.load())
        return;

    if (decodeThread.joinable())
    {
        if (finished.load())
        {
            if (SDL_GetQueuedAudioSize(audioDevice) == 0)
            {
                decodeThread.join();
            }
            else
            {
                // Let the remaining queued audio finish.
                playing.store(true);
                SDL_PauseAudioDevice(audioDevice, 0);
                return;
            }
        }
        else
        {
            // Resume existing playback.
            playing.store(true);
            SDL_PauseAudioDevice(audioDevice, 0);
            return;
        }
    }

    stopRequested.store(false);
    playing.store(true);
    loading.store(true);
    finished.store(false);

    SDL_ClearQueuedAudio(audioDevice);
    SDL_PauseAudioDevice(audioDevice, 0);

    decodeThread = std::thread(
        &AudioPlayer::DecodeAudio,
        this
    );
}


// This function is for pausing the current audio playback.

void AudioPlayer::Pause()
{
    if (!initialized)
        return;

    playing.store(false);

    SDL_PauseAudioDevice(audioDevice, 1);
}


// This function is for stopping playback and clearing queued audio.

void AudioPlayer::Stop()
{
    playing.store(false);
    stopRequested.store(true);

    if (initialized)
    {
        SDL_PauseAudioDevice(audioDevice, 1);
    }

    // Wait for decoder thread to finish before
    // clearing its audio queue.
    if (decodeThread.joinable())
    {
        decodeThread.join();
    }

    if (initialized)
    {
        SDL_ClearQueuedAudio(audioDevice);
    }

    loading.store(false);
    finished.store(false);
    stopRequested.store(false);
}


// This function is for decoding audio and streaming it in small chunks.

void AudioPlayer::DecodeAudio()
{
    AVFormatContext* formatContext = nullptr;
    AVCodecContext* codecContext = nullptr;
    AVPacket* packet = nullptr;
    AVFrame* frame = nullptr;
    SwrContext* resampler = nullptr;

    AVChannelLayout outputLayout{};

    av_channel_layout_default(
        &outputLayout,
        OUTPUT_CHANNELS
    );

    bool success = false;

    do
    {
        // ---------------------------------------------
        // OPEN MEDIA FILE
        // ---------------------------------------------

        if (avformat_open_input(
                &formatContext,
                currentFile.c_str(),
                nullptr,
                nullptr) < 0)
        {
            std::cerr
                << "Failed to open audio source."
                << std::endl;

            break;
        }

        if (stopRequested.load())
            break;

        // ---------------------------------------------
        // READ STREAM INFORMATION
        // ---------------------------------------------

        if (avformat_find_stream_info(
                formatContext,
                nullptr) < 0)
        {
            std::cerr
                << "Failed to read media information."
                << std::endl;

            break;
        }

        // ---------------------------------------------
        // FIND AUDIO STREAM
        // ---------------------------------------------

        int audioStream = av_find_best_stream(
            formatContext,
            AVMEDIA_TYPE_AUDIO,
            -1,
            -1,
            nullptr,
            0
        );

        if (audioStream < 0)
        {
            std::cerr
                << "No audio stream found."
                << std::endl;

            break;
        }

        AVStream* stream =
            formatContext->streams[audioStream];

        // ---------------------------------------------
        // FIND AUDIO DECODER
        // ---------------------------------------------

        const AVCodec* decoder =
            avcodec_find_decoder(
                stream->codecpar->codec_id
            );

        if (!decoder)
            break;

        codecContext =
            avcodec_alloc_context3(decoder);

        if (!codecContext)
            break;

        if (avcodec_parameters_to_context(
                codecContext,
                stream->codecpar) < 0)
        {
            break;
        }

        if (codecContext->sample_rate <= 0)
            codecContext->sample_rate = OUTPUT_RATE;

        if (codecContext->ch_layout.nb_channels == 0)
        {
            av_channel_layout_default(
                &codecContext->ch_layout,
                OUTPUT_CHANNELS
            );
        }

        if (avcodec_open2(
                codecContext,
                decoder,
                nullptr) < 0)
        {
            std::cerr
                << "Failed to open audio decoder."
                << std::endl;

            break;
        }

        // ---------------------------------------------
        // INITIALIZE AUDIO RESAMPLER
        // ---------------------------------------------

        if (swr_alloc_set_opts2(
                &resampler,
                &outputLayout,
                AV_SAMPLE_FMT_S16,
                OUTPUT_RATE,
                &codecContext->ch_layout,
                codecContext->sample_fmt,
                codecContext->sample_rate,
                0,
                nullptr) < 0)
        {
            break;
        }

        if (!resampler || swr_init(resampler) < 0)
        {
            std::cerr
                << "Failed to initialize audio resampler."
                << std::endl;

            break;
        }

        packet = av_packet_alloc();
        frame = av_frame_alloc();

        if (!packet || !frame)
            break;


// This code is for queueing small audio chunks without loading the entire track at once.

        auto queueAudio = [&](const uint8_t* data,
                              size_t bytes) -> bool
        {
            if (bytes == 0)
                return true;

            if (bytes > std::numeric_limits<Uint32>::max())
                return false;

            while (!stopRequested.load())
            {
                // Wait while paused.
                if (!playing.load())
                {
                    std::this_thread::sleep_for(
                        std::chrono::milliseconds(5)
                    );

                    continue;
                }

                Uint32 queued =
                    SDL_GetQueuedAudioSize(audioDevice);

                // Avoid loading the entire audio track
                // into SDL's queue.
                if (queued < MAX_QUEUED_AUDIO)
                    break;

                std::this_thread::sleep_for(
                    std::chrono::milliseconds(5)
                );
            }

            if (stopRequested.load())
                return false;

            if (SDL_QueueAudio(
                    audioDevice,
                    data,
                    static_cast<Uint32>(bytes)) != 0)
            {
                std::cerr
                    << "Audio queue failed: "
                    << SDL_GetError()
                    << std::endl;

                return false;
            }

            return true;
        };


// This code is for converting a decoded audio frame and adding it to the playback queue.

        auto convertFrame = [&]() -> bool
        {
            if (stopRequested.load())
                return false;

            int outputSamples = av_rescale_rnd(
                swr_get_delay(
                    resampler,
                    codecContext->sample_rate
                ) + frame->nb_samples,
                OUTPUT_RATE,
                codecContext->sample_rate,
                AV_ROUND_UP
            );

            if (outputSamples <= 0)
                return true;

            int bufferSize =
                outputSamples *
                OUTPUT_CHANNELS *
                OUTPUT_BYTES_PER_SAMPLE;

            std::vector<uint8_t> buffer(bufferSize);

            uint8_t* output[] = {
                buffer.data()
            };

            int convertedSamples = swr_convert(
                resampler,
                output,
                outputSamples,
                const_cast<const uint8_t**>(
                    frame->extended_data
                ),
                frame->nb_samples
            );

            if (convertedSamples < 0)
                return false;

            size_t bytes =
                static_cast<size_t>(convertedSamples) *
                OUTPUT_CHANNELS *
                OUTPUT_BYTES_PER_SAMPLE;

            return queueAudio(
                buffer.data(),
                bytes
            );
        };


// This code is for receiving decoded audio frames from FFmpeg.

        auto receiveFrames = [&]() -> bool
        {
            while (!stopRequested.load())
            {
                int result = avcodec_receive_frame(
                    codecContext,
                    frame
                );

                if (result == AVERROR(EAGAIN) ||
                    result == AVERROR_EOF)
                {
                    break;
                }

                if (result < 0)
                    return false;

                bool converted = convertFrame();

                av_frame_unref(frame);

                if (!converted)
                    return false;
            }

            return !stopRequested.load();
        };


// This code is for reading and decoding audio packets from the media file.

        while (!stopRequested.load())
        {
            int readResult =
                av_read_frame(formatContext, packet);

            if (readResult < 0)
                break;

            if (packet->stream_index == audioStream)
            {
                int sendResult = avcodec_send_packet(
                    codecContext,
                    packet
                );

                if (sendResult >= 0)
                {
                    if (!receiveFrames())
                    {
                        av_packet_unref(packet);
                        break;
                    }
                }
            }

            av_packet_unref(packet);
        }

        if (stopRequested.load())
            break;


// This code is for processing any audio frames remaining in the decoder.

        avcodec_send_packet(codecContext, nullptr);

        if (!receiveFrames())
            break;


// This code is for processing any audio samples remaining in the resampler.

        while (!stopRequested.load() &&
               swr_get_delay(
                   resampler,
                   codecContext->sample_rate) > 0)
        {
            int outputSamples = static_cast<int>(
                av_rescale_rnd(
                    swr_get_delay(
                        resampler,
                        codecContext->sample_rate
                    ),
                    OUTPUT_RATE,
                    codecContext->sample_rate,
                    AV_ROUND_UP
                )
            );

            if (outputSamples <= 0)
                break;

            std::vector<uint8_t> buffer(
                outputSamples *
                OUTPUT_CHANNELS *
                OUTPUT_BYTES_PER_SAMPLE
            );

            uint8_t* output[] = {
                buffer.data()
            };

            int converted = swr_convert(
                resampler,
                output,
                outputSamples,
                nullptr,
                0
            );

            if (converted <= 0)
                break;

            size_t bytes =
                static_cast<size_t>(converted) *
                OUTPUT_CHANNELS *
                OUTPUT_BYTES_PER_SAMPLE;

            if (!queueAudio(buffer.data(), bytes))
                break;
        }

        success = !stopRequested.load();

    } while (false);


// This code is for releasing the FFmpeg resources used during audio decoding.

    av_channel_layout_uninit(&outputLayout);

    if (frame)
        av_frame_free(&frame);

    if (packet)
        av_packet_free(&packet);

    if (resampler)
        swr_free(&resampler);

    if (codecContext)
        avcodec_free_context(&codecContext);

    if (formatContext)
        avformat_close_input(&formatContext);


// This code is for updating the audio loading and completion status.

    loading.store(false);

    if (success)
    {
        finished.store(true);

        std::cout
            << "Audio streaming completed."
            << std::endl;
    }
    else if (!stopRequested.load())
    {
        finished.store(true);

        std::cerr
            << "Audio streaming failed."
            << std::endl;
    }
}


// This function is for checking whether audio is currently being streamed.

bool AudioPlayer::IsLoading() const
{
    return loading.load();
}


// This function is for checking whether an audio source is ready to play.

bool AudioPlayer::IsReady() const
{
    return ready.load();
}


// This function is for stopping audio playback and releasing the SDL audio device.

void AudioPlayer::Shutdown()
{
    Stop();

    ready.store(false);

    if (!initialized)
        return;

    SDL_CloseAudioDevice(audioDevice);

    SDL_QuitSubSystem(SDL_INIT_AUDIO);

    audioDevice = 0;
    initialized = false;

    currentFile.clear();
}
