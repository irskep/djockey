<!--
  DO NOT EDIT THIS FILE DIRECTLY!
  It is generated by djockey.
-->
- [Custom markup](../basics/custom_markup.md#Custom-markup)
  - [Overriding HTML
    tags](../basics/custom_markup.md#Overriding-HTML-tags)

<div id="Custom-markup" class="section" id="Custom-markup">

# Custom markup

<div class="caution" tag="aside">

The details of this markup are likely to change, since Djockey is
experimental.

</div>

<div id="Overriding-HTML-tags" class="section"
id="Overriding-HTML-tags">

## Overriding HTML tags

Djot does not ([yet](https://github.com/jgm/djot/issues/240)) support
arbitrary HTML tags in its input or output. Djockey works around this by
postprocessing Djot’s HTML output. Whenever you add a `tag=foo`
attribute, Djockey will replace the element’s tag with the attribute’s
value.

Input:

``` djot
{tag=details}
:::
[I'm from Mattel!]{tag=summary}
Well, I'm not really from Mattel. I'm actually from a smaller company that was purchased in a leveraged buyout.
:::
```

Output:

<div tag="details">

<span tag="summary">I’m from Mattel!</span> Well, I’m not really from
Mattel. I’m actually from a smaller company that was purchased in a
leveraged buyout.

</div>

</div>

</div>


| Previous | Next |
| - | - |
| [Asides](../basics/asides.md) | [Using Djot](../basics/djot.md) |