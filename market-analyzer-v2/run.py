import os
import threading
import cv2
import numpy as np
import dlib  # kept for compatibility / feature extraction
import time
from dotenv import load_dotenv
from twilio.rest import Client
from flask_socketio import emit
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import img_to_array
from app import create_app, socketio
from app.tasks_new import emit_market_updates, set_app

from werkzeug.utils import secure_filename
from flask import send_from_directory, request, jsonify, current_app, Response
from flask_cors import CORS
import pandas as pd
from pymongo import MongoClient
from bson.objectid import ObjectId
import json
from bson import json_util

# Optional service modules
try:
    from app.services import blink_detection, eyebrow_detection, emotion_recognition
    print("✅ Service modules imported: blink_detection, eyebrow_detection, emotion_recognition")
except ImportError as e:
    print(f"⚠️ Could not import service modules: {e}")
    blink_detection = None
    eyebrow_detection = None
    emotion_recognition = None

# 1. Load Environment Variables
load_dotenv()

# --- GLOBALS FOR VIDEO STREAMING ---
outputFrame = None
lock = threading.Lock()

# --- MONGODB CONNECTION SETUP ---
MONGO_URI = os.getenv("MONGO_URI")
mongo_client = None
users_collection = None

if MONGO_URI:
    try:
        mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        db = mongo_client.get_database()
        users_collection = db["users"]
        mongo_client.admin.command("ping")
        print("✅ MongoDB Connected Successfully")
    except Exception as e:
        print(f"❌ MongoDB Connection Failed: {e}")
        mongo_client = None
        users_collection = None
else:
    print("⚠️ MONGO_URI not found in .env file. Profile saving will not work.")

