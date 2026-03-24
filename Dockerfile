# Use official Node.js LTS image
FROM node:24.13.0
 
# Set working directory
WORKDIR /app
 
# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev
 
# Copy application source
COPY . .
 
# Expose the port your Express app listens on
EXPOSE 3000
 
# Start the server
CMD ["node", "server.js"]