.PHONY: docs

docs:
	bun src/cli.ts build docs


test:
	bun test
