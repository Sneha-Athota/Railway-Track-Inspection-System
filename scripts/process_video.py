import cv2
from PIL import Image
import os
from io import BytesIO
import tempfile
import sys
import torch
import timm
import torchvision.transforms as transforms
import requests
import json
import time
import io

#!pip install azure-storage-blob

from azure.storage.blob import BlobServiceClient

# ---------- CONFIGURATION ----------
CONNECTION_STRING = "DefaultEndpointsProtocol=https;AccountName=railfault;AccountKey=xxx;EndpointSuffix=core.windows.net"
VIDEO_CONTAINER_NAME = "trackvideo"
IMAGE_CONTAINER_NAME = "trackimages"
FAULT_CONTAINER_NAME = "faultimagecontainer"
MODEL_CONTAINER_NAME = "models"
INTERVAL = 30
TARGET_SIZE = (224, 224)
model_name = "railway_fault_model1.pth"

blob_service_client = BlobServiceClient.from_connection_string(CONNECTION_STRING)
image_container_client = blob_service_client.get_container_client(container=IMAGE_CONTAINER_NAME)
# -----------------------------------

def extract_and_upload_frames(video_name):
    # Setup Azure Blob clients
    video_blob_client = blob_service_client.get_blob_client(container=VIDEO_CONTAINER_NAME, blob=video_name)
    base_name = os.path.splitext(video_name)[0]
    # Download video blob to a temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_video_file:
        temp_video_path = temp_video_file.name
        print(f"⬇️ Downloading video '{video_name}' from blob...")
        video_blob_client.download_blob().readinto(temp_video_file)

    print(f"📼 Video downloaded to: {temp_video_path}")
    
    # Extract frames using OpenCV
    cap = cv2.VideoCapture(temp_video_path)
    if not cap.isOpened():
        print(f"❌ Error: Failed to open video {video_name}")
        return

    frame_count = 0
    uploaded_count = 0

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_count % INTERVAL == 0:
                try:
                    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    img = Image.fromarray(rgb)
                    resized = img.resize(TARGET_SIZE, Image.Resampling.LANCZOS if hasattr(Image, 'Resampling') else Image.LANCZOS)

                    buffer = BytesIO()
                    resized.save(buffer, format="JPEG")
                    buffer.seek(0)

                    blob_name = f"{base_name}_frame_{frame_count:06d}.jpg"
                    image_container_client.upload_blob(name=blob_name, data=buffer, overwrite=True)
                    uploaded_count += 1
                except Exception as e:
                    print(f"⚠️ Error at frame {frame_count}: {e}")

            frame_count += 1

    finally:
        cap.release()
        os.remove(temp_video_path)
    print(f"✅ Uploaded {uploaded_count} frames from '{video_name}' to blob container '{IMAGE_CONTAINER_NAME}'")
    detectFaults()

# -----------------------------------
# Call the function to identify the defected railway tracks
# -----------------------------------
local_model_path = "temp_model.pth"
def detectFaults():
    try:
        model_blob_client = blob_service_client.get_blob_client(container=MODEL_CONTAINER_NAME, blob=model_name)
        with open(local_model_path, "wb") as download_file:
            download_file.write(model_blob_client.download_blob().readall())
        print(f"✅ Model downloaded from Blob Storage to: {local_model_path}")
    except Exception as e:
        print(f"❌ Error downloading model from Blob Storage: {e}")
        return

    # Load model
    model = timm.create_model('tiny_vit_21m_224', pretrained=False)
    if hasattr(model.head, 'fc'):
        model.head.fc = torch.nn.Linear(model.head.fc.in_features, 1)
    else:
        model.head = torch.nn.Linear(model.head.in_features, 1)

    try:
        model.load_state_dict(torch.load(local_model_path, map_location=torch.device('cpu')), strict=False)
    except RuntimeError as e:
        print(f"❌ Error loading model weights: {e}")
        return

    model.eval()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)

    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    defected_images = []
    image_container_client = blob_service_client.get_container_client(container=IMAGE_CONTAINER_NAME)
    blob_list = image_container_client.list_blobs()

    for blob in blob_list:
        if blob.name.lower().startswith(track_name.lower()) and blob.name.lower().endswith(('.jpg', '.jpeg', '.png')):
            blob_client = blob_service_client.get_blob_client(container=IMAGE_CONTAINER_NAME, blob=blob.name)
            blob_data = blob_client.download_blob().readall()

            image = Image.open(io.BytesIO(blob_data)).convert("RGB")
            filename = blob.name
            input_tensor = transform(image).unsqueeze(0).to(device)

            with torch.no_grad():
                output = model(input_tensor)

            output = output.squeeze()
            prediction = torch.sigmoid(output).item()
            threshold = 0.5

            if prediction < threshold:
                defected_images.append((filename, prediction))
                try:
                    fault_blob_client = blob_service_client.get_blob_client(container=FAULT_CONTAINER_NAME, blob=filename)
                    image_data_stream = io.BytesIO(blob_data)
                    image_data_stream.seek(0)
                    fault_blob_client.upload_blob(image_data_stream, overwrite=True)
                    print(f"✅ Uploaded {filename} to fault container.")
                except Exception as e:
                    print(f"❌ Error uploading to Blob Storage: {e}")

    if defected_images:
        print("\n🚨 Defected Railway Tracks Detected:")
        for img, conf in defected_images:
            print(f"- {img} (Confidence: {conf:.4f})")
    else:
        print("\n✅ No defected tracks found.")

    print(f"\n📦 Total Defected Images Saved: {len(defected_images)}")

    # API Payload
    api_data = {
        "trackName": track_name,
        "numberofFaults": len(defected_images),
        "faultImages": [],
        "imageContainer": FAULT_CONTAINER_NAME,
        "trackVideo": f"{track_name}.MP4",
        "videoContainer": VIDEO_CONTAINER_NAME
    }

    for img_name, conf in defected_images:
        current_time_milliseconds = int(time.time() * 1000)
        confidence = 1 - conf
        api_data["faultImages"].append({
            "image": img_name,
            "description": f"Fault detected with confidence {confidence:.4f}",
            "timestamp": current_time_milliseconds
        })

    # Send to API
    api_endpoint = "http://localhost:5001/api/fault-report"
    headers = {'Content-Type': 'application/json'}

    try:
        payload = json.dumps(api_data)
        response = requests.post(api_endpoint, headers=headers, data=payload)
        response.raise_for_status()
        print("📨 API call successful!")
    except requests.exceptions.RequestException as e:
        print(f"❌ Error during API call: {e}")
        return


track_name = sys.argv[1]
print(f"📺 Processing video for track: {track_name}")

video_filename = track_name + ".MP4"
extract_and_upload_frames(video_filename)
