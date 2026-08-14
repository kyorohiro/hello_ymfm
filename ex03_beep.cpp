#include <iostream>

#include "ymfm.h"
#include "ymfm_opn.h"

int main()
{
    constexpr uint32_t CLOCK = 7670454;

    ymfm::ymfm_interface intf;
    ymfm::ym2612 chip(intf);

    chip.reset();

    uint32_t sampleRate = chip.sample_rate(CLOCK);

    std::cout << "YM2612 created\n";
    std::cout << "sample rate = " << sampleRate << "\n";

    //
    // Channel 1 / Operator settings
    //

    // DT / MULTI
    chip.write(0, 0x30);
    chip.write(1, 0x01);

    chip.write(0, 0x34);
    chip.write(1, 0x01);

    chip.write(0, 0x38);
    chip.write(1, 0x01);

    chip.write(0, 0x3c);
    chip.write(1, 0x01);

    // Total Level
    // carrierだけ大きくする
    chip.write(0, 0x40);
    chip.write(1, 0x7f);

    chip.write(0, 0x44);
    chip.write(1, 0x7f);

    chip.write(0, 0x48);
    chip.write(1, 0x7f);

    chip.write(0, 0x4c);
    chip.write(1, 0x00);

    // Attack rate
    chip.write(0, 0x50);
    chip.write(1, 0x1f);

    chip.write(0, 0x54);
    chip.write(1, 0x1f);

    chip.write(0, 0x58);
    chip.write(1, 0x1f);

    chip.write(0, 0x5c);
    chip.write(1, 0x1f);

    // Sustain
    chip.write(0, 0x80);
    chip.write(1, 0x0f);

    chip.write(0, 0x84);
    chip.write(1, 0x0f);

    chip.write(0, 0x88);
    chip.write(1, 0x0f);

    chip.write(0, 0x8c);
    chip.write(1, 0x0f);

    //
    // Algorithm 7
    // 全Operatorがcarrier
    //
    chip.write(0, 0xb0);
    chip.write(1, 0x07);

    // L + R enable
    chip.write(0, 0xb4);
    chip.write(1, 0xc0);

    //
    // Frequency
    //
    chip.write(0, 0xa4);
    chip.write(1, 0x22);

    chip.write(0, 0xa0);
    chip.write(1, 0x69);

    //
    // Key ON
    // operators 1-4 ON, channel 0
    //
    chip.write(0, 0x28);
    chip.write(1, 0xf0);

    //
    // Generate 3 seconds
    //
    ymfm::ymfm_wavfile<2> wav(sampleRate);

    for (uint32_t i = 0; i < sampleRate * 3; i++)
    {
        ymfm::ym2612::output_data output;
        chip.generate(&output);
        wav.add(output);
    }

    std::cout << "generated wavlog-00.wav\n";

    return 0;
}

/*
em++ -std=c++14 \
    -Isrc \
    ex03_beep.cpp \
    src/*.cpp \
    -o test.js
./test.js
*/