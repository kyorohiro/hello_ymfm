#include <cstdint>
#include <memory>

#include "ymfm.h"
#include "ymfm_opn.h"

namespace
{

struct ym2612_handle
{
    ymfm::ymfm_interface intf;
    ymfm::ym2612 chip;

    ym2612_handle() : intf(), chip(intf)
    {
        chip.reset();
    }
};

inline ym2612_handle *cast_handle(void *ptr)
{
    return static_cast<ym2612_handle *>(ptr);
}

inline float normalize_sample(int32_t value)
{
    if (value < -32768)
        value = -32768;
    if (value > 32767)
        value = 32767;
    return static_cast<float>(value) / 32768.0f;
}

} // namespace

extern "C"
{

void *ym2612_create()
{
    return new ym2612_handle();
}

void ym2612_destroy(void *ptr)
{
    delete cast_handle(ptr);
}

void ym2612_reset(void *ptr)
{
    cast_handle(ptr)->chip.reset();
}

void ym2612_write(void *ptr, uint32_t offset, uint8_t data)
{
    cast_handle(ptr)->chip.write(offset, data);
}

uint32_t ym2612_sample_rate(void *ptr, uint32_t clock)
{
    return cast_handle(ptr)->chip.sample_rate(clock);
}

void ym2612_generate(void *ptr, float *left, float *right, uint32_t frames)
{
    auto *handle = cast_handle(ptr);
    for (uint32_t index = 0; index < frames; index++)
    {
        ymfm::ym2612::output_data output;
        handle->chip.generate(&output);
        left[index] = normalize_sample(output.data[0]);
        right[index] = normalize_sample(output.data[1]);
    }
}

}
