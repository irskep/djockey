.PHONY: docs gfm client-nocache typedoc clean

client-nocache:
	bun build src/clientjs/index.ts --target=browser --outfile=templates/html/static/client.js --minify

templates/html/static/client.js: src/clientjs/*
	bun build src/clientjs/index.ts --target=browser --outfile=templates/html/static/client.js --minify

client: templates/html/static/client.js

typedoc:
	bunx typedoc 

docs: templates/html/static/client.js
	bun src/cli.ts build docs --local

gfm:
	bun src/cli.ts build docs --output-format gfm

test:
	bun test

clean:
	rm -rf docs/out/html/*