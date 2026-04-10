FROM node:20-alpine
 
WORKDIR /app
 
# Kopieer package files
COPY package*.json ./
COPY tsconfig.json ./
 
# Installeer dependencies
RUN npm ci
 
# Kopieer broncode
COPY src/ ./src/
 
# Bouw TypeScript
RUN npm run build
 
# Start de server
CMD ["node", "dist/index.js"]
