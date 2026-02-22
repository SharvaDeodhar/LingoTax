# LinguaTax Backend

FastAPI backend for LinguaTax, providing multilingual tax assistance through RAG (Retrieval-Augmented Generation) using Gemini.

## Prerequisites

- Python 3.9+
- [Make](https://www.gnu.org/software/make/) (optional, but recommended)

## Setup and Installation

The easiest way to set up the backend is using the root `Makefile`:

```bash
# From the project root directory
make install-backend
```

This will create a virtual environment in `backend/.venv` and install all dependencies.

### Manual Setup (Inside `backend/` directory)

If you prefer to run commands manually:

1. **Create Virtual Environment:**
   ```bash
   python3 -m venv .venv
   ```

2. **Activate Virtual Environment:**
   ```bash
   source .venv/bin/activate
   ```

3. **Install Dependencies:**
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

## Running the Backend

### Using Make (From the project root)

```bash
make dev-backend
```

### Manually (Inside `backend/` directory)

1. **Activate Virtual Environment:**
   ```bash
   source .venv/bin/activate
   ```

2. **Run with Uvicorn:**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

The API will be available at `http://localhost:8000`. You can view the interactive documentation at `http://localhost:8000/docs`.

## Environment Variables

Ensure you have a `.env` file in the `backend/` directory with the following variables:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
FRONTEND_URL=http://localhost:3000
```
