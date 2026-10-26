import sys
import os

# Ensure root directory is on sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

# Serverless environment indicator
os.environ["VERCEL"] = "1"
os.environ.setdefault("ENVIRONMENT", "production")

# Production credentials must be configured in the Vercel project environment.
# Never embed database, signing, or encryption secrets in a public source file.
required_settings = ("DATABASE_URL", "JWT_SECRET_KEY", "ENCRYPTION_KEY")
missing_settings = [name for name in required_settings if not os.environ.get(name)]
if missing_settings:
    raise RuntimeError(
        "Missing required Vercel environment variables: " + ", ".join(missing_settings)
    )

from backend.app import app

# Vercel ASGI entry point