# 2. Setup Twilio Client
TWILIO_SID = os.getenv("TWILIO_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE = os.getenv("TWILIO_PHONE_NUMBER")

client = None
if TWILIO_SID and TWILIO_AUTH_TOKEN:
    try:
        client = Client(TWILIO_SID, TWILIO_AUTH_TOKEN)
        print("✅ Twilio Client Initialized")
    except Exception as e:
        print(f"⚠️ Twilio Error: {e}")
        client = None
else:
    print("⚠️ Twilio credentials missing in .env")

# 2.5 LOAD AI MODEL (camera stress) - NEW mini_XCEPTION checkpoint
model_path = os.path.join("datasets", "facial", "_mini_XCEPTION.102-0.66.hdf5")
emotion_model = None

if os.path.exists(model_path):
    try:
        # compile=False avoids legacy optimizer lr argument issues
        emotion_model = load_model(model_path, compile=False)
        print(f"✅ AI Model loaded successfully: {os.path.basename(model_path)}")
    except Exception as e:
        print(f"❌ Failed to load AI Model: {e}")
        emotion_model = None
else:
    print(f"⚠️ AI Model not found at: {model_path}")

# detector + label list (same 7-class FER mapping as training script)
detector = dlib.get_frontal_face_detector()
EMOTIONS = ["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"]

# Load dlib shape predictor for facial landmarks
shape_predictor_path = os.path.join("datasets", "facial", "shape_predictor_68_face_landmarks.dat")
predictor = None
if os.path.exists(shape_predictor_path):
    try:
        predictor = dlib.shape_predictor(shape_predictor_path)
        print(f"✅ Shape predictor loaded: {os.path.basename(shape_predictor_path)}")
    except Exception as e:
        print(f"⚠️ Failed to load shape predictor: {e}")
        predictor = None
else:
    print(f"⚠️ Shape predictor not found at: {shape_predictor_path}")

# --- HELPER: Compute blink metric from frame ---
def compute_blink_metric(gray_frame, frame_color):
    if predictor is None:
        return 0.5

    try:
        dets = detector(frame_color, 0)
        if len(dets) == 0:
            return 0.5

        detection = dets[0]
        shape = predictor(gray_frame, detection)

        left_eye = np.array([[shape.part(i).x, shape.part(i).y] for i in range(36, 42)])
        right_eye = np.array([[shape.part(i).x, shape.part(i).y] for i in range(42, 48)])

        def eye_aspect_ratio(eye):
            from scipy.spatial import distance as dist

            A = dist.euclidean(eye[1], eye[5])
            B = dist.euclidean(eye[2], eye[4])
            C = dist.euclidean(eye[0], eye[3])
            return (A + B) / (2.0 * C)

        left_ear = eye_aspect_ratio(left_eye)
        right_ear = eye_aspect_ratio(right_eye)
        avg_ear = (left_ear + right_ear) / 2.0

        blink_metric = np.clip((avg_ear - 0.15) / 0.25, 0.0, 1.0)
        return float(blink_metric)
    except Exception as e:
        print(f"⚠️ Blink metric error: {e}")
        return 0.5

# --- HELPER: Compute eyebrow metric from frame ---
def compute_eyebrow_metric(gray_frame, frame_color):
    if predictor is None:
        return 0.5

    try:
        dets = detector(gray_frame, 0)
        if len(dets) == 0:
            return 0.5

        detection = dets[0]
        shape = predictor(gray_frame, detection)

        left_brow = np.array([[shape.part(i).x, shape.part(i).y] for i in range(17, 22)])
        right_brow = np.array([[shape.part(i).x, shape.part(i).y] for i in range(22, 27)])

        from scipy.spatial import distance as dist

        brow_distance = dist.euclidean(left_brow[-1], right_brow[0])

        eyebrow_metric = 1.0 - np.clip(brow_distance / 100.0, 0.0, 1.0)
        return float(eyebrow_metric)
    except Exception as e:
        print(f"⚠️ Eyebrow metric error: {e}")
        return 0.5

# --- HELPER: Compute emotion recognition metric ---
def compute_emotion_from_service(gray_frame, frame_color):
    if emotion_recognition is None:
        return "neutral", 0.5

    try:
        dets = detector(gray_frame, 0)
        if len(dets) == 0:
            return "neutral", 0.5

        detection = dets[0]

        if hasattr(emotion_recognition, "emotion_finder"):
            emotion_label = emotion_recognition.emotion_finder(detection, gray_frame)
            if emotion_label == "stressed":
                stress_metric = 0.75
            else:
                stress_metric = 0.25
            return emotion_label, stress_metric
        else:
            return "neutral", 0.5

    except Exception as e:
        print(f"⚠️ Emotion recognition service error: {e}")
        return "neutral", 0.5

# --- LIVE STRESS ANALYZER (BACKGROUND THREAD) ---
def process_live_emotion():
    global emotion_model, outputFrame, lock

    if not emotion_model:
        print("❌ No model - emotion processing disabled")
        return

    cap = None
    for camera_idx in range(5):
        try:
            cap = cv2.VideoCapture(camera_idx, cv2.CAP_DSHOW)
            if cap.isOpened():
                ret, frame = cap.read()
                if ret and frame is not None:
                    print(f"✅ Camera found at index {camera_idx}...")
                    break
                else:
                    cap.release()
                    cap = None
        except Exception:
            cap = None

    if cap is None:
        cap = cv2.VideoCapture(0)
        if cap.isOpened():
            ret, frame = cap.read()
            if ret and frame is not None:
                print("✅ Camera works (default)...")
            else:
                print("❌ Camera not accessible!")
                return
        else:
            print("❌ Camera not accessible!")
            return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)

    frame_count = 0
    no_face_frames = 0
    NO_FACE_THRESHOLD = 10

    print("🎥🤖 LIVE STRESS ANALYSIS STARTED (Background)")

    while cap.isOpened():
        ret, frame_color = cap.read()
        if not ret or frame_color is None:
            time.sleep(0.1)
            continue

        # --- VIDEO STREAMING LOGIC ---
        # We capture the frame here and store it globally so /video_feed can read it.
        # We do this every frame for smooth video.
        with lock:
            outputFrame = frame_color.copy()

        # --- AI PROCESSING LOGIC ---
        # We only process stress every 3rd frame to save CPU
        frame_count += 1
        if frame_count % 3 != 0:
            continue

        try:
            gray = cv2.cvtColor(frame_color, cv2.COLOR_BGR2GRAY)
            mean_brightness = float(np.mean(gray))
            std_brightness = float(np.std(gray))

            if mean_brightness < 10 or std_brightness < 3:
                no_face_frames += 1
                if no_face_frames == NO_FACE_THRESHOLD:
                    socketio.emit(
                        "stress_update",
                        {
                            "level": 0.0,
                            "emotion": "NO FACE",
                            "confidence": 0.0,
                            "face_detected": False,
                            "timestamp": "NO_FACE",
                        },
                    )
                continue

            if no_face_frames >= NO_FACE_THRESHOLD:
                pass
            no_face_frames = 0

            resized = cv2.resize(gray, (64, 64))
            norm = resized.astype("float32") / 255.0
            norm = np.expand_dims(norm, axis=-1)
            arr = img_to_array(norm)
            arr = np.expand_dims(arr, axis=0)

            predictions = emotion_model.predict(arr, verbose=0)[0]
            stress_emotions = predictions[0:3]
            stress_level_model = float(np.mean(stress_emotions))

            emotion_idx = int(np.argmax(predictions))
            emotion_name = (
                EMOTIONS[emotion_idx] if 0 <= emotion_idx < len(EMOTIONS) else "unknown"
            )
            confidence = float(predictions[emotion_idx])

            blink_metric = compute_blink_metric(gray, frame_color)
            eyebrow_metric = compute_eyebrow_metric(gray, frame_color)
            service_emotion, service_stress = compute_emotion_from_service(
                gray, frame_color
            )

            fused_stress_level = float(
                np.clip(
                    0.40 * stress_level_model
                    + 0.20 * (1.0 - blink_metric)
                    + 0.20 * eyebrow_metric
                    + 0.20 * service_stress,
                    0.0,
                    1.0,
                )
            )

            has_face_frame = emotion_name != "NO FACE"
            if has_face_frame:
                no_face_frames = 0
            else:
                no_face_frames += 1

            face_detected_flag = no_face_frames < NO_FACE_THRESHOLD

            socketio.emit(
                "stress_update",
                {
                    "level": fused_stress_level if face_detected_flag else 0.0,
                    "emotion": emotion_name if face_detected_flag else "NO FACE",
                    "confidence": confidence if face_detected_flag else 0.0,
                    "face_detected": face_detected_flag,
                    "timestamp": "FULL_FRAME_MINI_XCEPTION_FUSED_WITH_SERVICES",
                    "debug": {
                        "model_stress": stress_level_model,
                        "blink_metric": blink_metric,
                        "eyebrow_metric": eyebrow_metric,
                        "service_emotion": service_emotion,
                        "service_stress": service_stress,
                    },
                },
            )

        except Exception as e:
            print(f"⚠️ Model error: {e}")

        # Small sleep to prevent CPU hogging
        time.sleep(0.01)

    cap.release()
    print("🛑 Camera stream ended")

