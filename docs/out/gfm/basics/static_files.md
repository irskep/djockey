<!--
  DO NOT EDIT THIS FILE DIRECTLY!
  It is generated by djockey.
-->
- [Static Files](../basics/static_files.md#Static-Files)
  - [Links to static
    files](../basics/static_files.md#Links-to-static-files)

<div id="Static-Files" class="section" id="Static-Files">

# Static Files

One design goal of Djockey is to minimize the need to edit a config
file. In this spirit, all files that are not markup (i.e. not Markdown
or Djot) are copied to the output directory.

Any CSS and JavaScript files will be included in the HTML output. If
your CSS file ends in `.light.css` or `.dark.css`, it will only be
enabled for light or dark mode, respectively.

If you name any files the same as any files in Djockey’s template, your
files will overwrite Djockey’s files. Djockey uses a `dj-` prefix for
all its static files, so you’re unlikely to have a problem with this.

<div id="Links-to-static-files" class="section"
id="Links-to-static-files">

## Links to static files

If you link to a static file, the link will be verified at build time
and a warning will be printed if no file can be found at the given path.

</div>

</div>


| Previous | Next |
| - | - |
| [Linking](../basics/linking.md) | [Asides](../basics/asides.md) |