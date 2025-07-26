FROM node:20-alpine

RUN apk update && apk upgrade && rm -rf /var/cache/apk/* \
    && apk add --no-cache curl # Adiciona curl para o healthcheck

WORKDIR /app

COPY package*.json ./

RUN npm install --production

EXPOSE 3001

CMD ["npm", "start"]
