FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy backend files (including config and middleware)
COPY backend/ ./

# Copy frontend
COPY frontend/ ./frontend/

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 3000

CMD ["node", "server.js"]
