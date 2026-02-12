import cv2
import numpy as np
import firebase_admin
from firebase_admin import credentials, db
import time
import threading 

# --- CONFIGURATION ---
TOTAL_SPOTS = 70     
CONFIDENCE_THRESHOLD = 0.15 
VIDEO_FILE = "parking.mp4"

# --- GLOBAL STATE ---
# These variables are shared between the Video Player and the AI Brain
current_frame = None   # The latest image from the camera
latest_boxes = []      # The last known location of cars
latest_car_count = 0   
keep_running = True    # A switch to turn off both threads

# --- FIREBASE INITIALIZATION ---
if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred, {
        'databaseURL': 'https://smartparking-2226-default-rtdb.asia-southeast1.firebasedatabase.app' 
    })
    ref = db.reference('locations/place1')

# --- MODEL INITIALIZATION ---
# Load the pre-trained Mask R-CNN model
net = cv2.dnn.readNetFromTensorflow(
    "frozen_inference_graph.pb",
    "mask_rcnn_inception_v2_coco_2018_01_28.pbtxt"
)
net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
colors = np.random.uniform(0, 255, size=(100, 3))

def ai_background_worker():
    global current_frame, latest_boxes, latest_car_count, keep_running
    
    print("AI Brain: Started in background...")
    
    while keep_running:
        # wait for the first frame to be available
        if current_frame is None:
            time.sleep(0.1)
            continue

        # Create a local copy to avoid race conditions during processing (Snapshot) 
        frame_for_ai = current_frame.copy()
        height, width, _ = frame_for_ai.shape

        # Preprocess the frame for the neural network
        blob = cv2.dnn.blobFromImage(frame_for_ai, swapRB=True, crop=False)
        net.setInput(blob)

        # Run forward pass (detection)
        boxes, masks = net.forward(["detection_out_final", "detection_masks"])

        # Parse detections
        temp_boxes = []
        temp_count = 0
        
        for i in range(boxes.shape[2]):
            class_id = int(boxes[0, 0, i, 1])
            score = boxes[0, 0, i, 2]
            
            # Filter for vehicles (2=Car, 3=Motorcycle, 5=Bus, 7=Truck) with high confidence
            if score > CONFIDENCE_THRESHOLD and class_id in [2, 3, 5, 7]:
                box = boxes[0, 0, i, 3:7] * np.array([width, height, width, height])
                (startX, startY, endX, endY) = box.astype("int")
                temp_boxes.append((startX, startY, endX, endY, class_id))
                temp_count += 1
        
        # Update global state with new results
        latest_boxes = temp_boxes
        latest_car_count = temp_count

        # Sync data with Firebase Realtime Database
        try:
            free_spots = TOTAL_SPOTS - temp_count
            if free_spots < 0: free_spots = 0

            # Update 'occupied' count. 'reserved' is handled separately by the web app.
            ref.update({'occupied': temp_count, 'free': free_spots})
            
            print(f"AI Update: {temp_count} cars detected.")
        except Exception as e:
            print(f"Upload Error: {e}")

# --- THE MAIN LOOP (VIDEO PLAYER) ---
def main():
    global current_frame, keep_running

    # Start the Video
    cap = cv2.VideoCapture(VIDEO_FILE)

    # Initialize and start the AI processing thread
    ai_thread = threading.Thread(target=ai_background_worker, daemon=True)
    ai_thread.start()

    print("Video Player: Starting...")

    while True:
        ret, frame = cap.read()
        
        # Loop Video
        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue
        
        # Resize frame to standard resolution for consistency
        frame = cv2.resize(frame, (1280, 720))
        
        # Update the shared frame for the AI thread
        current_frame = frame

        # DRAW OVERLAYS
        # We draw whatever the "latest_boxes" are. 
        # Even if the AI is slow, we just keep drawing the old boxes until new ones arrive.
        # This keeps the video smooth!
        for (startX, startY, endX, endY, class_id) in latest_boxes:
            color = colors[class_id % len(colors)]
            cv2.rectangle(frame, (startX, startY), (endX, endY), color, 2)
            cv2.putText(frame, "Car", (startX, startY-5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)

        # Draw Dashboard UI
        cv2.rectangle(frame, (0, 0), (250, 80), (0, 0, 0), -1)
        cv2.putText(frame, f"Occupied: {latest_car_count}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
        cv2.putText(frame, f"Free: {TOTAL_SPOTS - latest_car_count}", (10, 65), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

        # Show Video
        cv2.imshow("Smart Parking System (Threaded)", frame)

        # Exit on 'q' key press
        if cv2.waitKey(30) & 0xFF == ord('q'):
            keep_running = False
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()