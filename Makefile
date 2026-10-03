.PHONY: all build-web build-local build-linux clean

all: build-local

build-web:
	cd web && npm run build

build-local: build-web
	go build -o spanel ./cmd/server

build-linux: build-web
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o spanel-linux-amd64 ./cmd/server

clean:
	rm -rf web/out spanel spanel.exe spanel-linux-amd64 data
