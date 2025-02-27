from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import mediapipe as mp

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------ MediaPipe Setup ------------------
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True,  # Needed for iris landmarks
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)

# ----- Landmark indices -----
# Eye corners (same as your existing code, might vary slightly):
LEFT_EYE = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]

# Iris indices (available when refine_landmarks=True):
LEFT_IRIS = [469, 470, 471, 472]
RIGHT_IRIS = [474, 475, 476, 477]

def compute_ear(landmarks, indices, img_w, img_h):
    """Compute Eye Aspect Ratio for blink/closed-eye detection."""
    coords = [(landmarks[i].x * img_w, landmarks[i].y * img_h) for i in indices]
    # coords = [p1, p2, p3, p4, p5, p6]
    # vertical1 = distance(p2, p6)
    # vertical2 = distance(p3, p5)
    # horizontal = distance(p1, p4)
    vertical1 = np.linalg.norm(np.array(coords[1]) - np.array(coords[5]))
    vertical2 = np.linalg.norm(np.array(coords[2]) - np.array(coords[4]))
    horizontal = np.linalg.norm(np.array(coords[0]) - np.array(coords[3]))
    if horizontal == 0:
        return 0.0
    ear = (vertical1 + vertical2) / (2.0 * horizontal)
    return ear

def get_iris_center(landmarks, iris_indices, img_w, img_h):
    """Compute the center (x, y) of the iris by averaging its landmarks."""
    xs = []
    ys = []
    for i in iris_indices:
        xs.append(landmarks[i].x * img_w)
        ys.append(landmarks[i].y * img_h)
    return (np.mean(xs), np.mean(ys))

def get_eye_corners(landmarks, eye_indices, img_w, img_h):
    """Get leftmost and rightmost corners of an eye (approx)."""
    # We'll pick the min x as 'left corner' & max x as 'right corner'.
    # Indices vary, so double-check which points are corners in your Face Mesh map.
    coords = [(landmarks[i].x * img_w, landmarks[i].y * img_h) for i in eye_indices]
    xs = [p[0] for p in coords]
    left_corner_x = min(xs)
    right_corner_x = max(xs)
    return left_corner_x, right_corner_x

def is_looking_away(landmarks, img_w, img_h, threshold_left=0.3, threshold_right=0.7):
    """
    Determine if user is "looking away" horizontally using iris + eye corners.
    - threshold_left < ratio < threshold_right => "centered"
    - ratio <= threshold_left => "looking left"
    - ratio >= threshold_right => "looking right"
    This is a naive approach for horizontal gaze only.
    """
    # ----- Left Eye Gaze -----
    left_iris_center = get_iris_center(landmarks, LEFT_IRIS, img_w, img_h)
    left_eye_left_corner, left_eye_right_corner = get_eye_corners(landmarks, LEFT_EYE, img_w, img_h)
    
    # Avoid dividing by zero
    left_eye_width = (left_eye_right_corner - left_eye_left_corner) or 1e-6
    # ratio: (iris_x - left_corner) / eye_width
    left_ratio = (left_iris_center[0] - left_eye_left_corner) / left_eye_width
    
    # ----- Right Eye Gaze -----
    right_iris_center = get_iris_center(landmarks, RIGHT_IRIS, img_w, img_h)
    right_eye_left_corner, right_eye_right_corner = get_eye_corners(landmarks, RIGHT_EYE, img_w, img_h)
    
    right_eye_width = (right_eye_right_corner - right_eye_left_corner) or 1e-6
    right_ratio = (right_iris_center[0] - right_eye_left_corner) / right_eye_width
    
    # We'll just average the two eyes for a single measure
    gaze_ratio = (left_ratio + right_ratio) / 2.0
    
    # Check if it's out of the "center" range
    if gaze_ratio <= threshold_left:
        return True  # looking left => "away"
    if gaze_ratio >= threshold_right:
        return True  # looking right => "away"
    
    return False  # eye is "centered" => not away

@app.websocket("/ws/video")
async def websocket_video(websocket: WebSocket):
    """
    Advanced approach:
      - If no face => 'Looked away'
      - If EAR < 0.2 => 'Distracted' (eyes closed)
      - Else check gaze (iris center). If out of center => 'Looked away'
      - Otherwise => 'Focused'
    """
    await websocket.accept()
    
    EAR_THRESHOLD = 0.2

    try:
        while True:
            frame_bytes = await websocket.receive_bytes()

            # Decode to OpenCV image
            np_img = np.frombuffer(frame_bytes, np.uint8)
            frame = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
            if frame is None:
                await websocket.send_json({"status": "Looked away"})
                continue

            # Convert to RGB for MediaPipe
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = face_mesh.process(rgb_frame)

            if not results.multi_face_landmarks:
                # No face => "Looked away"
                await websocket.send_json({"status": "Looked away"})
                continue

            # We'll handle only the first face
            landmarks = results.multi_face_landmarks[0].landmark
            h, w = frame.shape[:2]

            # 1) Compute EAR for both eyes
            left_ear = compute_ear(landmarks, LEFT_EYE, w, h)
            right_ear = compute_ear(landmarks, RIGHT_EYE, w, h)
            avg_ear = (left_ear + right_ear) / 2.0

            if avg_ear < EAR_THRESHOLD:
                # Eyes closed => "Distracted"
                await websocket.send_json({
                    "eye_aspect_ratio": avg_ear,
                    "status": "Distracted"
                })
                continue

            # 2) Check gaze
            if is_looking_away(landmarks, w, h):
                # If off to the side => "Looked away"
                await websocket.send_json({
                    "eye_aspect_ratio": avg_ear,
                    "status": "Looked away"
                })
                continue

            # 3) Otherwise => "Focused"
            await websocket.send_json({
                "eye_aspect_ratio": avg_ear,
                "status": "Focused"
            })

    except Exception as e:
        print(f"WebSocket Error: {e}")
    finally:
        await websocket.close()
