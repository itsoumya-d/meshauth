FROM golang:1.21-alpine

WORKDIR /app
RUN apk add --no-cache gcc musl-dev sqlite-dev

COPY go.mod ./
RUN go mod download

COPY . .
RUN go build -o meshauth-server .

EXPOSE 8080
CMD ["./meshauth-server"]
