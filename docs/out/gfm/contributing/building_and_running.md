<!--
  DO NOT EDIT THIS FILE DIRECTLY!
  It is generated by djockey.
-->
- [Building and running Djot
  locally](../contributing/building_and_running.md#Building-and-running-Djot-locally)
  - [Using Bun
    (preferred)](../contributing/building_and_running.md#Using-Bun-preferred)
  - [Using Node](../contributing/building_and_running.md#Using-Node)

<div id="Building-and-running-Djot-locally" class="section"
id="Building-and-running-Djot-locally">

# Building and running Djot locally

<div id="Using-Bun-preferred" class="section" id="Using-Bun-preferred">

## Using [Bun](https://bun.sh) (preferred)

It’s best to iterate on Djockey with <span id="indexterm-1"
indexterm="Bun" id="indexterm-1">Bun</span> because you don’t need to
compile the TypeScript and it boots instantly.

Assuming you’ve already installed `bun`, `bun install` and `bun test`
work as usual.

`Makefile` has a few shortcuts for working this way. Run `make docs` to
build the documentation for local browsing using <span id="indexterm-6"
indexterm="Bun" id="indexterm-6">Bun</span>; this is effectively the
best integration test for Djockey right now.

</div>

<div id="Using-Node" class="section" id="Using-Node">

## Using Node

Djockey supports Node because most potential users already have Node
installed.

You can use `yarn djockey` to build Djockey with `tsc` and run Djockey
using Node. `yarn test` and `yarn test:watch` will run the tests using
[Jest](https://jestjs.io).

</div>

</div>


| Previous | Next |
| - | - |
| [Version directives](../features/version_directives.md) | [Client-side JS](../contributing/client_side_js.md) |