FROM node:latest

RUN mkdir /src

RUN npm install nodemon -g

COPY ./ /src
WORKDIR /src
RUN npm install

EXPOSE 3002

RUN sh /src/hostDiscover.sh

CMD npm start