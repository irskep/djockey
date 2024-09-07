.PHONY: docs gfm client-nocache typedoc clean

client-nocache:
	bun build src/clientjs/index.ts --target=browser --outfile=templates/html/static/client.js --minify --sourcemap
	bun build src/clientjs/search.ts --target=browser --outfile=templates/html/static/search.js --minify --sourcemap
	bun build src/clientjs/mermaid.ts --target=browser --outfile=src/plugins/static/mermaid.js --minify --sourcemap

templates/html/static/client.js: src/clientjs/*
	make client-nocache

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
