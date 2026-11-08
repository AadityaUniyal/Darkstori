#!/bin/bash
set -ex
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "=== Starting Darkstori Production Bootstrap ==="
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y python3-pip python3-venv unzip nginx redis-server awscli curl

# Start & enable Redis
systemctl enable redis-server
systemctl start redis-server

# Create application directory
mkdir -p /opt/darkstori
cd /opt/darkstori

# Download bundle from S3
aws s3 cp s3://darkstori-app-145023097151/backend-bundle.zip /opt/darkstori/backend-bundle.zip --region ap-south-1
unzip -o /opt/darkstori/backend-bundle.zip -d /opt/darkstori/

# Create virtualenv & install dependencies
python3 -m venv /opt/darkstori/venv
/opt/darkstori/venv/bin/pip install --upgrade pip setuptools wheel
/opt/darkstori/venv/bin/pip install -r /opt/darkstori/requirements.txt
/opt/darkstori/venv/bin/pip install gunicorn uvicorn[standard] redis

# Create production .env
cat << 'EOF' > /opt/darkstori/.env
DATABASE_URL=postgresql://neondb_owner:npg_roH2CA1qBcIU@ep-orange-field-amzn4w4x-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
JWT_SECRET_KEY=darkstori-super-secure-production-jwt-token-key-2026
ENCRYPTION_KEY=OwB5qP-mX_xtbau7IQEGM1SxAdbEJQierX8dDBovdnc=
ENVIRONMENT=production
ALLOWED_ORIGINS=*
PORT=8000
HOST=0.0.0.0
EOF

# Create systemd service
cat << 'EOF' > /etc/systemd/system/darkstori.service
[Unit]
Description=Darkstori 3.0 Hyperlocal Quick Commerce API
After=network.target redis-server.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/darkstori
EnvironmentFile=/opt/darkstori/.env
ExecStart=/opt/darkstori/venv/bin/gunicorn -k uvicorn.workers.UvicornWorker backend.app:app -b 127.0.0.1:8000 -w 2 --timeout 120
Restart=always
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

# Configure Nginx reverse proxy with WebSockets
cat << 'EOF' > /etc/nginx/sites-available/default
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
EOF

# Reload and start services
systemctl daemon-reload
systemctl enable darkstori
systemctl restart darkstori
systemctl restart nginx

echo "=== Darkstori Production Bootstrap Complete ==="
