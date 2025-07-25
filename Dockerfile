FROM node:20-alpine

RUN apk update && apk upgrade && rm -rf /var/cache/apk/*

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
