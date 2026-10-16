# The Everrealm world server, for hosts that run containers (Fly.io, Railway, a VPS).
# Mount a volume at /data so accounts and characters survive restarts.
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server ./server
ENV PORT=8787 EVERREALM_DATA=/data
EXPOSE 8787
CMD ["node", "server/server.mjs"]
