import sys
import os

# Ensure root directory is on sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

# Serverless environment indicator
os.environ["VERCEL"] = "1"
os.environ.setdefault("ENVIRONMENT", "production")
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql://neondb_owner:npg_roH2CA1qBcIU@ep-orange-field-amzn4w4x-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
)
os.environ.setdefault("JWT_SECRET_KEY", "darkstori-super-secure-production-jwt-token-key-2026")
os.environ.setdefault("ENCRYPTION_KEY", "OwB5qP-mX_xtbau7IQEGM1SxAdbEJQierX8dDBovdnc=")

from backend.app import app

# Vercel ASGI entry point
