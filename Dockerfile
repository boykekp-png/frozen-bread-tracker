FROM node:18-slim

# Install build dependencies for better-sqlite3 native module
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --production

# Copy the rest of the application
COPY . .

EXPOSE 3000

CMD ["node", "backend/server.js"]