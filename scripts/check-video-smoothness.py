#!/usr/bin/env python3
"""
scripts/check-video-smoothness.py
Measures video smoothness and stalls by computing mean absolute pixel differences
between consecutive frames scaled to 192x108 grayscale via ffmpeg and numpy.
"""

import sys
import os
import subprocess
import json
import numpy as np

WIDTH = 192
HEIGHT = 108
FRAME_BYTES = WIDTH * HEIGHT

# Storyboard Scene Boundaries in Seconds (Default for chog-swarm-demo-film.mp4)
DEFAULT_SCENES = [
    {"name": "Scene 0: Cold Open", "start": 0.0, "end": 8.0, "type": "motion", "hold_thresh": 1e-5},
    {"name": "Scene 1: Blocked Gate", "start": 8.0, "end": 32.0, "type": "motion", "hold_thresh": 1e-5},
    {"name": "Scene 2: Auth & Pick", "start": 32.0, "end": 58.0, "type": "motion", "hold_thresh": 1e-5},
    {"name": "Scene 3: Arena Simulation", "start": 58.0, "end": 86.0, "type": "motion", "hold_thresh": 1e-5},
    {"name": "Scene 4: Trait Lab", "start": 86.0, "end": 114.0, "type": "motion", "hold_thresh": 1e-5},
    {"name": "Scene 5: Daily Gauntlet", "start": 114.0, "end": 140.0, "type": "motion", "hold_thresh": 1e-5},
    {"name": "Scene 6: Leaderboard", "start": 140.0, "end": 160.0, "type": "motion", "hold_thresh": 1e-5},
    {"name": "Scene 7: Outro CTA", "start": 160.0, "end": 170.0, "type": "motion", "hold_thresh": 1e-5},
]

