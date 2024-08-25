.PHONY: docs client-nocache

client-nocache:
	bun build src/clientjs/index.ts --target=browser --outfile=templates/html/static/client.js --minify

templates/html/static/client.js: src/clientjs/*
	bun build src/clientjs/index.ts --target=browser --outfile=templates/html/static/client.js --minify

client: templates/html/static/client.js

docs: templates/html/static/client.js
	bun src/cli.ts build docs --local

test:
	bun test
