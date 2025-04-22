import cv2
import os
import sys

def extract_n_frames(video_path, output_dir, n_frames):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    video = cv2.VideoCapture(video_path)

    if not video.isOpened():
        print("Error: Could not open video.")
        return

    total_frames = int(video.get(cv2.CAP_PROP_FRAME_COUNT))
    if n_frames > total_frames:
        n_frames = total_frames

    step = total_frames // n_frames
    saved_count = 0

    for i in range(n_frames):
        frame_number = i * step
        video.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
        success, frame = video.read()
        if success:
            filename = os.path.join(output_dir, f"frame_{saved_count:04d}.jpg")
            cv2.imwrite(filename, frame)
            saved_count += 1

    video.release()
    print(f"Extracted {saved_count} frames to {output_dir}")

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python extract_frames.py <video_path> <output_dir> <n_frames>")
        sys.exit(1)

    video_path = sys.argv[1]
    output_dir = sys.argv[2]
    n_frames = int(sys.argv[3])

    extract_n_frames(video_path, output_dir, n_frames)