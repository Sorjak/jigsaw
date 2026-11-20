start:
    docker compose up -d

stop:
    docker compose down

build:
    docker compose build

rebuild:
    docker compose build --no-cache

shell:
    docker compose exec -it web /bin/sh

logs:
    docker compose logs -f web

start-dev:
    npm run dev