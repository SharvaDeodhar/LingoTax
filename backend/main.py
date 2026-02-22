from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from routers import documents, chat, tasks
from services.gnn_service import gnn_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    gnn_service.initialize()
    yield

app = FastAPI(
    title="LinguaTax API",
    version="1.0.0",
    description="Multilingual US tax assistant — FastAPI backend with LangChain + Gemini RAG",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router, prefix="/documents", tags=["documents"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(tasks.router, prefix="/tasks", tags=["tasks"])


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # This ensures that even on 500 errors, CORS headers are included
    # because this handler returns a response that passes through the middleware
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "message": str(exc)},
    )


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok", "version": "1.0.0"}
