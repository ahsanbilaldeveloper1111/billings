FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_LARAVEL_API_URL
ARG NEXT_PUBLIC_LARAVEL_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_API_SAME_ORIGIN_PROXY
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_LARAVEL_API_URL=$NEXT_PUBLIC_LARAVEL_API_URL
ENV NEXT_PUBLIC_LARAVEL_PUBLIC_BASE_URL=$NEXT_PUBLIC_LARAVEL_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_API_SAME_ORIGIN_PROXY=$NEXT_PUBLIC_API_SAME_ORIGIN_PROXY
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build   

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup -g 1001 -S nodejs
RUN adduser -S devuser -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Winston / instrumentation write under process.cwd()/logs; nextjs must own it.
RUN mkdir -p /app/logs && chown devuser:nodejs /app/logs

USER devuser
EXPOSE 3000
CMD ["node", "server.js"]
