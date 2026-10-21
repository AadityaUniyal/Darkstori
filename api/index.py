import sys
import os

# Ensure root directory is on sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

# Serverless environment indicator
os.environ["VERCEL"] = "1"

from backend.app import app

# Vercel ASGI entry point
