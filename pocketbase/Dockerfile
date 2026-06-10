FROM alpine:3.19

ARG PB_VERSION=0.22.21

RUN apk add --no-cache unzip ca-certificates wget

ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/ && rm /tmp/pb.zip

COPY pb_migrations /pb/pb_migrations

EXPOSE 8090

# --dir pins the SQLite/data location to the Railway persistent volume mount
# point. Without a volume mounted here, pb_data is ephemeral and every redeploy
# re-runs all migrations from scratch, reverting any edits made via the app.
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data"]
