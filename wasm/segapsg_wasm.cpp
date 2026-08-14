#include <cstdint>

#include "segapsg.h"

namespace
{

inline SegaPSG *cast_handle(void *ptr)
{
    return static_cast<SegaPSG *>(ptr);
}

} // namespace

extern "C"
{

void *segapsg_create(uint32_t sample_rate, uint32_t clock)
{
    return new SegaPSG(sample_rate, clock);
}

void segapsg_destroy(void *ptr)
{
    delete cast_handle(ptr);
}

void segapsg_reset(void *ptr)
{
    cast_handle(ptr)->reset();
}

void segapsg_write(void *ptr, uint8_t data)
{
    cast_handle(ptr)->write(data);
}

uint32_t segapsg_sample_rate(void *ptr)
{
    return cast_handle(ptr)->sample_rate();
}

void segapsg_generate(void *ptr, float *left, float *right, uint32_t frames)
{
    cast_handle(ptr)->generate(left, right, frames);
}

}
