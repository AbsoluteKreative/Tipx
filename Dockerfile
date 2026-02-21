FROM node:20-alpine

WORKDIR /app

# native module build deps (better-sqlite3)
RUN apk add --no-cache python3 make g++ linux-headers

COPY package*.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_ vars must be set at build time — Next.js inlines them into the JS bundle
ENV NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_ARB_RPC_URL="https://sepolia-rollup.arbitrum.io/rpc"
ENV NEXT_PUBLIC_VAULT_ADDRESS="0xC74D73971abE0B7EBc0Ef904aE8A5B925e87491B"
ENV NEXT_PUBLIC_USDC_ADDRESS="0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
ENV NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="36f3be3424a63a39e5f80589bb0155e1"
ENV NEXT_PUBLIC_PROTOCOL_FEE_PERCENTAGE="0.05"

RUN npm run build

EXPOSE 7300

CMD node server/index.js & npx next start -H 0.0.0.0 -p 7300
