# Docker Build Instructions for OMV

This Dockerfile creates a unified image containing both the frontend and backend services.

## Building the Image

From the repository root directory:

```bash
docker build -t scr-form-manager:latest .
```

Or with a specific tag:

```bash
docker build -t scr-form-manager:v1.0.0 .
```

## Running the Container

### Basic Run

```bash
docker run -d \
  --name scr-form-manager \
  -p 8000:8000 \
  -v /path/to/data:/app/data \
  -v /path/to/ldx:/ldx \
  scr-form-manager:latest
```

### With Custom Environment Variables

```bash
docker run -d \
  --name scr-form-manager \
  -p 8000:8000 \
  -e ADMIN_USERNAME=myadmin \
  -e ADMIN_PASSWORD=mypassword \
  -e JWT_SECRET=your-secret-key-here \
  -e LDX_WATCH_DIR=/ldx \
  -v /path/to/data:/app/data \
  -v /path/to/ldx:/ldx \
  scr-form-manager:latest
```

## Volume Mounts

- `/app/data` - SQLite database storage (persist this!)
- `/ldx` - Directory to watch for .ldx files (mount your LDX directory here)

## Ports

- `8000` - Main application port (both API and frontend)

## Accessing the Application

Once running, access the application at:
- Frontend: `http://your-server-ip:8000`
- API: `http://your-server-ip:8000/api`

## Default Credentials

- Username: `admin`
- Password: `admin123`

**Important:** Change these in production using environment variables!

## For OpenMediaVault (OMV)

1. Build the image on your development machine or OMV server
2. Save the image as a tar file:
   ```bash
   docker save scr-form-manager:latest -o scr-form-manager.tar
   ```
3. Transfer to OMV server and load:
   ```bash
   docker load -i scr-form-manager.tar
   ```
4. Use OMV's Docker plugin to create a container with:
   - Image: `scr-form-manager:latest`
   - Port mapping: `8000:8000`
   - Volume mounts for data and LDX directories
   - Environment variables as needed

## Environment Variables

- `ADMIN_USERNAME` - Default admin username (default: `admin`)
- `ADMIN_PASSWORD` - Default admin password (default: `admin123`)
- `JWT_SECRET` - Secret key for JWT tokens (change in production!)
- `LDX_WATCH_DIR` - Directory to watch for .ldx files (default: `/ldx`)
- `PYTHONUNBUFFERED` - Set to 1 for better logging (already set)
