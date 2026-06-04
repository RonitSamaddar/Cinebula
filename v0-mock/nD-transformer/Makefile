IMAGE_NAME := nd-transformer
IMAGE_TAG := latest

.PHONY: build run up down clean

build:
	docker build -t $(IMAGE_NAME):$(IMAGE_TAG) .

run: build
	docker run --rm -p 8080:8080 $(IMAGE_NAME):$(IMAGE_TAG)

up: build
	docker-compose up -d

down:
	docker-compose down

clean:
	docker rmi $(IMAGE_NAME):$(IMAGE_TAG) 2>/dev/null || true
