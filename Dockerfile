FROM node:8-alpine
COPY . .
RUN yarn build

FROM abiosoft/caddy
COPY --from=0 . .
CMD ["--conf", "/etc/Caddyfile", "--log", "stdout"]
