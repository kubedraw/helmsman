FROM golang:1.26-alpine AS builder
WORKDIR /app
COPY backend/provisioner/go.mod ./
COPY backend/shared ../shared
COPY backend/topology ../topology
RUN go mod download
COPY backend/provisioner/ .
RUN go build -o provisioner .

FROM alpine:latest
WORKDIR /root/
COPY --from=builder /app/provisioner .
EXPOSE 8083
CMD ["./provisioner"]
