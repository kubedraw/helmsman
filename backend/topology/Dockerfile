FROM golang:1.26-alpine AS builder
WORKDIR /app
COPY backend/topology/go.mod ./
COPY backend/shared ../shared
RUN go mod download
COPY backend/topology/ .
RUN go build -o topology .

FROM alpine:latest
WORKDIR /root/
COPY --from=builder /app/topology .
EXPOSE 8082
CMD ["./topology"]
