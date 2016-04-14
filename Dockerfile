FROM node:latest

RUN mkdir /src

RUN npm install nodemon -g

COPY ./ /src
WORKDIR /src
RUN npm install

CMD sh hostDiscover.sh

EXPOSE 3002

CMD npm start