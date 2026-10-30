FROM node:24-alpine
WORKDIR /app
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node server.mjs ./
COPY --chown=node:node lib ./lib
COPY --chown=node:node public ./public
COPY --chown=node:node python ./python
COPY --chown=node:node assets ./assets
USER node
ENV HOST=0.0.0.0 PORT=3210
EXPOSE 3210
CMD ["node", "server.mjs"]
