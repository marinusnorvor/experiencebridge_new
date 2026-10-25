# ExperienceBridge API

The existing `main.py` entry point remains the compatibility entry point and owns the bootstrap `/health` route. Domain packages under `app/` are empty foundations; no database schema, product endpoint, authentication, or authorization behavior is implemented.

## Local development

From the repository root, use the existing API virtual environment:

```powershell
.\apps\api\.venv\Scripts\python.exe -m uvicorn main:app --app-dir apps/api --reload
```

Then request `http://127.0.0.1:8000/health`.

For a new local environment, create a virtual environment inside `apps/api/.venv` and install `requirements.txt`. Do not commit the environment.
