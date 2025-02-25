from fastapi import FastAPI, WebSocket
import cv2
import numpy as np
import mediapipe as mp

app = FastAPI()

# Initialize MediaPipe Face Mesh
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(max_num_faces=1, refine_landmarks=True, min_detection_confidence=0.5)

# Landmark indices for eyes
LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144]
RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380]

def compute_ear(landmarks, indices, img_width, img_height):
    """ Calculate the Eye Aspect Ratio (EAR) to detect if eyes are closed """
    coords = [(landmarks[i].x * img_width, landmarks[i].y * img_height) for i in indices]
    vertical1 = np.linalg.norm(np.array(coords[1]) - np.array(coords[5]))
    vertical2 = np.linalg.norm(np.array(coords[2]) - np.array(coords[4]))
    horizontal = np.linalg.norm(np.array(coords[0]) - np.array(coords[3]))

    if horizontal == 0:
        return 0
    return (vertical1 + vertical2) / (2.0 * horizontal)

@app.websocket("/ws/video")
async def websocket_video(websocket: WebSocket):
    """ Handle real-time video feed from the frontend via WebSocket """
    await websocket.accept()
    
    try:
        while True:
            # Receive frame bytes
            frame_bytes = await websocket.receive_bytes()

            # Convert bytes to OpenCV image
            np_img = np.frombuffer(frame_bytes, np.uint8)
            frame = cv2.imdecode(np_img, cv2.IMREAD_COLOR)

            # Convert image to RGB for MediaPipe
            img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = face_mesh.process(img_rgb)

            if results.multi_face_landmarks:
                landmarks = results.multi_face_landmarks[0].landmark
                height, width = frame.shape[:2]

                left_ear = compute_ear(landmarks, LEFT_EYE_INDICES, width, height)
                right_ear = compute_ear(landmarks, RIGHT_EYE_INDICES, width, height)
                avg_ear = (left_ear + right_ear) / 2.0

                status = "Distracted" if avg_ear < 0.2 else "Focused"

                await websocket.send_json({"eye_aspect_ratio": avg_ear, "status": status})
            else:
                await websocket.send_json({"error": "No face detected"})
    
    except Exception as e:
        print(f"Error: {e}")
        await websocket.close()