# --- GENERATOR FOR MJPEG ROUTE ---
def generate_frames():
    global outputFrame, lock
    
    while True:
        with lock:
            if outputFrame is None:
                continue
            
            # Encode the frame in JPEG format
            (flag, encodedImage) = cv2.imencode(".jpg", outputFrame)
            
            if not flag:
                continue
        
        # Yield the output frame in the byte format
        yield(b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + 
              bytearray(encodedImage) + b'\r\n')

# 3. Create App Instance
app = create_app()

# enable CORS
CORS(
    app,
    resources={
        r"/api/*": {"origins": ["http://localhost:3000", "http://localhost:5173"]}
    },
)

if mongo_client is not None and not hasattr(app, "mongo_client"):
    app.mongo_client = mongo_client

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
STATIC_FOLDER = os.path.join(BASE_DIR, "static")
UPLOAD_FOLDER = os.path.join(STATIC_FOLDER, "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# --- NEW: VIDEO FEED ROUTE ---
@app.route("/video_feed")
def video_feed():
    # Returns the response generated along with the specific media type (mime type)
    return Response(generate_frames(), mimetype="multipart/x-mixed-replace; boundary=frame")

@app.route("/static/uploads/<path:filename>")
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route("/api/user/avatar", methods=["POST"])
def upload_avatar():
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file part"}), 400

        file = request.files["file"]
        email = request.form.get("email")

        if not email:
            return jsonify({"error": "Email missing"}), 400

        if not file or file.filename == "":
            return jsonify({"error": "Empty file"}), 400

        filename = secure_filename(f"{email}_{file.filename}")
        save_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(save_path)

        avatar_url = f"/static/uploads/{filename}"

        if users_collection is not None:
            try:
                users_collection.update_one(
                    {"email": email},
                    {"$set": {"avatar": avatar_url}},
                    upsert=True,
                )
            except Exception as e:
                print(f"⚠️ Mongo update error for avatar: {e}")

        return jsonify({"status": "success", "avatar_url": avatar_url})
    except Exception as e:
        print(f"❌ Upload Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/crypto/analyze", methods=["POST"])
def analyze_crypto_csv():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    f = request.files["file"]
    if f.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    try:
        df = pd.read_csv(f)

        if "price" not in df.columns:
            return jsonify({"error": 'CSV must contain a "price" column'}), 400

        prices = df["price"].astype(float)
        if prices.empty:
            return jsonify({"error": "No price data in CSV"}), 400

        first = float(prices.iloc[0])
        last = float(prices.iloc[-1])
        pct_change = ((last - first) / first) * 100 if first else 0.0

        pmin = float(prices.min())
        pmax = float(prices.max())
        if pmax > pmin:
            scores = ((prices - pmin) / (pmax - pmin)).tolist()
        else:
            scores = [0.5] * len(prices)

        series = []
        for i, row in df.iterrows():
            series.append(
                {
                    "index": int(i),
                    "price": float(row["price"]),
                    "score": float(scores[i]),
                    "date": str(row.get("date", "")) or "",
                }
            )

        return jsonify(
            {
                "status": "ok",
                "rows": len(df),
                "pct_change": pct_change,
                "price_min": pmin,
                "price_max": pmax,
                "series": series,
            }
        )

    except Exception as e:
        print(f"⚠️ Crypto CSV analysis error: {e}")
        return jsonify({"error": "Failed to analyze CSV"}), 500

# Start background tasks
emitter_thread = threading.Thread(target=emit_market_updates, daemon=True)
emitter_thread.start()

# --- START THE MODEL THREAD (Keeps Camera & AI alive in background) ---
if emotion_model:
    model_thread = threading.Thread(
        target=process_live_emotion,
        daemon=True,
        name="LIVE_EMOTION_MODEL_MINI_XCEPTION",
    )
    model_thread.start()
    print("🚀 LIVE MODEL THREAD STARTED")
else:
    print("⚠️ No model thread - check model path")

@socketio.on("report_high_stress")
def handle_high_stress(data):
    print(f"🚨 ALERT: {data.get('userName', 'User')} reported High Stress")

    socketio.emit("admin_receive_stress_alert", data)

    target_phone = data.get("hrPhone")

    if client and target_phone:
        try:
            message = client.messages.create(
                body=(
                    f"🚨 NEUROMETRIC ALERT: Employee {data.get('userName')} is "
                    f"experiencing High Stress (Level: {int(data.get('level', 0) * 100)}%). "
                    f"Please check the dashboard."
                ),
                from_=TWILIO_PHONE,
                to=target_phone,
            )
            print(f"✅ SMS sent: {message.sid}")
            emit("sms_sent_success", {"success": True})
        except Exception as e:
            print(f"❌ SMS Failed: {e}")
    else:
        if not client:
            print("ℹ️ SMS Skipped: Twilio not configured.")
        if not target_phone:
            print("ℹ️ SMS Skipped: No HR phone number provided in settings.")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"🚀 Starting SocketIO server on 0.0.0.0:{port}")
    socketio.run(app, host="0.0.0.0", port=port, debug=False)