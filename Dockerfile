FROM node:20

RUN apt-get update && apt-get install -y \
  libnss3 \
  libnspr4 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2 \
  libpangocairo-1.0-0 \
  libgtk-3-0 \
  libpango-1.0-0 \
  libcairo2 \
  libatspi2.0-0 \
  fonts-liberation \
  ca-certificates \
  wget \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

# Pre-download Remotion's headless browser at build time
RUN npx remotion browser ensure

COPY . .

RUN mkdir -p outputs

CMD ["node", "server.js"]