def analyze_video(video_path, scenes=None):
    if not os.path.exists(video_path):
        print(f"Error: File not found: {video_path}")
        sys.exit(1)

    # Get FPS and duration via ffprobe
    probe_cmd = [
        "ffprobe", "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=r_frame_rate,nb_frames,duration",
        "-show_entries", "format=duration",
        "-of", "json", video_path
    ]
    probe_res = subprocess.run(probe_cmd, capture_output=True, text=True, check=True)
    probe_data = json.loads(probe_res.stdout)
    stream = probe_data.get("streams", [{}])[0]
    
    # Calculate fps
    fps_str = stream.get("r_frame_rate", "60/1")
    if "/" in fps_str:
        num, den = fps_str.split("/")
        fps = float(num) / float(den)
    else:
        fps = float(fps_str)

    duration = float(probe_data.get("format", {}).get("duration", stream.get("duration", 0)))
    total_frames_est = int(round(duration * fps))

    print(f"\nAnalyzing: {video_path}")
    print(f"FPS: {fps:.2f} | Duration: {duration:.2f}s | Est. Frames: {total_frames_est}")

    # Launch ffmpeg to stream 192x108 grayscale raw frames
    ffmpeg_cmd = [
        "ffmpeg", "-v", "error",
        "-i", video_path,
        "-vf", f"scale={WIDTH}:{HEIGHT},format=gray",
        "-f", "rawvideo",
        "-pix_fmt", "gray",
        "-"
    ]

    proc = subprocess.Popen(ffmpeg_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, bufsize=FRAME_BYTES * 10)

    frame_diffs = []
    prev_frame = None
    frame_idx = 0

    while True:
        raw_bytes = proc.stdout.read(FRAME_BYTES)
        if len(raw_bytes) < FRAME_BYTES:
            break
        
        curr_frame = np.frombuffer(raw_bytes, dtype=np.uint8)
        if prev_frame is not None:
            # Mean absolute pixel difference normalized to 0.0 .. 1.0
            diff = np.mean(np.abs(curr_frame.astype(np.float32) - prev_frame.astype(np.float32))) / 255.0
            frame_diffs.append(diff)
        prev_frame = curr_frame
        frame_idx += 1

    proc.stdout.close()
    proc.wait()

    total_diff_frames = len(frame_diffs)
    print(f"Processed {total_diff_frames + 1} frames.")

    if not scenes:
        # Single clip mode
        scenes = [{"name": "Clip Full", "start": 0.0, "end": duration, "type": "motion", "hold_thresh": 1e-5}]

    print("\n" + "=" * 90)
    print(f"{'Scene':<26} | {'Span':<11} | {'Distinct%':<9} | {'Max Still (ms)':<14} | {'Gaps > 3f':<9} | {'Status'}")
    print("-" * 90)

    overall_pass = True

    for sc in scenes:
        start_f = int(round(sc["start"] * fps))
        end_f = min(int(round(sc["end"] * fps)), total_diff_frames)
        if start_f >= total_diff_frames:
            continue
        
        sc_diffs = frame_diffs[start_f:end_f]
        if not sc_diffs:
            continue

        thresh = sc["hold_thresh"]
        changed = [d > thresh for d in sc_diffs]
        distinct_ratio = (sum(changed) / len(changed)) * 100.0 if changed else 0.0

        # Compute stall runs (consecutive unchanged frames)
        max_run = 0
        current_run = 0
        gaps_over_3f = 0
        stalls_over_half_sec = []

        for i, chg in enumerate(changed):
            if not chg:
                current_run += 1
                if current_run > max_run:
                    max_run = current_run
            else:
                if current_run > 3:
                    gaps_over_3f += 1
                run_time_s = current_run / fps
                if run_time_s > 0.5:
                    stall_time = sc["start"] + (i - current_run) / fps
                    stalls_over_half_sec.append((stall_time, run_time_s))
                current_run = 0

        if current_run > 3:
            gaps_over_3f += 1
        if current_run / fps > 0.5:
            stall_time = sc["start"] + (len(changed) - current_run) / fps
            stalls_over_half_sec.append((stall_time, current_run / fps))

        max_still_ms = (max_run / fps) * 1000.0

        # Criteria
        scene_pass = True
        reasons = []

        if sc["type"] == "motion":
            if distinct_ratio < 95.0:
                scene_pass = False
                reasons.append(f"Distinct% {distinct_ratio:.1f}% < 95%")
            if max_run > 3:
                scene_pass = False
                reasons.append(f"Max gap {max_run}f ({max_still_ms:.0f}ms) > 3f (50ms)")
            if stalls_over_half_sec:
                scene_pass = False
                reasons.append(f"Stall > 0.5s at {stalls_over_half_sec[0][0]:.1f}s ({stalls_over_half_sec[0][1]:.2f}s)")
        else: # title_hold
            if stalls_over_half_sec:
                scene_pass = False
                reasons.append(f"Hold completely frozen > 0.5s at {stalls_over_half_sec[0][0]:.1f}s ({stalls_over_half_sec[0][1]:.2f}s)")

        status_str = "PASS" if scene_pass else f"FAIL ({', '.join(reasons)})"
        if not scene_pass:
            overall_pass = False

        span_str = f"{sc['start']:.1f}-{sc['end']:.1f}s"
        print(f"{sc['name']:<26} | {span_str:<11} | {distinct_ratio:>8.1f}% | {max_still_ms:>11.0f} ms | {gaps_over_3f:>9} | {status_str}")

    print("=" * 90)
    print(f"Overall Result: {'PASSED' if overall_pass else 'FAILED'}\n")
    return overall_pass

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/check-video-smoothness.py <video_path>")
        sys.exit(1)

    v_path = sys.argv[1]
    is_main_film = "chog-swarm-demo-film.mp4" in v_path
    scenes_to_use = DEFAULT_SCENES if is_main_film else None
    passed = analyze_video(v_path, scenes_to_use)
    sys.exit(0 if passed else 1)
