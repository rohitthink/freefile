from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.db.database import init_db
from backend.routers import upload, transactions, tax, filing, profile


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="FreeFile", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(transactions.router, prefix="/api", tags=["transactions"])
app.include_router(tax.router, prefix="/api", tags=["tax"])
app.include_router(filing.router, prefix="/api", tags=["filing"])
app.include_router(profile.router, prefix="/api", tags=["profile"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}
