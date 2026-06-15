# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /app
# Pin pnpm to 10.x: pnpm 11 ignores package.json's `pnpm.onlyBuiltDependencies`
# (so esbuild's build script is skipped and the install errors out).
RUN npm install -g pnpm@10.33.2

# Install deps first for better layer caching.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ---- Serve stage ----
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]