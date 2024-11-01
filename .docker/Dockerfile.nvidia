# Set the FFmpeg version and CUDA architecture
ARG FFMPEG_VERSION=5.1.3
ARG CUDA_VERSION=11.8.0
ARG UBUNTU_VERSION=22.04
ARG NVCC_ARCH="compute_60"
ARG NVCC_CODE="sm_60,sm_61,sm_62"
ARG MAKEFLAGS="-j$(nproc)"

###############################
# Stage 1: Build FFmpeg with NVIDIA support
FROM nvidia/cuda:${CUDA_VERSION}-devel-ubuntu${UBUNTU_VERSION} AS build-ffmpeg

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ARG FFMPEG_VERSION
ENV PREFIX=/opt/ffmpeg
ENV PKG_CONFIG_PATH="${PREFIX}/lib/pkgconfig"
ENV LD_LIBRARY_PATH="${PREFIX}/lib:${LD_LIBRARY_PATH}"

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    autoconf \
    automake \
    build-essential \
    cmake \
    git \
    libass-dev \
    libfdk-aac-dev \
    libfreetype6-dev \
    libmp3lame-dev \
    libnuma-dev \
    libopus-dev \
    libssl-dev \
    libtheora-dev \
    libtool \
    libvdpau-dev \
    libvorbis-dev \
    libvpx-dev \
    libx264-dev \
    libx265-dev \
    libxcb-shm0-dev \
    libxcb-xfixes0-dev \
    libxcb1-dev \
    pkg-config \
    texinfo \
    wget \
    yasm \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Create working directory
WORKDIR /tmp

# Clone and install nv-codec-headers
RUN git clone -b sdk/11.1 https://github.com/FFmpeg/nv-codec-headers.git \
    && cd nv-codec-headers \
    && make -j$(nproc) \
    && make install PREFIX=${PREFIX}

# Download and extract FFmpeg source
RUN wget http://ffmpeg.org/releases/ffmpeg-${FFMPEG_VERSION}.tar.gz \
    && tar -xzf ffmpeg-${FFMPEG_VERSION}.tar.gz \
    && rm ffmpeg-${FFMPEG_VERSION}.tar.gz

# Build FFmpeg
WORKDIR /tmp/ffmpeg-${FFMPEG_VERSION}
RUN ./configure \
    --prefix=${PREFIX} \
    --extra-cflags="-I${PREFIX}/include -I/usr/local/cuda/include" \
    --extra-ldflags="-L${PREFIX}/lib -L/usr/local/cuda/lib64" \
    --pkg-config-flags="--static" \
    --extra-libs="-lpthread -lm" \
    --bindir="/usr/local/bin" \
    --enable-cuda-nvcc \
    --enable-cuvid \
    --enable-nvenc \
    --enable-nvdec \
    --enable-libnpp \
    --nvccflags="-gencode arch=${NVCC_ARCH},code=[${NVCC_CODE}] -O2" \
    --enable-gpl \
    --enable-nonfree \
    --enable-libass \
    --enable-libfdk-aac \
    --enable-libfreetype \
    --enable-libmp3lame \
    --enable-libopus \
    --enable-libtheora \
    --enable-libvorbis \
    --enable-libvpx \
    --enable-libx264 \
    --enable-libx265 \
    --enable-libdrm \
    --enable-libxcb \
    --enable-libxcb-shm \
    --enable-libxcb-xfixes \
    --enable-shared \
    --disable-static \
    --disable-debug \
    --disable-doc \
    --disable-ffplay \
    && make ${MAKEFLAGS} \
    && make install

# Cleanup build dependencies and intermediate files
RUN rm -rf /tmp/*

##########################
# Stage 2: Build the final image with Puppeteer support
FROM nvidia/cuda:${CUDA_VERSION}-runtime-ubuntu${UBUNTU_VERSION}

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV NVIDIA_VISIBLE_DEVICES all
ENV NVIDIA_DRIVER_CAPABILITIES compute,video,utility
ENV PREFIX=/opt/ffmpeg
ENV LD_LIBRARY_PATH="${PREFIX}/lib:${LD_LIBRARY_PATH}"
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    libass9 \
    libfdk-aac2 \
    libfreetype6 \
    libmp3lame0 \
    libnuma1 \
    libopus0 \
    libtheora0 \
    libvdpau1 \
    libvorbis0a \
    libvorbisenc2 \
    libx264-163 \
    libx265-199 \
    libxcb-shm0 \
    libxcb-xfixes0 \
    libxcb1 \
    wget \
    curl \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 18.x
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Chromium browser
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium-browser \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy FFmpeg from the build stage
COPY --from=build-ffmpeg /usr/local/bin/ffmpeg /usr/local/bin/
COPY --from=build-ffmpeg /usr/local/bin/ffprobe /usr/local/bin/
COPY --from=build-ffmpeg ${PREFIX}/lib/ ${PREFIX}/lib/
COPY --from=build-ffmpeg ${PREFIX}/include/ ${PREFIX}/include/

# Copy your application code
COPY package*.json ./

# Install application dependencies, including Puppeteer
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose FFmpeg and application in PATH
ENV PATH="/usr/local/bin:${PATH}"

# Expose necessary ports
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"]
