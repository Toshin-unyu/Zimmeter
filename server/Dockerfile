FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl font-ipa

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install
RUN npx prisma generate

COPY . .

EXPOSE 9102

CMD ["npm", "run", "dev"]
