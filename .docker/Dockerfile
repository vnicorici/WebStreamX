FROM node:18-bullseye-slim

ENV DEBIAN_FRONTEND=noninteractive \
	PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
	FFMPEG=/usr/bin/ffmpeg \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/x-www-browser

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
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
    wget \
    gnupg \
	xvfb \
	curl \
	chromium \
	procps \
	mc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /WebStreamX

COPY package*.json ./

RUN npm install

RUN npm install pm2 -g

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "Xvfb :99 -screen 0 1920x1080x24 & pm2-runtime start dist/main.js"]
