import cv2
import torch
import numpy as np
import os
import sys
import time

def log(message, log_file):
    timestamp = time.strftime("[%Y-%m-%d %H:%M:%S]")
    with open(log_file, 'a') as f:
        f.write(f"{timestamp} {message}\n")
        f.flush()  # <-- THIS forces immediate write to disk
        os.fsync(f.fileno())  # <-- THIS helps ensure it's flushed to disk at OS level

def test_yolo_model_on_video(video_path, model_path, output_video_path):
    log_file = os.path.join(os.path.dirname(output_video_path), "process_log.txt")

    if not os.path.exists(video_path):
        log(f"ERROR: Video file not found at {video_path}", log_file)
        sys.exit(1)
    if not os.path.exists(model_path):
        log(f"ERROR: Model file not found at {model_path}", log_file)
        sys.exit(1)

    log("Loading YOLO model...", log_file)
    try:
        model = torch.hub.load('ultralytics/yolov5', 'custom', path=model_path, force_reload=True)
        model.conf = 0.25
        log("Model loaded successfully.", log_file)
    except Exception as e:
        log(f"ERROR loading model: {e}", log_file)
        sys.exit(1)

    log("Opening video file...", log_file)
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        log(f"ERROR: Could not open video file {video_path}", log_file)
        sys.exit(1)

    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30

    log(f"Video properties: {frame_width}x{frame_height} @ {fps} fps", log_file)

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_video_path, fourcc, fps, (frame_width, frame_height))

    frame_count = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            log("End of video or error reading frame.", log_file)
            break

        log(f"Processing frame {frame_count}...", log_file)

        try:
            results = model(frame[..., ::-1])
        except Exception as e:
            log(f"ERROR during detection on frame {frame_count}: {e}", log_file)
            break

        detections = results.xyxy[0]

        if detections is not None and len(detections):
            top_detection = detections[detections[:, 4].argsort(descending=True)][0]
            x1, y1, x2, y2, conf, cls = top_detection
            x1, y1, x2, y2 = map(int, (x1.item(), y1.item(), x2.item(), y2.item()))
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(frame, f'Object {conf:.2f}', (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

        out.write(frame)
        frame_count += 1

        if frame_count % 30 == 0:
            log(f"Processed {frame_count} frames...", log_file)

    cap.release()
    out.release()
    log(f"Done. Processed {frame_count} total frames.", log_file)
    log(f"Processed video saved to {output_video_path}", log_file)

if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.stderr.write("Usage: python process_video.py <video_path> <model_path> <output_video_path>\n")
        sys.exit(1)

    video_path = sys.argv[1]
    model_path = sys.argv[2]
    output_video_path = sys.argv[3]

    test_yolo_model_on_video(video_path, model_path, output_video_path)
