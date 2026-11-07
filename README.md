# AI-Powered Surveillance System

### Violent Behavior Detection and Unattended Object Monitoring Using Deep Learning

An AI-powered surveillance system designed to analyze CCTV video footage, identify suspicious or violent human activities, and monitor unattended or missing objects.

The system combines deep learning models with a web-based dashboard to support efficient video surveillance and security monitoring.

## Project Overview

Traditional CCTV surveillance often requires continuous human monitoring, which can be time-consuming and challenging when handling multiple video recordings.

This research explores how artificial intelligence and computer vision can assist surveillance operators by automatically analyzing video footage and identifying potentially suspicious events.

## Key Features

- **Violent Behavior Detection:** Analyzes human activities in video footage using deep learning.
- **Object Monitoring:** Uses YOLO-based object detection to monitor objects and identify potential unattended or missing objects.
- **Video Analysis:** Processes recorded surveillance footage.
- **Web Dashboard:** Provides a React-based interface for viewing surveillance information.
- **Event History:** Backend functionality for managing surveillance events and history.
- **REST API:** FastAPI backend for connecting AI processing with the frontend.

## Technologies Used

| Component | Technology |
|---|---|
| Programming Language | Python |
| Deep Learning | PyTorch |
| Object Detection | YOLOv8 |
| Computer Vision | OpenCV |
| Backend | FastAPI |
| Frontend | React, TypeScript |
| Build Tool | Vite |
| Database | SQLite |
| Containerization | Docker |

## Project Structure

```text
AI-Powered-Surveillance-System/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── ml/
│   │   │   ├── behavior/
│   │   │   └── object/
│   │   └── services/
│   ├── weights/
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend-reactjs/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── types/
│   ├── package.json
│   └── vite.config.js
│
├── docker-compose.yml
└── README.md
```

## Installation

### Prerequisites

- Python
- Node.js and npm
- Git
- Git LFS

### 1. Clone the repository

```bash
git lfs install
git clone https://github.com/Senurisoysa/AI-Powered-Surveillance-System.git
cd AI-Powered-Surveillance-System
git lfs pull
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
```

Activate the environment on Windows:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

### 3. Frontend setup

Open another terminal:

```bash
cd frontend-reactjs
npm install
npm run dev
```

The backend startup command and any required configuration should be checked against the application settings before deployment.

## AI Models

The project includes model weights managed using Git Large File Storage (Git LFS).

The model files include:

- `suspicious_behavior_model.pth`
- `yolov8n.pt`
- `yolov8m.pt`
- `yolov8s-world.pt`
- `yolov8x.pt`

## Research Objectives

1. Develop an AI-based approach for detecting suspicious and violent human activities.
2. Explore object detection techniques for monitoring unattended or missing objects.
3. Integrate AI processing into a user-friendly surveillance dashboard.
4. Support surveillance monitoring through automated video analysis.

## Future Improvements

- Improve detection accuracy across different surveillance environments.
- Reduce false alerts.
- Optimize video processing performance.
- Expand supported activity and object categories.

## Author

**Senuri Soysa**

Final-Year Research Project

## Repository

[GitHub – AI-Powered Surveillance System](https://github.com/Senurisoysa/AI-Powered-Surveillance-System)

---

*This project is developed for academic research and educational purposes.*
