export default {
  name: "djot",
  patterns: [
    {
      include: "#inline",
    },
    {
      include: "#block",
    },
  ],
  repository: {
    block: {
      patterns: [
        {
          include: "#heading",
        },
        {
          include: "#blockquote",
        },
        {
          include: "#codeblock",
        },
        {
          include: "#inlinelink",
        },
        {
          include: "#referencelink",
        },
        {
          include: "#djotautolinkurl",
        },
      ],
    },
    inline: {
      patterns: [
        {
          include: "#emphasis",
        },
        {
          include: "#strong",
        },
        {
          include: "#codespan",
        },
        {
          include: "#attributes",
        },
        {
          include: "#rawattribute",
        },
        {
          include: "#insert",
        },
        {
          include: "#delete",
        },
        {
          include: "#superscript",
        },
        {
          include: "#subscript",
        },
        {
          include: "#highlight",
        },
        {
          include: "#math",
        },
        {
          include: "#smartquote",
        },
        {
          include: "#emoji",
        },
        {
          include: "#escape",
        },
        {
          include: "#footnoteref",
        },
        {
          include: "#span",
        },
      ],
    },
    heading: {
      match: "(?:^|\\G)#+ .*$",
      captures: {
        0: {
          patterns: [
            {
              match: "^(#{6}) +(.*)$",
              name: "markup.heading.6.djot",
              captures: {
                1: {
                  name: "punctuation.definition.heading.djot",
                },
                2: {
                  name: "entity.name.section.djot",
                  patterns: [
                    {
                      include: "#inline",
                    },
                  ],
                },
                3: {
                  name: "punctuation.definition.heading.djot",
                },
              },
            },
            {
              match: "^(#{5}) +(.*)$",
              name: "markup.heading.5.djot",
              captures: {
                1: {
                  name: "punctuation.definition.heading.djot",
                },
                2: {
                  name: "entity.name.section.djot",
                  patterns: [
                    {
                      include: "#inline",
                    },
                  ],
                },
                3: {
                  name: "punctuation.definition.heading.djot",
                },
              },
            },
            {
              match: "^(#{4}) +(.*)$",
              name: "markup.heading.4.djot",
              captures: {
                1: {
                  name: "punctuation.definition.heading.djot",
                },
                2: {
                  name: "entity.name.section.djot",
                  patterns: [
                    {
                      include: "#inline",
                    },
                  ],
                },
                3: {
                  name: "punctuation.definition.heading.djot",
                },
              },
            },
            {
              match: "^(#{3}) +(.*)$",
              name: "markup.heading.3.djot",
              captures: {
                1: {
                  name: "punctuation.definition.heading.djot",
                },
                2: {
                  name: "entity.name.section.djot",
                  patterns: [
                    {
                      include: "#inline",
                    },
                  ],
                },
                3: {
                  name: "punctuation.definition.heading.djot",
                },
              },
            },
            {
              match: "^(#{2}) +(.*)$",
              name: "markup.heading.2.djot",
              captures: {
                1: {
                  name: "punctuation.definition.heading.djot",
                },
                2: {
                  name: "entity.name.section.djot",
                  patterns: [
                    {
                      include: "#inline",
                    },
                  ],
                },
                3: {
                  name: "punctuation.definition.heading.djot",
                },
              },
            },
            {
              match: "^(#{1}) +(.*)$",
              name: "markup.heading.1.djot",
              captures: {
                1: {
                  name: "punctuation.definition.heading.djot",
                },
                2: {
                  name: "entity.name.section.djot",
                  patterns: [
                    {
                      include: "#inline",
                    },
                  ],
                },
                3: {
                  name: "punctuation.definition.heading.djot",
                },
              },
            },
          ],
        },
      },
    },
    blockquote: {
      name: "markup.quote.djot",
      begin: "^\\s*> ",
      while: "^\\s*>(?:\\s|$)",
    },
    math: {
      name: "markup.other.math.djot",
      begin: "[$][$]?(``*)",
      end: "\\1|^\\s*$",
      contentName: "meta.embedded.math.djot",
    },
    codespan: {
      name: "markup.fenced_code.line.djot",
      begin: "(``*)",
      end: "\\1|^\\s*$",
    },
    "attribute-comment": {
      name: "comment.block.percentage.djot",
      begin: "%",
      end: "%",
    },
    string: {
      name: "string.quoted.double.djot",
      begin: '"',
      end: '"',
      patterns: [
        {
          include: "#escape",
        },
      ],
    },
    attributes: {
      name: "entity.other.attribute-name.djot",
      begin: "{(?=[^\\[\\]_*'\\\"=~\\\\+-])",
      end: "}",
      beginCaptures: {
        0: {
          name: "punctuation.definition.attribute-name.begin.djot",
        },
      },
      endCaptures: {
        0: {
          name: "punctuation.definition.attribute-name.end.djot",
        },
      },
      patterns: [
        {
          include: "#string",
        },
        {
          include: "#attribute-comment",
        },
      ],
    },
    emphasis: {
      name: "markup.italic.djot",
      begin: "_(?=[^\\s}])|{_",
      end: "_}|(?=[^\\s{])_|^\\s*$",
      patterns: [
        {
          include: "#inline",
        },
      ],
    },
    strong: {
      name: "markup.bold.djot",
      begin: "\\*(?=[^\\s}])|{\\*",
      end: "\\*}|(?=[^\\s{])\\*|^\\s*$",
      patterns: [
        {
          include: "#inline",
        },
      ],
    },
    superscript: {
      name: "markup.other.superscript.djot",
      begin: "\\^(?=[^\\s}])|{\\^",
      end: "\\^}|(?=[^\\s{])\\^|^\\s*$",
      patterns: [
        {
          include: "#inline",
        },
      ],
    },
    subscript: {
      name: "markup.other.subscript.djot",
      begin: "~(?=[^\\s}])|{~",
      end: "~}|(?=[^\\s{])~|^\\s*$",
      patterns: [
        {
          include: "#inline",
        },
      ],
    },
    highlight: {
      name: "markup.highlight.djot",
      begin: "{=",
      end: "=}|^\\s*$",
      patterns: [
        {
          include: "#inline",
        },
      ],
    },
    rawattribute: {
      name: "entity.other.attribute-name.raw.djot",
      match: "(?<=`){=[A-Za-z0-9]*}",
    },
    insert: {
      name: "markup.insert.djot",
      begin: "{\\+",
      end: "\\+}|^\\s*$",
      patterns: [
        {
          include: "#inline",
        },
      ],
    },
    delete: {
      name: "markup.strikethrough.djot",
      begin: "{-",
      end: "-}|^\\s*$",
      patterns: [
        {
          include: "#inline",
        },
      ],
    },
    inlinelink: {
      name: "markup.other.inlinelink.djot",
      begin: "\\[([^]]+)\\]\\(",
      end: "\\)|^\\s*$",
      contentName: "markup.underline.link.djot",
      beginCaptures: {
        1: {
          patterns: [
            {
              include: "#inline",
            },
          ],
        },
      },
    },
    referencelink: {
      name: "markup.other.referencelink.djot",
      match:
        "\\[(?:[^\\]\\\\]|\\\\[\\]\\\\]|[\\r\\n])*\\]\\[((?:[^]\\\\]|\\\\[]\\\\])*)\\]",
      captures: {
        1: {
          name: "markup.underline.link.djot",
        },
      },
      patterns: [
        {
          include: "#inline",
        },
      ],
    },
    span: {
      name: "markup.other.span.djot",
      match: "\\[(?:[^\\]\\\\]|\\\\[\\]\\\\]|[\\r\\n])*\\](?=[{])",
      patterns: [
        {
          include: "#inline",
        },
      ],
    },
    footnoteref: {
      name: "meta.link.reference.djot",
      match: "\\[(\\^[^]]*)\\]",
      captures: {
        1: {
          name: "string.other.link.title.djot",
        },
      },
    },
    emoji: {
      name: "constant.character.other.emoji.djot",
      match: ":[a-zA-Z0-9_+-]+:",
    },
    escape: {
      name: "constant.character.escape.djot",
      match: "\\\\[\\r\\n ~!@#$%^&*(){}`\\[\\]/=\\\\?+|'\",<-]",
    },
    linkurl: {
      name: "markup.underline.link.djot",
      match: "([a-zA-z]+://)?\\S+(\\.\\S)+",
    },
    emali: {
      name: "markup.underline.link.djot",
      match: "^\\w+([-+.]\\w+)*@\\w+([-.]\\w+)*\\.\\w+([-.]\\w+)*$",
    },
    djotautolinkurl: {
      name: "markup.raw.djotautolinkurl.djot",
      begin: "<",
      end: ">",
      patterns: [
        {
          include: "#linkurl",
        },
        {
          include: "#email",
        },
      ],
    },
    codeblock: {
      name: "markup.fenced_code.block.djot",
      begin: "^\\s*(````*)\\s*=?\\w*\\s*$",
      end: "^\\s*\\1`*\\s*$",
    },
  },
  scopeName: "source.djot",
};
