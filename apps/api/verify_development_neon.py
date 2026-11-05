"""Run synthetic Neon staging workflow checks without persistent fixture data.

Set EB_AUTH_STAGING_TEST_URL to the explicitly verified staging pooled URL.
The pytest fixtures verify the endpoint and roll back each test transaction.
"""
import subprocess
import sys
from pathlib import Path

if __name__ == "__main__":
    raise SystemExit(subprocess.call([sys.executable, "-m", "pytest", 'app/tests/test_supervisor_projects.py', 'app/tests/test_supervisor_applications.py', 'app/tests/test_supervisor_mentorship_assessments.py'], cwd=Path(__file__).resolve().parent))
