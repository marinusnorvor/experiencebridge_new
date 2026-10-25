
from fastapi import FastAPI

app = FastAPI(
    title="ExperienceBridge API",
    version="0.1.0",
    description="Backend API for the ExperienceBridge platform",
)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "experiencebridge-api",
        "version": "0.1.0",
    }
