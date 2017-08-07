FROM node:8-alpine
COPY . .
RUN yarn build

FROM abiosoft/caddy
COPY --from=0 ./dist /root/.caddy
COPY ./Caddyfile /etc/Caddyfile
CMD ["--conf", "/etc/Caddyfile", "--log", "stdout"]
