FROM node:18-alpine AS base

WORKDIR /app

# 安装依赖
COPY package.json package-lock.json ./
RUN npm install

# 构建
COPY . .
RUN npx tsx app/masks/build.ts
ENV BUILD_MODE=standalone
RUN npx next build

# 运行
EXPOSE 3000
CMD ["node", ".next/standalone/server.js"]
