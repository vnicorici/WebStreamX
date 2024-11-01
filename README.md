# WebStreamX

**WebStreamX** is a NestJS-based application that allows recording and streaming of web pages using Puppeteer and FFmpeg, with support for GPU acceleration.

## Features

-   Video recording of web pages.
-   Streaming to RTMP servers.
-   Utilization of GPU acceleration for rendering and transcoding.
-   Easy-to-use API with Next.js.

## Docker Deployment

### Prerequisites

-   **Docker Engine**: Install Docker Engine 19.03 or newer.
-   **NVIDIA GPU Drivers**: Install the latest NVIDIA GPU drivers on your host machine.
-   **NVIDIA Container Toolkit**: Install to enable GPU support in Docker containers.

### Building the Docker Image

```bash
 docker compose -f .docker/docker-compose.yml up --build
```

```bash
curl -X POST http://localhost:3000/record \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://www.timeanddate.com/worldclock/fullscreen.html?n=177",
    "time": 10
  }'| jq
```

## Stream web to rtmp (10sec)

```bash
curl -X POST http://localhost:3000/stream \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://www.timeanddate.com/worldclock/fullscreen.html?n=177",
    "rtmpUrl": "rtmp://example.com/live/YwGMLJBON-gY4GxN16Z-8bd1dda19",
    "time": 60
  }'| jq
```
