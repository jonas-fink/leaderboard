# Ein Image, ein Prozess: Express liefert API und gebautes Frontend.
# Mongo kommt von Atlas, TLS vom Tailscale Funnel — beides nicht unser Problem.

# BuildKit baut beide Stages parallel — über eine dünne Leitung reißt npm
# dabei ab (ECONNRESET). Weniger Verbindungen, dafür mehr Geduld.
ARG NPM_FLAGS="--fetch-retries=5 --fetch-retry-maxtimeout=120000 --maxsockets=4"

FROM node:24-slim AS client
ARG NPM_FLAGS
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci $NPM_FLAGS
COPY . .
RUN npx vite build

FROM node:24-slim
ARG NPM_FLAGS
WORKDIR /app
ENV NODE_ENV=production
COPY server/package.json server/package-lock.json ./server/
RUN npm ci --omit=dev --prefix server $NPM_FLAGS
COPY server ./server
COPY shared ./shared
COPY --from=client /app/dist ./dist
# shared/ liegt neben server/ und importiert zod. Node sucht Pakete von dort
# aus in /app/node_modules — dieser Link zeigt auf die des Servers.
RUN ln -s server/node_modules node_modules
WORKDIR /app/server
# Node führt die .ts-Dateien direkt aus (type stripping), kein Build-Schritt.
CMD ["node", "src/index.ts"]
