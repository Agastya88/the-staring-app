To run the development server:
npm run dev

To run the backend:
python3 -m uvicorn eye_detection_api:app --host 0.0.0.0 --port 8000

Frontend: Next.js, React, WebSockets, user’s webcam
Backend: FastAPI (Python), Uvicorn, OpenCV, MediaPipe for face/eye detection
Communication: WebSockets for real-time frame transfer and status updates