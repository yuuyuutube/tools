import importlib.util
import json
from pathlib import Path
import sys
import types
import unittest
from unittest.mock import patch


TICK_PERIOD = 2 ** 30


def ticks_diff(now, then):
    return (now - then + TICK_PERIOD // 2) % TICK_PERIOD - TICK_PERIOD // 2


def load_firmware():
    fake_time = types.SimpleNamespace(
        sleep_ms=lambda _: None,
        ticks_ms=lambda: 0,
        ticks_diff=ticks_diff,
    )
    machine = types.SimpleNamespace(Pin=None)
    path = Path(__file__).resolve().parent.parent / "firmware" / "main.py"
    spec = importlib.util.spec_from_file_location("pico_firmware", path)
    firmware = importlib.util.module_from_spec(spec)
    with patch.dict(sys.modules, {"time": fake_time, "machine": machine}):
        spec.loader.exec_module(firmware)
    return firmware


firmware = load_firmware()


class EncoderTest(unittest.TestCase):
    def test_direction_and_contact_bounce(self):
        encoder = firmware.Encoder(3)
        cw = [1, 3, 1, 0, 2, 3]
        ccw = [2, 3, 2, 0, 1, 3]
        self.assertEqual([encoder.update(level) for level in cw], [0, 0, 0, 0, 0, 1])
        self.assertEqual([encoder.update(level) for level in ccw], [0, 0, 0, 0, 0, -1])

    def test_skipped_edge_discards_partial_step(self):
        encoder = firmware.Encoder(3)
        self.assertEqual([encoder.update(level) for level in [1, 2, 3, 1, 0]], [0] * 5)
        self.assertEqual(encoder.update(2), 1)

    def test_fast_alternating_detents_remain_individual_steps(self):
        encoder = firmware.Encoder(3)
        levels = [1, 0, 2, 3] * 3 + [2, 0, 1, 3] * 2
        deltas = [delta for level in levels * 25 if (delta := encoder.update(level))]
        self.assertEqual(deltas, [1, 1, 1, -1, -1] * 25)


class ButtonTest(unittest.TestCase):
    def events(self, samples, start=0, initial=1):
        button = firmware.Button(initial, start)
        return [(now, event) for level, now in samples if (event := button.update(level, now))]

    def test_single_short_press_despite_bounce_and_ticks_wrap(self):
        t = TICK_PERIOD
        samples = [(0, t - 45), (1, t - 43), (0, t - 41), (0, 3), (1, 90),
                   (0, 92), (1, 94), (1, 115), (1, 116), (1, 900)]
        self.assertEqual(self.events(samples, t - 50), [(116, "short")])

    def test_hold_emits_at_700ms_and_does_not_repeat_or_emit_on_release(self):
        samples = [(0, 10), (0, 35), (0, 709), (0, 710), (0, 1000),
                   (1, 1200), (0, 1203), (1, 1205), (1, 1230)]
        self.assertEqual(self.events(samples), [(710, "long")])

    def test_release_near_threshold_uses_observed_release_time(self):
        confirmed_press = [(0, 10), (0, 32)]
        short = confirmed_press + [(1, 709), (1, 900)]
        long = confirmed_press + [(1, 710), (1, 900), (1, 930)]
        self.assertEqual(self.events(short), [(900, "short")])
        self.assertEqual(self.events(long), [(900, "long")])

    def test_stale_single_sample_does_not_become_a_press_after_a_stall(self):
        self.assertEqual(self.events([(0, 10), (1, 800), (1, 825)]), [])

    def test_press_held_at_boot_is_ignored(self):
        self.assertEqual(self.events([(0, 1500), (1, 1600), (1, 1630)], initial=0), [])


class FirmwareLoopTest(unittest.TestCase):
    def run_loop(self, changes, end_ms, write_delays=(), sleep_jitter=()):
        clock = 0
        levels = {16: 1, 17: 1, 18: 1}
        pins = set()
        changes = iter(sorted(changes, key=lambda change: change[0]))
        next_change = next(changes, None)
        write_delays = iter(write_delays)
        sleep_jitter = iter(sleep_jitter)
        writes = []
        test = self

        class MockPin:
            IN = 0
            PULL_UP = 1

            def __init__(self, number, mode, pull):
                test.assertEqual((mode, pull), (self.IN, self.PULL_UP))
                pins.add(number)
                self.number = number

            def __call__(self):
                return levels[self.number]

        def advance(duration):
            nonlocal clock, next_change
            clock += duration
            while next_change is not None and next_change[0] <= clock:
                _, pin_number, level = next_change
                levels[pin_number] = level
                next_change = next(changes, None)
            if clock >= end_ms:
                raise KeyboardInterrupt

        def sleep_ms(duration):
            self.assertEqual(duration, 1)
            advance(duration + next(sleep_jitter, 0))

        def write(packet):
            self.assertTrue(packet.endswith("\n"))
            writes.append((clock, [json.loads(line) for line in packet.splitlines()]))
            advance(next(write_delays, 0))

        with patch.multiple(firmware, Pin=MockPin, sleep_ms=sleep_ms,
                            ticks_ms=lambda: clock, stdout=types.SimpleNamespace(write=write)):
            with self.assertRaises(KeyboardInterrupt):
                firmware.main()
        self.assertEqual(pins, set(levels))
        return writes

    def test_rapid_inputs_write_only_one_json_line_per_step_or_press(self):
        changes = [
            (2, 16, 0), (4, 17, 0), (6, 16, 1), (8, 17, 1),
            (10, 16, 0), (12, 17, 0), (14, 16, 1), (16, 17, 1),
            (18, 17, 0), (20, 16, 0), (22, 17, 1), (24, 16, 1),
            (28, 18, 0), (29, 18, 1), (31, 18, 0),
            (58, 18, 1), (60, 18, 0), (63, 18, 1),
            (92, 18, 0), (121, 18, 1),
        ]
        self.assertEqual(self.run_loop(changes, 155, write_delays=[2, 2, 2]), [
            (8, [{"type": "rotate", "delta": 1}]),
            (16, [{"type": "rotate", "delta": 1}]),
            (24, [{"type": "rotate", "delta": -1}]),
            (85, [{"type": "press", "kind": "short"}]),
            (143, [{"type": "press", "kind": "short"}]),
        ])

    def test_usb_stall_can_erase_encoder_edges_but_long_press_stays_single(self):
        changes = [
            (25, 18, 0),
            (704, 16, 0), (706, 17, 0), (708, 16, 1), (710, 17, 1),
            (713, 16, 0), (715, 17, 0), (717, 16, 1), (719, 17, 1),
            (739, 18, 1),
        ]
        self.assertEqual(self.run_loop(changes, 830, write_delays=[45]), [
            (710, [{"type": "rotate", "delta": 1}]),
            (777, [{"type": "press", "kind": "long"}]),
        ])

    def test_simultaneous_press_and_rotate_use_one_write_and_two_lines(self):
        changes = [
            (5, 18, 0), (699, 16, 0), (701, 17, 0), (703, 16, 1),
            (705, 17, 1), (760, 18, 1),
        ]
        self.assertEqual(self.run_loop(changes, 805, sleep_jitter=[0, 3]), [
            (705, [{"type": "press", "kind": "long"}, {"type": "rotate", "delta": 1}]),
        ])


if __name__ == "__main__":
    unittest.main()
