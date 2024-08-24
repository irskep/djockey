.PHONY: docs

docs:
	bun src/cli.ts build docs --local


test:
	bun test
