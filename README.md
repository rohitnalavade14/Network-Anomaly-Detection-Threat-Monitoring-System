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
<img src="https://img.shields.io/badge/Docker-Deployment-2496ED?logo=docker&logoColor=white" />
<img src="https://img.shields.io/badge/License-MIT-yellow.svg" />

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
