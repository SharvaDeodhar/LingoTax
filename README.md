# LingoTax: Empowering Immigrants to Navigate US Taxes in Any Language

**Bridging the gap between complex IRS regulations and multilingual accessibility through Graph Neural Networks and RAG-powered LLMs.**

LingoTax is a world-class tax assistance platform designed specifically for the 45+ million immigrants in the United States. For non-native English speakers on F-1, J-1, or H-1B visas, the US tax system is a labyrinth of exclusionary jargon and high-stakes penalties. LingoTax solves this by combining high-precision machine learning (GNNs) with a multilingual Retrieval-Augmented Generation (RAG) pipeline to provide expert, actionable tax advice in the user's native tongue.

---

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PyTorch](https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?style=for-the-badge&logo=chainlink&logoColor=white)

---
##Team Name:
Anish n em

## Team Members:
Sharva Deodhar, Shirish Parasa, Anish Kajan, Tejas Naik
## 📖 Table of Contents
- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [The GNN Model — Technical Deep Dive](#the-gnn-model--technical-deep-dive)
- [Features Walkthrough](#features-walkthrough)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [HackAI 2026](#hackai-2026)
- [Future Work](#future-work)

---

## 🔴 The Problem
Every year, millions of immigrants—students on F-1 visas, researchers on J-1, and professionals on H-1B—struggle to file US taxes. The barriers are immense:
- **Language Exclusion**: IRS forms and instructions are primarily in complex "legalese" English.
- **Hidden Eligibility**: Many qualify for specific tax treaties (e.g., Article 21(c) for Indian students) or deductions (Student Loan Interest) but never claim them due to lack of awareness.
- **Costly Compliance**: Hiring a CPA is expensive, and generic tax software often fails to handle nonresident-specific forms like the 1040-NR or Form 8843 correctly.

This failure in accessibility leads to millions of dollars in unclaimed refunds and unintentional tax non-compliance.

---

## 🟢 The Solution
LingoTax addresses these barriers through three unified pillars:
1. **Interactive Dashboard & Checklist**: A dynamic, questionnaire-driven roadmap that identifies exactly which forms an immigrant needs based on their residency and visa type.
2. **Multilingual RAG Chat**: Users can upload tax documents (W-2s, 1098-Ts) and ask questions in **20+ languages**. The system cites specific boxes on their actual forms to explain exactly where to enter data.
3. **AI-Driven Prediction Engine**: A Graph Neural Network (GNN) analyzes the user's profile to predict eligibility for 8 critical tax deductions with high confidence, providing rationales that the LLM uses to explain the tax breaks.

---

## 💻 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons, Shadcn UI |
| **Backend** | FastAPI (Python 3.11), LangChain, Google Gemini 1.5 Flash, PyTorch |
| **Database** | Supabase (PostgreSQL), pgvector (Semantic Search), Supabase Auth |
| **Machine Learning** | PyTorch Geometric (GraphSAGE), Scikit-Learn (OHE/Scaling), Joblib |
| **Infrastructure** | Vercel (Frontend), Render/Local (Backend), Supabase Cloud |

---

## 🏗️ System Architecture

LingoTax follows a modular, RAG-centric architecture:

1.  **Ingestion & Vectorization**: When a user uploads a PDF, the backend parses the text and geometry. Chunks are embedded using Google’s `text-embedding-004` and stored in **Supabase** via `pgvector`.
2.  **Contextual Retrieval**: When a user asks a question, the system performs a cosine similarity search to retrieve the top-K most relevant document chunks.
3.  **GNN Inference**: Simultaneously, the backend pulls the user's latest questionnaire profile. It passes this 36-dimensional vector through the **GraphSAGE** model to predict deduction eligibility.
4.  **Prompt Synthesis**: The retrieval context, GNN predictions, and chat history are injected into a highly-tuned system prompt for **Gemini 1.5 Flash**.
5.  **Multilingual Generation**: Gemini generates a structured response in the user's requested language, including specific form line instructions (e.g., "W-2 Box 1").

---

## 🧠 The GNN Model — Technical Deep Dive

### The Motivation
Traditional tax software uses rigid "if-else" logic. In contrast, LingoTax uses a **Graph Neural Network (GNN)** to capture the latent relationships between user demographics (Visa types, income levels, residency states) and deduction patterns. This allows us to handle edge cases and provide "Probabilistic Guidance" where traditional rules might be too binary.

### Model Architecture
The model is a custom implementation of **GraphSAGE** (SAGEConv) combined with a **Bilinear Scoring Head**.

-   **Encoder Stage**: A 2-layer GraphSAGE network aggregates local structure to create a 64-dimensional user embedding $h_u$. 
-   **Projection Head**: For individual (non-graph) inference, we use a multi-layer perceptron (MLP) fallback.
-   **Bilinear Interaction**: We learn an embedding $e_d$ for each of the 8 deduction targets. The final probability is calculated as:
    $$\text{score}(u, d) = \sigma(h_u^T \cdot W_{bilinear} \cdot e_d)$$
    where $W_{bilinear}$ is a learnable weight matrix capturing complex interactions between user types and deduction categories.

### Mathematical Formulation
The GraphSAGE aggregation follows:
$$h_v^{(k)} = \sigma(W^{(k)} \cdot \text{concat}(h_v^{(k-1)}, \text{aggregate}(\{h_u^{(k-1)}, \forall u \in \mathcal{N}(v)\})))$$

The model is trained using **Binary Cross Entropy (BCE) Loss** to handle the multi-label nature of tax deductions (a user can qualify for multiple at once):
$$\mathcal{L} = -\frac{1}{N} \sum_{i=1}^{N} \sum_{j=1}^{D} [y_{ij} \log(\hat{y}_{ij}) + (1 - y_{ij}) \log(1 - \hat{y}_{ij})]$$

### Input Feature Engineering (36-Dimensions)
1.  **Categorical (One-Hot Encoded)**:
    -   `visa_type` (8 categories: F-1, H-1B, OPT, etc.)
    -   `filing_status` (5 categories: Single, MFJ, etc.)
    -   `state` (15 categories: CA, NY, TX, etc.)
2.  **Numerical (Standard Scaled)**:
    -   `income`, `dependents`, `years_in_us`, `student_loan_interest_paid`, `owns_home`, etc.

### Performance (gnn_v1)
*Metrics pulled from `model/models/metadata/gnn_v1.json`*
-   **Macro AUC**: 0.7683
-   **Best-in-class Predictions**:
    -   `foreign_tax_credit`: 0.9289 AUC
    -   `home_ownership_credit`: 0.9414 AUC
    -   `child_tax_credit`: 0.9007 AUC

### Synthetic Data Strategy
Because real IRS individual records are protected under Title 26, we developed a **Distribution-Aware Synthetic Generator** (`gen_synthetic.py`). It uses IRS SOI (Statistics of Income) distributions for 2022-2024 to sample realistic correlations (e.g., F-1 students having higher student loan interest probability than standard deduction probability).

---

## ✨ Features Walkthrough

### 1. Document Chat (with Visual Highlighting)
Upload a W-2 or 1040 and ask "How much tax did I pay?". LingoTax finds the answer in the document and **highlights the bounding box** on the PDF viewer in real-time.

### 2. General Tax AI Expert
Ask complex, multimodal questions like "I have a J-1 visa and I worked in CA and WA, what should I file?". The AI uses the GNN reasoning to suggest specific deductions like the *Foreign Tax Credit*.

### 3. Smart Checklist
Based on your questionnaire, the app automatically generates a "To-Do" list (e.g., "Prepare Form 8843", "Track Business Expenses for Schedule C") and links them to the correct document upload slots.

---

## 📂 Project Structure

```bash
LingoTax/
├── frontend/                # Next.js Application
│   ├── src/app/             # Pages (Auth, Dashboard, Chat)
│   ├── src/components/      # UI (PDF Viewer, MessageBubble)
│   └── src/lib/api/         # FastAPI Typed Client
├── backend/                 # FastAPI Services
│   ├── routers/             # API Endpoints (Chat, Docs, Tasks)
│   ├── services/            # GNN Integration & Document Ingestion
│   └── rag/                 # LangChain & Gemini Chains
├── model/                   # ML Training & Inference
│   ├── GNN_models/          # GraphSAGE Implementation
│   ├── train/               # Training Scripts
│   ├── data/                # Synthetic Generator
│   └── models/checkpoints/  # Saved Weights (.pt)
└── supabase/                # DB Migrations & Schema
```

---

## 🚀 Getting Started

### 1. Prerequisite Setup
-   Install **Python 3.11+** and **Node.js 20+**.
-   Create a **Supabase** project and enable the `pgvector` extension.
-   Get a **Google Gemini API Key**.

### 2. Backend & ML Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# Train GNN Model (Optional - Weights are included)
cd ../model
python train/train_gnn.py
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🔑 Environment Variables
| Key | Description | Source |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | Supabase Dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | Supabase Dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend-only Service Key | Supabase Dashboard |
| `GEMINI_API_KEY` | API Key for LLM & Embeddings | AI Studio |
| `NEXT_PUBLIC_FASTAPI_URL` | Backend URL (Default: http://localhost:8000) | Development |

---

## 🛠️ API Documentation

### `POST /chat`
Streams a multilingual RAG response based on a specific document.
- **Request**: `{ document_id: string, question: string, language: string }`
- **Streaming Response**: NDJSON events (`meta`, `status`, `sources`, `answer_token`).

### `GET /tasks/recommendations`
Returns personalized form and task recommendations based on tax profile.
- **Response**: List of forms from `forms_catalog` and generated `tasks`.

---

## 🎓 HackAI 2026
LingoTax was proudly built for **HackAI 2026** at **The Ohio State University**. 
**Track**: Artificial Intelligence for Social Good / Accessibility.
**Team**: Senior ML Engineers and Technical Writers at LingoTax.

---

## 🔮 Future Work
1.  **Integration with IRS Direct File**: Direct submission of generated returns via IRS APIs.
2.  **Fine-tuned Llama-3-Tax**: Training a smaller LLM on IRS Publication 17 for better "offline" reasoning.
3.  **Cross-State Nexus Detection**: Improved GNN modules for multi-state residents.
4.  **Audio-to-Audio Chat**: Allowing users to speak their questions and hear tax advice natively.
5.  **Optical Character Recognition (OCR) for Handwritten Receipts**: Extending RAG to non-digital audit trails.
