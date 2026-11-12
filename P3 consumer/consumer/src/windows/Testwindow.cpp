#include "Testwindow.h"
#include <imgui.h>

namespace windows {
    void RenderTestWindow(bool* p_open) {
        if (ImGui::Begin("Test", p_open)) {
            ImGui::Text("Test");
        }
        ImGui::End();
    }
}