# PrintChain

**An automated 3D-printing production chain: a web control panel queues print jobs, and an imitation-learning-trained SO-101 robot arm clears each finished part off the print bed so the next job can start without a human.**

![status](https://img.shields.io/badge/status-hackathon%20prototype-orange)
![python](https://img.shields.io/badge/backend-FastAPI-009688)
![react](https://img.shields.io/badge/frontend-React%2019-61dafb)
![robot](https://img.shields.io/badge/robot-SO--101-blue)
![policy](https://img.shields.io/badge/policy-ACT-green)
![lerobot](https://img.shields.io/badge/framework-LeRobot-yellow)

<!-- TODO: add a hero GIF/photo of the arm clearing the bed + a screenshot of the web UI. Highest-impact thing you can add. Put them in docs/ and link here. -->

Built at the **LeRobot Hackathon 2026** (Vitoria-Gasteiz, 23-25 October 2026), organised by **Robotekin** in collaboration with **Hugging Face (LeRobot)**, **Bravo Robots** and other partners.

---

## Why PrintChain?

3D printing is slow, but a lot of the human time is spent on the repetitive bits around it: starting the next job and taking the finished part off the bed. PrintChain automates that loop. You load your G-code files into a queue, press **Start Chain**, and the system prints each part, calls the robot to remove it, and moves on to the next one.

The part-removal skill is **not hard-coded**. It is learned from human demonstrations (teleoperation) with imitation learning, using the open-source [LeRobot](https://github.com/huggingface/lerobot) framework on a low-cost [SO-101](https://github.com/TheRobotStudio/SO-ARM100) arm.

As a demo we queued parts of the SO-101 arm itself (a 4:1 gearbox ring gear and the upper arm), so the setup can in principle produce the parts of its own robot.

## How it works

```
 ┌────────────────────┐   REST + WebSocket   ┌──────────────────────────┐
 │  React web panel   │ ◄──────────────────► │  FastAPI backend         │
 │  upload .gcode,    │                      │  job queue + state       │
 │  reorder, pause,   │                      │  machine (async worker)  │
 │  live status       │                      └───────────┬──────────────┘
 └────────────────────┘                                  │ subprocess
                                                         ▼
                                           ┌──────────────────────────┐
                                           │  LeRobot rollout         │
                                           │  ACT policy (GPU)        │
                                           │  2 cameras ─► SO-101 arm │
                                           └──────────────────────────┘
```

The backend runs a small state machine over the queue:

1. **IDLE**: waits until there is a job in the queue and the chain is not paused.
2. **PRINTING**: pops the next job and runs its print cycle, broadcasting the remaining time to every connected client each second.
3. **ROBOT_MOVING**: launches the LeRobot rollout in a separate process (inside the `lerobot` conda environment) with the trained ACT policy; the arm clears the print bed. A 90 s timeout and a keyboard kill-switch (`q` / space) act as safeguards.
4. Back to **IDLE** and on to the next job.

> **Current scope.** In this hackathon prototype the *print stage is simulated*: each G-code file is looked up in `backend/data/gcode_db.json` for its display name, thumbnail and duration, and the backend counts that duration down. The printer itself is not yet driven over a real printer API, and the platform does not yet compute material or time forecasts from the G-code. The robot stage, however, runs the real trained policy on a real arm. See the [Roadmap](#roadmap).

## Features

- Drag-and-drop **reorderable job queue** (`@hello-pangea/dnd`)
- **G-code upload** with part metadata (name, thumbnail, duration)
- **Live system status** over WebSockets: idle / printing with progress bar / robot moving
- **Start/pause** the chain at any time; pausing waits for the robot to finish safely
- **Multilingual UI**: Catalan, Spanish, Basque and English
- **Learned robotic part removal** with an ACT policy, deployed through LeRobot

## The robot-learning part

| | |
|---|---|
| Robot | SO-101 follower arm (6 DoF), driven with a leader arm for demonstrations |
| Method | Imitation learning with **ACT** (Action Chunking with Transformers), which predicts short chunks of actions instead of single steps |
| Observations | 6-D joint state + two 640×480 RGB cameras (`cam_top`, `cam_wrist`) |
| Actions | 6-D joint targets |
| Dataset | [`aegrabs/so101_clear_plate`](https://huggingface.co/datasets/aegrabs/so101_clear_plate): 252 teleoperated episodes, 123,749 frames at 30 FPS |
| Model | [`aegrabs/act_so101_clear_plate`](https://huggingface.co/aegrabs/act_so101_clear_plate): 51.7 M parameters |
| Training | 40,000 steps, batch size 8, AdamW, learning rate 1e-5, LeRobot 0.6.2 |

The backend deploys the policy with `lerobot_rollout.py`, a modified copy of LeRobot's rollout entry point (Apache-2.0) that adds a keyboard stop. Reference: [ACT paper](https://arxiv.org/abs/2304.13705).

<!-- TODO: if you measured it, add a success rate (e.g. "cleared the bed in X of Y attempts"). Even a rough number is a strong point on a CV. -->

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, `@hello-pangea/dnd`, `lucide-react`, native WebSocket |
| Backend | Python, FastAPI, Uvicorn, WebSockets, asyncio |
| Robotics / ML | LeRobot, ACT policy, PyTorch (CUDA), OpenCV cameras, Hugging Face Hub |
| Hardware | SO-101 arm (Feetech STS3215 servos), 2 USB cameras, 3D printer |

## Repository structure

```
PrintChain/
├── backend/
│   ├── main.py              # FastAPI app: queue API, WebSocket, state machine, robot launcher
│   ├── lerobot_rollout.py   # Modified LeRobot rollout script (policy deployment)
│   ├── data/gcode_db.json   # Metadata for known G-code files (name, duration, thumbnail)
│   ├── images/              # Part thumbnails served at /images
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    └── src/
        ├── App.js
        ├── components/      # QueueList, SystemStatus, ProgressBar, ControlButton, ...
        ├── hooks/usePrintQueueWS.js
        ├── services/api.js
        └── locales/translations.js   # ca / es / eu / en
```

## Getting started

### Prerequisites

- Python 3.10+ and Node.js 18+
- A conda environment named `lerobot` with [LeRobot installed](https://huggingface.co/docs/lerobot) and a CUDA GPU for the policy
- An assembled and calibrated SO-101 follower arm and two cameras (see the [SO-101 guide](https://huggingface.co/docs/lerobot/so101))

### 1. Backend

```bash
cd backend
cp .env.example .env     # then edit the two paths below
pip install -r requirements.txt
uvicorn main:app --port 8000
```

`.env` needs:

```
CONDA_PYTHON=/path/to/miniconda3/envs/lerobot/bin/python3
ROBOT_SCRIPT_PATH=/path/to/PrintChain/backend/lerobot_rollout.py
```

Run `uvicorn` from inside `backend/`, since the app serves `images/` and `data/` relative to that folder.

### 2. Frontend

```bash
cd frontend
npm install
npm start                # http://localhost:3000
```

Optionally set `REACT_APP_API_URL` and `REACT_APP_WS_URL` (defaults: `http://localhost:8000` and `ws://localhost:8000/ws`).

### 3. Robot hardware settings

The serial port, camera indices and robot id are currently hard-coded in `run_robot_script()` in `backend/main.py` (`/dev/ttyACM1`, cameras `0` and `4`, id `follower_hackathon`). Change them to match your setup.

### Run only the robot policy

```bash
python backend/lerobot_rollout.py \
  --strategy.type=base \
  --robot.type=so101_follower --robot.port=/dev/ttyACM1 --robot.id=<your_id> \
  --robot.cameras='{"cam_top": {"type": "opencv", "index_or_path": 0, "width": 640, "height": 480, "fps": 30}, "cam_wrist": {"type": "opencv", "index_or_path": 4, "width": 640, "height": 480, "fps": 30}}' \
  --policy.path=aegrabs/act_so101_clear_plate --policy.device=cuda \
  --task="clear plate" --duration=90
```

## API

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/queue/upload` | Upload a `.gcode` file and add it to the queue |
| `POST` | `/api/queue/add` | Add a job (`id`, `name`, `duration_seconds`) |
| `POST` | `/api/queue/reorder` | Replace the queue order |
| `DELETE` | `/api/queue/delete/{job_id}` | Remove a queued job |
| `POST` | `/api/queue/pause` · `/api/queue/resume` | Pause / resume the chain |
| `WS` | `/ws` | Pushes the full system state (queue, current job, status, time left) |

## Roadmap

- [ ] Real printer integration (e.g. OctoPrint / Moonraker API) instead of the simulated print timer
- [ ] Parse G-code to estimate **print time and filament use** for a whole batch of parts with quantities
- [ ] Batch builder: part list with quantity and print settings
- [ ] Robot detects whether the bed is actually clear (closed-loop retry)
- [ ] Move hard-coded hardware settings to configuration
- [ ] Train a policy specifically for removing printed parts (current model: `clear plate`)

## Team

Built by **Lluís F. Collell**, **Pau Grabulosa** and **Pau Fontàs**.
<!-- TODO: add each person's role + links (GitHub / LinkedIn). -->

## Acknowledgements

Robotekin for organising the hackathon, [Hugging Face](https://huggingface.co/lerobot) and the LeRobot community, Bravo Robots and the other collaborators, and [TheRobotStudio](https://github.com/TheRobotStudio/SO-ARM100) for the open-source SO-101 design.

## License

<!-- TODO: pick a license and add a LICENSE file (MIT or Apache-2.0 are the usual choices). -->
`backend/lerobot_rollout.py` is derived from Hugging Face LeRobot and remains under the Apache License 2.0.
