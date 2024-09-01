.PHONY: docs gfm client-nocache typedoc clean

client-nocache:
	bun build src/clientjs/index.ts --target=browser --outfile=templates/html/static/client.js --minify

templates/html/static/client.js: src/clientjs/*
	bun build src/clientjs/index.ts --target=browser --outfile=templates/html/static/client.js --minify

client: templates/html/static/client.js

typedoc:
	bunx typedoc 

typedoc-linkmap:
	bunx linkmapper-typedoc docs/src/types.json docs/src/typescript_link_mapping.json

docs: templates/html/static/client.js
	bun --bun src/cli.ts docs --local

gfm:
	rm -rf docs/out/gfm
	bun --bun src/cli.ts docs --output-format gfm

test:
	bun test

clean:
	rm -rf docs/out/html/*
