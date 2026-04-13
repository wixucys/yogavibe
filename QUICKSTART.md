# 🚀 YogaVibe Quick Start Guide

Get YogaVibe up and running in 5 minutes!

## Prerequisites

- Docker and Docker Compose installed
- Git
- 2GB free disk space

## ⚡ Quick Start (5 minutes)

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/yogavibe-ts.git
cd yogavibe-ts
```

### 2. Setup Environment

```bash
# Copy environment template
cp .env.example .env

# (Optional) Edit for custom configuration
# nano .env
```

### 3. Start Services

```bash
# Build and start all services
docker-compose up -d

# Check status
docker-compose ps
```

### 4. Access Application

- **Frontend**: http://localhost
- **Backend API**: http://localhost/api
- **API Docs**: http://localhost/api/docs
- **MinIO Console**: http://localhost:9001
  - Username: minioadmin
  - Password: minioadmin

## 📊 Verify Everything Works

```bash
# Check backend
curl http://localhost/api/health

# Check frontend
curl http://localhost/

# View logs
docker-compose logs -f
```

## 🧪 Run Tests

```bash
# Backend tests
docker-compose exec backend pytest test -v

# Frontend tests
docker-compose exec frontend npm test
```

## 🛑 Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove data volumes
docker-compose down -v
```

## 📚 Documentation

For more detailed information:

- **README**: See [README.md](README.md)
  - Unified setup and run commands
  - Runtime endpoints and checks

## 🔧 Common Commands

```bash
# View logs
docker-compose logs -f <service>

# Execute command
docker-compose exec <service> <command>

# Restart service
docker-compose restart <service>

# Rebuild images
docker-compose build --no-cache

# Access database
docker-compose exec backend sqlite3 data/yogavibe.db

# Run migrations
docker-compose exec backend python -m app.init_data
```

## 🆘 Troubleshooting

### Port already in use
```bash
# Find what's using the port
lsof -i :80        # Frontend
lsof -i :8000      # Backend
lsof -i :9000      # MinIO

# Kill the process
kill -9 <PID>
```

### Services won't start
```bash
# Check logs
docker-compose logs

# Verify composition file
docker-compose config

# Rebuild everything
docker-compose build --no-cache
docker-compose up -d
```

### Database issues
```bash
# Reset database
docker-compose exec backend rm data/yogavibe.db

# Reinitialize
docker-compose exec backend python -m app.init_data
```

## 📝 Default Credentials

| Service | User | Password |
|---------|------|----------|
| MinIO | minioadmin | minioadmin |
| Backend | (JWT auth) | - |
| Frontend | (OAuth/Custom) | - |

⚠️ **Change these in production!**

## 🚀 Next Steps

1. **Customize Configuration**
   - Edit `.env` for your settings
   - Update `CORS_ORIGINS` for your domain

2. **Load Sample Data**
   ```bash
   docker-compose exec backend python -m app.init_data
   ```

3. **Enable Features**
   - Configure weather API
   - Set up email service
   - Configure S3 storage

4. **Deploy to Production**
   - Use `docker-compose up -d --build` on your server
   - Configure SSL/TLS
   - Set up monitoring

## 📱 Development Tips

### Hot Reload
Changes in `backend/` and `frontend/` automatically reload

### Database
- SQLite for development (auto-created)
- PostgreSQL for production

### File Uploads
- Stored in MinIO (development)
- S3-compatible in production

## 🔒 Security Notes

- Default passwords should be changed
- Never commit `.env` files
- Use strong `SECRET_KEY` in production
- Enable HTTPS in production
- Keep Docker images updated

## 💡 Tips

- Use `docker-compose logs -f <service>` to debug issues
- Backend API documentation at `/api/docs`
- Check `.env.example` for all configuration options
- See individual documentation files for advanced topics

## 🆘 Need Help?

1. Check [README.md](README.md) for runtime/deploy tips
2. Review CI checks in [.github/workflows/build-and-test.yml](.github/workflows/build-and-test.yml)
3. Check logs: `docker-compose logs <service>`
4. See specific documentation files for detailed info

---

**Happy coding with YogaVibe! 🧘‍♀️**
