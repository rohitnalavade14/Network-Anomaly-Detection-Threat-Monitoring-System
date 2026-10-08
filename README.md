# 🛡️ NetShield AI — Network Anomaly Detection & Threat Monitoring Platform

<p align="center">

AI-powered network security platform for detecting, classifying, scoring, and monitoring network threats in real time.

</p>

<p align="center">

<img src="https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white" />
<img src="https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white" />
<img src="https://img.shields.io/badge/React-19+-61DAFB?logo=react&logoColor=black" />
<img src="https://img.shields.io/badge/PostgreSQL-16+-4169E1?logo=postgresql&logoColor=white" />
<img src="https://img.shields.io/badge/Scikit--learn-Random%20Forest-F7931E?logo=scikit-learn&logoColor=white" />
<img src="https://img.shields.io/badge/WebSocket-Real--Time-4CAF50" />

</p>

> **NetShield AI** is an end-to-end AI-powered network security platform that analyzes network traffic, detects malicious activity, classifies attack types, calculates a multi-factor risk score, and generates actionable security alerts through a real-time monitoring dashboard.

---

## 🎯 System Architecture

```mermaid
flowchart LR

    A[🌐 Network Traffic] --> B[🧹 Preprocessing]

    B --> C[🤖 Model 1<br/>Binary Detection]

    C -->|BENIGN| D[✅ Benign Traffic]

    C -->|ATTACK| E[🤖 Model 2<br/>Attack Classification]

    E --> F[🎯 Attack Type]

    F --> G[⚠️ Risk Engine]

    G --> H[📊 Risk Score<br/>+ Severity]

    H --> I[🚨 Alert Generation]

    I --> J[(🗄️ PostgreSQL)]

    J --> K[🖥️ React Dashboard]

    I --> L[⚡ WebSocket]

    L --> K

    K --> M[👨‍💻 Security Analyst]


# ⚡ Quick Start

Follow the steps below to run **NetShield AI** locally.

## 1. Prerequisites

Make sure the following are installed:

- **Python 3.12+**
- **Node.js 18+**
- **npm**
- **PostgreSQL 16+**
- **Git**
- **Git LFS**

Check your installations:

```bash
python --version
node --version
npm --version
git --version
git lfs version
```

---

## 2. Clone the Repository

```bash
git clone <YOUR-GITHUB-REPOSITORY-URL>
cd Network-Anomaly-Detection-and-Predictive-Intrusion-Monitoring-Platform
```

---

## 3. Download the ML Models

NetShield uses Git LFS for the trained machine-learning model files.

Initialize Git LFS:

```bash
git lfs install
```

Download the tracked model files:

```bash
git lfs pull
```

The required files should be available inside:

```text
models/
├── model_random_forest.pkl
├── model_attack_classifier.pkl
├── binary_preprocessing_medians.pkl
├── feature_columns.pkl
└── risk_reference.pkl
```

---

## 4. Setup PostgreSQL

Make sure PostgreSQL is running on your computer.

Create the NetShield database:

```sql
CREATE DATABASE netshield_db;
```

The backend connects to PostgreSQL using the database configuration defined by the project.

> Make sure your PostgreSQL username, password, host, port, and database name match your local configuration.

---

## 5. Create Python Virtual Environment

From the **project root directory**:

### Windows PowerShell

```powershell
python -m venv venv
```

Activate the virtual environment:

```powershell
.\venv\Scripts\Activate.ps1
```

If PowerShell blocks script execution, run:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then activate again:

```powershell
.\venv\Scripts\Activate.ps1
```

---

## 6. Install Backend Dependencies

With the virtual environment activated:

```powershell
pip install -r requirements.txt
```

---

## 7. Initialize the Database

From the **project root**:

```powershell
python -m backend.init_db
```

This creates the required NetShield database tables.

---

## 8. Create the Admin Account

Run:

```powershell
python backend/create_admin.py
```

Follow the prompts to create the initial administrator account.

NetShield supports two roles:

```text
admin
security_analyst
```

The admin account can create additional security analyst accounts from the application.

---

# 🚀 Run the Backend

Open **Terminal 1**.

Make sure you are in the project root and the virtual environment is activated:

```powershell
.\venv\Scripts\Activate.ps1
```

Start the FastAPI server:

```powershell
uvicorn backend.main:app --reload
```

The backend will be available at:

```text
http://localhost:8000
```

FastAPI Swagger API documentation:

```text
http://localhost:8000/docs
```

Keep this terminal running.

---

# ⚛️ Run the Frontend

Open **Terminal 2**.

Go to the frontend directory:

```powershell
cd frontend
```

Install the frontend dependencies:

```powershell
npm install
```

Start the React development server:

```powershell
npm run dev
```

The frontend will be available at:

```text
http://localhost:5173
```

Keep this terminal running.

---

# 🖥️ Open NetShield AI

Open your browser and visit:

```text
http://localhost:5173
```

Log in using the admin account created during the database setup.

---

## 🔄 Running Architecture

You should have the following running:

```text
┌─────────────────────────────┐
│       PostgreSQL            │
│       pgAdmin 4             │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│       FastAPI Backend       │
│       localhost:8000        │
│                             │
│  ML Models                  │
│  Risk Engine                │
│  REST APIs                  │
│  WebSockets                 │
│  Authentication             │
└──────────────┬──────────────┘
               │
               │ REST / WebSocket
               ▼
┌─────────────────────────────┐
│       React Frontend        │
│       localhost:5173        │
│                             │
│  Dashboard                  │
│  Alerts                     │
│  Live Monitoring            │
│  CSV Upload                 │
│  Analytics                  │
└─────────────────────────────┘
```

### Terminal 1 — Backend

```powershell
.\venv\Scripts\Activate.ps1
uvicorn backend.main:app
```

### Terminal 2 — Frontend

```powershell
cd frontend
npm install
npm run dev
```

### Browser

```text
http://localhost:5173
```

---
.


