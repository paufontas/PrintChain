import os
import asyncio
import json
import time
from typing import List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Path to metadata JSON inside the 'data' directory
DB_FILE_PATH = os.path.join(os.path.dirname(__file__), "data", "gcode_db.json")

def load_gcode_database() -> dict:
    """Loads the GCODE metadata database from the JSON file."""
    if os.path.exists(DB_FILE_PATH):
        try:
            with open(DB_FILE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error reading {DB_FILE_PATH}: {e}")
            return {}
    return {}

app = FastAPI()

# Ensure local directories for images and data exist
os.makedirs("images", exist_ok=True)
os.makedirs("data", exist_ok=True)

# Serve static images under the '/images' HTTP route
app.mount("/images", StaticFiles(directory="images"), name="images")

# Enable CORS middleware for frontend connection (React)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data model for queue item REST requests
class PrintJob(BaseModel):
    id: str
    name: str
    duration_seconds: int

class PrintManager:
    """Global print queue state manager and WebSocket broadcaster"""
    def __init__(self):
        self.queue: List[dict] = []
        self.current_job: dict = None
        self.status: str = "IDLE" # IDLE, PRINTING, ROBOT_MOVING
        self.time_left: int = 0
        self.is_paused: bool = True # Paused by default on startup
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        # Send current system state immediately to new connections
        await self.send_state(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    def get_state(self):
        return {
            "queue": self.queue,
            "current_job": self.current_job,
            "status": self.status,
            "time_left": self.time_left,
            "is_paused": self.is_paused
        }

    async def send_state(self, websocket: WebSocket):
        try:
            await websocket.send_text(json.dumps(self.get_state()))
        except Exception:
            pass

    async def broadcast_state(self):
        """Broadcasts updated state to all connected clients"""
        for connection in list(self.active_connections):
            try:
                await connection.send_text(json.dumps(self.get_state()))
            except Exception:
                self.disconnect(connection)

manager = PrintManager()

def run_robot_script():
    """Simulates physical execution script for the robotic arm (for now)"""
    print("ROBOT:    Starting part removal procedure...")
    time.sleep(8) # Simulation delay for robotic arm operation
    print("ROBOT:    Part successfully removed! Ready for next job.")

async def print_queue_worker():
    while True:
        # Start processing when items exist, system is IDLE, and not paused
        if manager.queue and manager.status == "IDLE" and not manager.is_paused:
            
            # 1. Pop first job from queue
            manager.current_job = manager.queue.pop(0)
            manager.status = "PRINTING"
            manager.time_left = int(manager.current_job["duration_seconds"])
            await manager.broadcast_state()

            # 2. 3D printing execution cycle
            while manager.time_left > 0:
                await asyncio.sleep(1)
                manager.time_left -= 1
                await manager.broadcast_state()

            # 3. Robot activation cycle
            manager.status = "ROBOT_MOVING"
            await manager.broadcast_state()

            await asyncio.to_thread(run_robot_script)

            # 4. Cycle completed -> Return to IDLE state
            manager.current_job = None
            manager.status = "IDLE"
            await manager.broadcast_state()

        await asyncio.sleep(1)

@app.on_event("startup")
async def startup_event():
    # Start background queue worker on FastAPI server startup
    asyncio.create_task(print_queue_worker())

@app.post("/api/queue/add")
async def add_job(job: PrintJob):
    manager.queue.append(job.dict())
    await manager.broadcast_state()
    return {"message": "Job added to queue"}

@app.post("/api/queue/reorder")
async def reorder_queue(new_queue: List[dict]):
    manager.queue = new_queue
    await manager.broadcast_state()
    return {"message": "Queue reordered"}

@app.delete("/api/queue/delete/{job_id}")
async def delete_job(job_id: str):
    manager.queue = [j for j in manager.queue if j["id"] != job_id]
    await manager.broadcast_state()
    return {"message": "Job deleted"}

@app.post("/api/queue/pause")
async def pause_queue():
    manager.is_paused = True
    await manager.broadcast_state()
    return {"message": "Queue paused"}

@app.post("/api/queue/resume")
async def resume_queue():
    manager.is_paused = False
    await manager.broadcast_state()
    return {"message": "Queue resumed"}

@app.post("/api/queue/upload")
async def upload_gcode(file: UploadFile = File(...)):
    filename = file.filename
    gcode_db = load_gcode_database() # Read metadata directly from JSON
    
    if filename in gcode_db:
        meta = gcode_db[filename]
        job = {
            "id": f"{filename}-{int(time.time())}",
            "filename": filename,
            "name": meta.get("name", filename),
            "duration_seconds": meta.get("duration_seconds", 10),
            "image_url": meta.get("image_url", "http://localhost:8000/images/default.png")
        }
    else:
        # Fallback values for unregistered .gcode files
        job = {
            "id": f"{filename}-{int(time.time())}",
            "filename": filename,
            "name": f"File: {filename}",
            "duration_seconds": 12,
            "image_url": "http://localhost:8000/images/default.png"
        }

    manager.queue.append(job)
    await manager.broadcast_state()
    
    return {"message": ".gcode file added to queue successfully", "job": job}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
