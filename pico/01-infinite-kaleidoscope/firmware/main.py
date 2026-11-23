"""USB CDC input for Weird Lab 001. Run this file or upload it as /main.py."""

from machine import Pin
from sys import stdout
from time import sleep_ms, ticks_diff, ticks_ms

CLK_PIN = 16
DT_PIN = 17
SW_PIN = 18
EDGES_PER_CLICK = 4  # Some KY-040 variants have two quadrature edges per detent.
DIRECTION = 1
DEBOUNCE_MS = 22
HOLD_MS = 700
POLL_MS = 1

# Index is previous A/B state followed by the current A/B state.
QUADRATURE = (0, -1, 1, 0, 1, 0, 0, -1, -1, 0, 0, 1, 0, 1, -1, 0)


class Encoder:
    def __init__(self, initial):
        self.previous = initial
        self.edges = 0

    def update(self, current):
        previous = self.previous
        self.previous = current
        if (previous ^ current) == 3:
            # Both bits changed between samples, so direction is ambiguous.
            self.edges = 0
            return 0
        self.edges += QUADRATURE[(previous << 2) | current]
        if abs(self.edges) == EDGES_PER_CLICK:
            delta = DIRECTION if self.edges > 0 else -DIRECTION
            self.edges = 0
            return delta
        return 0


class Button:
    def __init__(self, level, now):
        self.raw = level
        self.stable = level
        self.changed_at = now
        self.pressed_at = None
        self.sent_long = False

    def update(self, level, now):
        if level != self.raw:
            self.raw = level
            self.changed_at = now

        if self.raw != self.stable:
            # Confirm the candidate against the current sample, even after a USB stall.
            if ticks_diff(now, self.changed_at) < DEBOUNCE_MS:
                return None
            self.stable = self.raw
            if self.stable == 0:
                self.pressed_at = self.changed_at
                self.sent_long = False
            else:
                pressed_at = self.pressed_at
                self.pressed_at = None
                if pressed_at is None or self.sent_long:
                    return None
                duration = ticks_diff(self.changed_at, pressed_at)
                return "long" if duration >= HOLD_MS else "short"

        if (self.pressed_at is not None and not self.sent_long
                and ticks_diff(now, self.pressed_at) >= HOLD_MS):
            self.sent_long = True
            return "long"
        return None


def main():
    clk = Pin(CLK_PIN, Pin.IN, Pin.PULL_UP)
    dt = Pin(DT_PIN, Pin.IN, Pin.PULL_UP)
    sw = Pin(SW_PIN, Pin.IN, Pin.PULL_UP)
    encoder = Encoder((clk() << 1) | dt())
    button = Button(sw(), ticks_ms())

    while True:
        delta = encoder.update((clk() << 1) | dt())
        press = button.update(sw(), ticks_ms())

        packet = ""
        if press is not None:
            packet = '{"type":"press","kind":"%s"}\n' % press
        if delta:
            packet += '{"type":"rotate","delta":%d}\n' % delta

        if packet:
            # Sample again immediately after the USB write, which may block.
            stdout.write(packet)
        else:
            sleep_ms(POLL_MS)


if __name__ == "__main__":
    main()
