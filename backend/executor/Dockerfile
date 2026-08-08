FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY backend/executor/go.mod ./
COPY backend/shared ../shared
RUN go mod tidy
COPY backend/executor/ .
RUN go build -o executor .

FROM alpine:latest
WORKDIR /root/
COPY --from=builder /app/executor .
EXPOSE 8084
CMD ["./executor"]
