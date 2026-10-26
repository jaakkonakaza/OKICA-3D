FROM oven/bun:1.4.2@sha256:9114c058aeae42162ee16dd5084b95fe9473970bb6bcb5b232ab1630f0546895 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Busybox provides wget for the Coolify health check.
FROM oven/bun:1.4.2-alpine@sha256:d888c0ae6c86d7866ff10c5aafdd9077b36aee6455b33dd270fb93c0dd5cef6f
WORKDIR /app
# Public URLs use Traefik headers. The localhost health check uses IPv6.
ENV NODE_ENV=production HOST=:: PORT=3000 PROTOCOL_HEADER=x-forwarded-proto HOST_HEADER=x-forwarded-host
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./
USER bun
EXPOSE 3000
CMD ["bun", "build/index.js"]
