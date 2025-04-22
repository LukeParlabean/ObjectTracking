# -*- coding: utf-8 -*-
import sys
import os
import shutil
import subprocess
from pathlib import Path
import re

def log(msg):
    print(msg, flush=True)
    sys.stdout.flush()  # Ensure streaming output works properly

# Get absolute path to yolov5 folder (assumed at ../../yolov5 relative to this script)
def get_yolov5_path():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.abspath(os.path.join(script_dir, "..", "..", "yolov5"))

# Get current Python executable path
def get_python_exe():
    return sys.executable

# Create expected YOLOv5 folder structure
def create_yolo_folder_structure(base_dir):
    images_dir = os.path.join(base_dir, 'images')
    labels_dir = os.path.join(base_dir, 'labels')
    os.makedirs(images_dir, exist_ok=True)
    os.makedirs(labels_dir, exist_ok=True)
    return images_dir, labels_dir

# Write YOLOv5 data.yaml file
def write_data_yaml(data_dir, num_classes=1):
    yaml_path = os.path.join(data_dir, 'data.yaml')
    yaml_content = f"""train: {data_dir}/images
val: {data_dir}/images

nc: {num_classes}
names: ['object']
"""
    with open(yaml_path, 'w', encoding='utf-8') as f:
        f.write(yaml_content)
    return yaml_path

# Run the actual YOLOv5 training
def train_yolov5(data_yaml_path, model_output_dir, python_path='python'):
    log("Starting YOLOv5 training...")

    yolov5_dir = get_yolov5_path()
    train_script = os.path.join(yolov5_dir, "train.py")
    weights_path = os.path.join(yolov5_dir, "yolov5s.pt")

    command = [
        python_path, train_script,
        '--img', '640',
        '--batch', '16',
        '--epochs', '100',
        '--data', data_yaml_path,
        '--weights', weights_path,
        '--project', model_output_dir,
        '--name', 'final_model',
        '--exist-ok'
    ]

    log("Executing command: " + " ".join(command))

    process = subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    epoch_pattern = re.compile(r'^\s*(\d+)/(\d+)\s')  # matches " 0/99", " 1/99", etc.

    for line in process.stdout:
        match = epoch_pattern.match(line)
        if match:
            current, total = match.groups()
            log(f"Epoch {current}/{total}")
        elif "Training complete" in line:
            log("Training complete!")
        # You can also log setup warnings etc. here if needed

    process.stdout.close()
    process.wait()

    if process.returncode != 0:
        raise RuntimeError("Training failed. Check logs above.")

# Main method for script entrypoint
def main(frames_dir, labels_dir, output_dir):
    log("[1/4] Setting up folder structure...")
    yolo_data_dir = os.path.join(output_dir, "yolo_data")
    images_dir, yolo_labels_dir = create_yolo_folder_structure(yolo_data_dir)

    log("[2/4] Copying images and YOLO labels...")
    for file in os.listdir(frames_dir):
        if file.lower().endswith(('.jpg', '.png')):
            shutil.copy(os.path.join(frames_dir, file), os.path.join(images_dir, file))

    for file in os.listdir(labels_dir):
        if file.endswith('.txt'):
            shutil.copy(os.path.join(labels_dir, file), os.path.join(yolo_labels_dir, file))

    log("[3/4] Creating data.yaml config...")
    yaml_path = write_data_yaml(yolo_data_dir)

    log("[4/4] Running YOLOv5 training...")
    train_yolov5(yaml_path, output_dir, python_path=get_python_exe())

# Script entry
if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python train_pipeline.py <frames_dir> <labels_dir> <output_model_dir>", flush=True)
        sys.exit(1)

    frames_dir = sys.argv[1]
    labels_dir = sys.argv[2]
    output_dir = sys.argv[3]

    try:
        main(frames_dir, labels_dir, output_dir)
    except Exception as e:
        print(f"Error: {str(e)}", flush=True)
        sys.exit(1)
