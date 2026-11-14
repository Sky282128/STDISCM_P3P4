#pragma once

#include <condition_variable>
#include <cstddef>
#include <mutex>
#include <optional>
#include <queue>
#include <utility>

template <typename T>
class UploadQueue {
public:
    explicit UploadQueue(std::size_t capacity)
        : capacity_(capacity) {}

    bool tryPush(T item) {
        std::lock_guard<std::mutex> lock(mutex_);

        if (stopping_ || queue_.size() >= capacity_) {
            return false;
        }

        queue_.push(std::move(item));
        itemsAvailable_.notify_one();
        return true;
    }

    std::optional<T> pop() {
        std::unique_lock<std::mutex> lock(mutex_);

        itemsAvailable_.wait(lock, [this] {
            return stopping_ || !queue_.empty();
        });

        if (queue_.empty()) {
            return std::nullopt;
        }

        T item = std::move(queue_.front());
        queue_.pop();
        return item;
    }

    void stop() {
        {
            std::lock_guard<std::mutex> lock(mutex_);
            stopping_ = true;
        }

        itemsAvailable_.notify_all();
    }

private:
    std::size_t capacity_;
    std::queue<T> queue_;
    std::mutex mutex_;
    std::condition_variable itemsAvailable_;
    bool stopping_ = false;
};