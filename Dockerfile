FROM node:20-alpine

WORKDIR /app

ENV PORT=3001

COPY package*.json ./
RUN npm install --omit=dev

COPY certs ./certs

COPY . .

EXPOSE ${PORT}

CMD ["node", "server.js"]


