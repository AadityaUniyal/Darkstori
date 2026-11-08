#!/bin/bash
set -ex

echo "=== Starting Darkstori Setup on Ubuntu 24.04 ==="

# 1. Install prerequisites
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y python3-pip python3-venv unzip nginx redis-server curl

# 2. Install AWS CLI v2 if not installed
if ! command -v aws &> /dev/null; then
    echo "Installing AWS CLI v2..."
    curl -s "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip"
    unzip -q /tmp/awscliv2.zip -d /tmp
    /tmp/aws/install --update
    rm -rf /tmp/aws /tmp/awscliv2.zip
fi

# 3. Create directory
mkdir -p /opt/darkstori
cd /opt/darkstori

# 4. Fetch backend bundle from customer-pii-vault
echo "Downloading backend bundle..."
aws s3 cp s3://customer-pii-vault-145023097151/backend-bundle.zip /opt/darkstori/backend-bundle.zip --region ap-south-1

rm -rf /opt/darkstori/app
mkdir -p /opt/darkstori/app
unzip -q -o /opt/darkstori/backend-bundle.zip -d /opt/darkstori/app

# 5. Create Python Virtual Environment
echo "Setting up Python virtual environment..."
python3 -m venv /opt/darkstori/venv
/opt/darkstori/venv/bin/pip install --upgrade pip setuptools wheel
/opt/darkstori/venv/bin/pip install -r /opt/darkstori/app/requirements.txt
/opt/darkstori/venv/bin/pip install gunicorn uvicorn[standard] psycopg2-binary

# 6. Write Production .env
cat << 'EOF' > /opt/darkstori/app/.env
DATABASE_URL="postgresql+asyncpg://neondb_owner:npg_u1v4hWlQecfN@ep-orange-field-amzn4w4x-pooler.c-5.us-east-1.aws.neon.tech/neondb?ssl=require"
SYNC_DATABASE_URL="postgresql://neondb_owner:npg_u1v4hWlQecfN@ep-orange-field-amzn4w4x-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
REDIS_URL="redis://localhost:6379/0"
JWT_SECRET_KEY="darkstori-super-secret-jwt-key-production-enterprise-grade"
JWT_ALGORITHM="HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES="1440"
ENVIRONMENT="production"
PORT=8000
HOST="0.0.0.0"
CORS_ORIGINS="*"
DARKSTORI_AI_AUTONOMOUS_ENABLED="true"
DARKSTORI_REALTIME_WS_ENABLED="true"
DARKSTORI_AUDIT_LOG_IMMUTABLE="true"
EOF

# 7. Create Systemd Service for FastAPI Gunicorn
cat << 'EOF' > /etc/systemd/system/darkstori.service
[Unit]
Description=Darkstori Enterprise FastStore Backend Service
After=network.target redis-server.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/darkstori/app
EnvironmentFile=/opt/darkstori/app/.env
ExecStart=/opt/darkstori/venv/bin/gunicorn backend.main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 127.0.0.1:8000 --timeout 120 --access-logfile - --error-logfile -
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# 8. Configure Nginx
cat << 'EOF' > /etc/nginx/sites-available/darkstori
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    client_max_body_size 50M;

    # Backend API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    # Direct health check
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/darkstori /etc/nginx/sites-enabled/default

# 9. Start Services
systemctl daemon-reload
systemctl enable redis-server
systemctl restart redis-server

systemctl enable darkstori
systemctl restart darkstori

nginx -t
systemctl restart nginx

echo "=== Darkstori Setup Complete ==="
sleep 3
curl -i http://localhost/api/health/live
