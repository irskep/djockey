<!--
  DO NOT EDIT THIS FILE DIRECTLY!
  It is generated by djockey.
-->
- [Indexterms](../plugins/indexterms.md#Indexterms)

<div id="Indexterms" class="section" id="Indexterms">

# Indexterms

You can generate a “reference” section. This is an unusual thing to want
to do for an HTML site, but in theory, Djockey will eventually support
some form of PDF output via LaTeX or Typst or SILE or something, so why
not?

Mark some text as representing an occurrence of a term by giving it an
attribute starting with `indexterm`.

``` djot
[Linus Torvalds invented Linux]{indexterm=linux indexterm2="Linus Torvalds"}
```

Choose where to put the index using a div with the class `index`, like
this:

``` djot
{.index}
:::
Index will go here, this is just placeholder text
:::
```

Here is the index generated for Djockey’s docs, which doesn’t try very
hard to use indexterms but does have a few:

## Bun

- [contributing/dependencies](../contributing/dependencies.md#indexterm-0)
- [contributing/building_and_running](../contributing/building_and_running.md#indexterm-0)
- [contributing/building_and_running
  (2)](../contributing/building_and_running.md#indexterm-1)
- [contributing/building_and_running
  (3)](../contributing/building_and_running.md#indexterm-2)
- [contributing/building_and_running
  (4)](../contributing/building_and_running.md#indexterm-3)
- [contributing/building_and_running
  (5)](contributing/building_and_running#indexterm-4)
- [contributing/building_and_running
  (6)](../contributing/building_and_running.md#indexterm-6)
- [contributing/client_side_js](../contributing/client_side_js.md#indexterm-0)

## testing

- [contributing/building_and_running](../contributing/building_and_running.md#indexterm-5)

</div>


| Previous | Next |
| - | - |
| [Using plugins](../plugins/using_plugins.md) | [Plugin API](../plugins/plugin_api.md) |