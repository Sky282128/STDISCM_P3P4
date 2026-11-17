// consumer/src/DuplicateRegistry.h
#pragma once

#include <mutex>
#include <string>
#include <unordered_set>

class DuplicateRegistry {
public:
    bool tryReserve(const std::string& digest) {
        std::lock_guard<std::mutex> lock(mutex_);
        return digests_.insert(digest).second;
    }

    void release(const std::string& digest) {
        std::lock_guard<std::mutex> lock(mutex_);
        digests_.erase(digest);
    }

private:
    std::mutex mutex_;
    std::unordered_set<std::string> digests_;
};