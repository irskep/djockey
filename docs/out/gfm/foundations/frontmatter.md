<!--
  DO NOT EDIT THIS FILE DIRECTLY!
  It is generated by djockey.
-->
- [Front matter](../foundations/frontmatter.md#frontmatter)
  - [Title](../foundations/frontmatter.md#Title)
  - [Order](../foundations/frontmatter.md#frontmatter-order)

<div id="frontmatter" class="section" id="frontmatter">

# Front matter

You can customize the title of your doc by adding YAML between `---`
lines at the top, like this:

```
---
title: Custom Title
---
# This would normally be the title

...
```

This works the same way no matter what markup language you’re using,
meaning you can add front matter before Markdown as well.

<div id="Title" class="section" id="Title">

## Title

You can set `title: "My document title"` to customize how the document
appears in the navigation tree and HTML page `<title>` tag.

``` yaml
title: "A custom title"
```

</div>

<div id="frontmatter-order" class="section" id="frontmatter-order">

## Order

By default, documents are sorted in lexical order. But you can use an
`order` value in the front matter to get more control.

Documents are sorted in the navigation tree this way:

1.  `order >= 0`
2.  No `order` at all
3.  `order < 0`

If you want a document at the top, say `order: 0`. If you want to put a
document right after that one, give it `order: 1`. If you want to put it
at the end, say `order: -1`.

</div>

</div>


| Previous | Next |
| - | - |
| [Organizing your project](../foundations/organization.md) | [Linking](../foundations/linking.md) |