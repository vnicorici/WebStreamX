# Folosim imaginea de bază Node.js cu Ubuntu
FROM node:18-bullseye-slim

# Setăm variabila de mediu pentru interacțiune non-interactivă
ENV DEBIAN_FRONTEND=noninteractive

# Setăm variabilele de mediu pentru Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
#ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Instalăm dependențele necesare pentru Puppeteer și FFmpeg
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
    && rm -rf /var/lib/apt/lists/*

# Setăm directorul de lucru
WORKDIR /WebStreamX

# Copiem fișierele package.json și package-lock.json
COPY package*.json ./

# Instalăm dependențele aplicației, inclusiv Puppeteer
RUN npm install

# Copiem restul codului aplicației
COPY . .


# Instalăm Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    && rm -rf /var/lib/apt/lists/*

RUN npm run build

# Expunem portul pe care rulează aplicația (presupunem că este 3000)
EXPOSE 3000

# Pornim aplicația
CMD ["npm", "run", "start:prod"]