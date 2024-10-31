# Use nvidia/cuda as the base image for GPU support
FROM nvidia/cuda:11.8.0-runtime-ubuntu22.04

# Set the working directory inside the container
WORKDIR /app

# Install Node.js
RUN apt-get update && \
    apt-get install -y curl gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# Install necessary packages for Puppeteer and FFmpeg
RUN apt-get install -y \
    git \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libgbm1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libpangoft2-1.0-0 \
    libgtk-3-0 \
    libffi-dev \
    libnvidia-encode1 \
    build-essential

# Install FFmpeg with NVIDIA NVENC support
RUN apt-get install -y ffmpeg

# Verify that FFmpeg has NVENC support
RUN ffmpeg -encoders | grep nvenc

# Copy package.json and package-lock.json
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the NestJS application (if using TypeScript and building)
RUN npm run build

# Expose the port that your NestJS application runs on (default is 3000)
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"]
