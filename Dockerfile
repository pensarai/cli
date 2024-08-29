FROM node:20

RUN npm install -g @pensar/cli

COPY entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]