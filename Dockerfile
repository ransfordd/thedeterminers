# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --ignore-scripts

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache openssl

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Need full node_modules for prisma db push + db seed at runtime
COPY --from=builder /app/node_modules ./node_modules

# nextjs must own these so prisma db push / db seed can run at container start
RUN chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000

# Default: start app. Override in compose to run migrate+seed first.
CMD ["node", "server.js"]
