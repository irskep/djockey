<!--
  DO NOT EDIT THIS FILE DIRECTLY!
  It is generated by djockey.
-->
- [Customizing HTML
  tags](../foundations/custom_markup.md#Customizing-HTML-tags)

<div id="Customizing-HTML-tags" class="section"
id="Customizing-HTML-tags">

# Customizing HTML tags

<div class="caution" tag="aside">

The details of this markup are likely to change, since Djockey is
experimental.

</div>

Djot does not ([yet](https://github.com/jgm/djot/issues/240)) support
arbitrary HTML tags in its input or output. Djockey works around this by
postprocessing Djot’s HTML output. Whenever you add a `tag=foo`
attribute, Djockey will replace the element’s tag with the attribute’s
value.

``` djot
{tag=details} 
:::
{tag=summary} 
I'm from Mattel!

Well, I'm not really from Mattel. I'm actually from a smaller
company that was purchased in a leveraged buyout.
:::
```

<div tag="details">

I’m from Mattel!

Well, I’m not really from Mattel. I’m actually from a smaller company
that was purchased in a leveraged buyout.

</div>

``` html
<details>
<summary>I’m from Mattel!</summary>
<p>Well, I’m not really from Mattel. I’m actually from a smaller
company that was purchased in a leveraged buyout.</p>
</details>
```

</div>


| Previous | Next |
| - | - |
| [Static Files](../foundations/static_files.md) | [Configuration reference](../foundations/configuration.md) |