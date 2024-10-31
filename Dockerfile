# Use nvidia/cuda devel image for CUDA development libraries
FROM nvidia/cuda:11.8.0-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive

# Set the working directory inside the container
WORKDIR /WebStreamX

# Install Node.js
RUN apt-get update && \
    apt-get install -y curl gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# Install necessary packages for Puppeteer, FFmpeg, and Xvfb
RUN apt-get update && apt-get install -y \
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
    build-essential \
    xvfb \
    x11vnc \
    x11-utils \
    mesa-utils \
    xfonts-base \
    xfonts-100dpi \
    xfonts-75dpi \
    xfonts-scalable \
    x11-apps \
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    lsb-release \
    xdg-utils \
    libnuma-dev \
    pkg-config \
    yasm \
    nasm \
    libxext6 \
    libxrender1 \
    libxtst6 \
    libxi6 \
    libavcodec-dev \
    libavformat-dev \
    libavdevice-dev \
    libxcb1-dev \
    libxcb-shm0-dev \
    libxcb-xfixes0-dev \
    libxcb-shape0-dev \
    libx11-dev \
    libxext-dev \
    libxfixes-dev \
    libxrender-dev \
    libxtst-dev \
    libxi-dev

# Set environment variables for CUDA
ENV PATH="/usr/local/cuda/bin:${PATH}"
ENV LD_LIBRARY_PATH="/usr/local/cuda/lib64:${LD_LIBRARY_PATH}"

RUN cd /tmp && git clone -b sdk/11.1 https://github.com/FFmpeg/nv-codec-headers.git && \
    cd nv-codec-headers && make install

# Download and compile FFmpeg with NVENC and libnpp support
RUN git clone https://git.ffmpeg.org/ffmpeg.git ffmpeg && \
    cd ffmpeg && \
    ./configure \
      --prefix=/usr/local \
      --pkg-config-flags="--static" \
      --extra-cflags="-I/usr/local/cuda/include" \
      --extra-ldflags="-L/usr/local/cuda/lib64" \
      --extra-libs="-lpthread -lm" \
      --enable-cuda-nvcc \
      --enable-libnpp \
      --enable-cuvid \
      --enable-nvenc \
      --enable-cuda \
      --enable-gpl \
      --enable-nonfree \
      --enable-libxcb \
      --enable-libxcb-shm \
      --enable-libxcb-xfixes \
      --enable-libxcb-shape && \
    make -j$(nproc) && \
    make install && \
    ldconfig && \
    cd .. && rm -rf ffmpeg

# Copy package.json and package-lock.json
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the NestJS application
RUN npm run build

# Expose the port that your NestJS application runs on (default is 3000)
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"]