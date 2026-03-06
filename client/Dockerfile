FROM node:20-alpine

RUN apk add --no-cache git && git config --global --add safe.directory /

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 9002

CMD ["npm", "run", "dev", "--", "--host"]
