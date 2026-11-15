FROM node:22-alpine
WORKDIR /usr/src/app
RUN npm install -g npm@11.21.2
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
CMD ["npm", "start"]