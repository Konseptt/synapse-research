.PHONY: infra dev worker migrate test

infra:
	docker compose up -d

dev:
	cd frontend && npm run dev

worker:
	cd frontend && npm run worker

migrate:
	cd frontend && npm run db:push

test:
	cd frontend && npm test
