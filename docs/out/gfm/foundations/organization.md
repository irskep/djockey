<!--
  DO NOT EDIT THIS FILE DIRECTLY!
  It is generated by djockey.
-->
- [Organizing your
  project](../foundations/organization.md#Organizing-your-project)
  - [Directory
    structure](../foundations/organization.md#Directory-structure)
  - [Section metadata with
    `index.djot`](../foundations/organization.md#Section-metadata-with-index-djot)

<div id="Organizing-your-project" class="section"
id="Organizing-your-project">

# Organizing your project

<div id="Directory-structure" class="section" id="Directory-structure">

## Directory structure

A typical Djockey docs directory might look something like this:

``` plaintext
docs/
  djockey.yaml
  src/
    index.dj # landing page
    a_doc.dj
    subsection/
      index.dj # metadata for subsection
      doc_1.dj
      doc_2.md # written in Markdown because why not
  out/
    gfm/  # checked into git
      index.md
      a_doc.md
      subsection/
        doc_1.md
        doc_2.md
    html/ # gitignored, deployed to GitHub Pages
      ...
```

Other layouts work fine, of course. Just specify the paths the way you
want in `djockey.yaml`.

</div>

<div id="Section-metadata-with-index-djot" class="section"
id="Section-metadata-with-index-djot">

## Section metadata with `index.djot`

Djockey will use directory names in the sidebar and order sections after
documents in lexical order, but you can customize section titles and
ordering by adding an empty `index.djot` file with [front
matter](../foundations/frontmatter.md#frontmatter).

</div>

</div>


| Previous | Next |
| - | - |
| [Changelog](../changelog.md) | [Front matter](../foundations/frontmatter.md) |