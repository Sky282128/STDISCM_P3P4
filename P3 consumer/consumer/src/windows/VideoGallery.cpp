#include "VideoGallery.h"
#include <imgui.h>

namespace gallery
{
    void RenderGallery(bool *p_open)
    {
        if (p_open && !*p_open)
        {
            return;
        }

        if (ImGui::Begin("Gallery", p_open))
        {
            ImGui::Text("Gallery table");
        }
        ImGui::End();
    }
}