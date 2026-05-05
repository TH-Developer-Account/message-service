# Use official Node.js LTS image
FROM node:24.13.0
 
# Set working directory
WORKDIR /app
 
# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm install -g pm2

# Copy application source
COPY . .

# Expose the port your Express app listens on
EXPOSE 3000

# pm2-runtime runs in the foreground (no daemon) — correct for Docker.
# It forwards SIGTERM to all workers, triggering graceful shutdown in server.js.
CMD ["pm2-runtime", "ecosystem.config.cjs"]