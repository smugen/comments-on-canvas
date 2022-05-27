# https://docs.docker.com/engine/reference/builder/

FROM node:16.14-slim
WORKDIR /root/app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build
VOLUME /root/app/upload
CMD ["npm", "start"]
