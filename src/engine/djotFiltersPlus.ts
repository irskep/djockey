/*
Copyright (C) 2022 John MacFarlane

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/*
  From https://github.com/jgm/djot.js/blob/f7b2981/src/filter.ts

  Steve's modifications:
  - Add wildcard filter ('*')
  - Export more types
 */

import { AstNode, Doc, HasChildren } from "@djot/djot";

type Transform = (
  node: any
) => void | AstNode | AstNode[] | { stop: void | AstNode | AstNode[] };
type Action = Transform | { enter: Transform; exit?: Transform };
type FilterPart = Record<string, Action>;
type Filter = () => FilterPart | FilterPart[];

class Walker {
  finished = false;
  top: AstNode;
  current: AstNode;
  stack: { node: HasChildren<AstNode>; childIndex: number }[] = [];
  enter = true;

  constructor(node: AstNode) {
    this.top = node;
    this.current = node;
  }

  walk(callback: (walker: Walker) => void) {
    while (!this.finished) {
      callback(this); // apply the action to current this state
      const topStack = this.stack && this.stack[this.stack.length - 1];
      if (this.enter) {
        if ("children" in this.current && this.current.children.length > 0) {
          // move to first child
          this.stack.push({ node: this.current, childIndex: 0 });
          this.current = this.current.children[0];
          this.enter = true;
        } else {
          // no children, set to exit
          this.enter = false;
        }
      } else {
        // exit
        if (topStack) {
          // try next sibling
          topStack.childIndex++;
          const nextChild = topStack.node.children[topStack.childIndex];
          if (nextChild) {
            this.current = nextChild;
            this.enter = true;
          } else {
            this.stack.pop();
            // go up to parent
            this.current = topStack.node as AstNode;
            this.enter = false;
          }
        } else {
          this.finished = true;
        }
      }
    }
  }
}

const applyFilterPartToNode = function (
  node: AstNode,
  enter: boolean,
  trans?: Action
): ReturnType<Transform> | boolean {
  if (!node || !node.tag) {
    throw new Error("Filter called on a non-node.");
  }
  if (!trans) {
    return false;
  }
  let transform;
  if (enter) {
    if ("enter" in trans && trans.enter) {
      transform = trans.enter;
    }
  } else {
    if ("exit" in trans && trans.exit) {
      transform = trans.exit;
    } else {
      transform = trans;
    }
  }
  if (typeof transform === "function") {
    return transform(node);
  }
};

// Returns the node for convenience (but modifies it in place).
const traverse = function (node: AstNode, filterpart: FilterPart): AstNode {
  new Walker(node).walk((walker) => {
    function processResult(result: ReturnType<typeof applyFilterPartToNode>) {
      const stackTop = walker.stack[walker.stack.length - 1];
      if (typeof result === "object" && "stop" in result && result.stop) {
        result = result.stop;
        walker.enter = false; // set to exit, which stops traversal of children
      }
      if (result) {
        if (Array.isArray(result)) {
          if (stackTop) {
            stackTop.node.children.splice(stackTop.childIndex, 1, ...result);
            // next line is needed for cases where we delete an element
            walker.current = stackTop.node.children[stackTop.childIndex];
            // adjust childIndex to skip multiple items added;
            if (result.length > 1) {
              stackTop.childIndex += result.length - 1;
            }
          } else {
            throw Error("Cannot replace top node with multiple nodes");
          }
        } else if (
          typeof result === "object" &&
          "tag" in result &&
          result.tag
        ) {
          if (stackTop) {
            stackTop.node.children[stackTop.childIndex] = result;
          } else {
            return result;
          }
        }
      }
    }

    processResult(
      applyFilterPartToNode(
        walker.current,
        walker.enter,
        filterpart[walker.current.tag]
      )
    );

    processResult(
      applyFilterPartToNode(walker.current, walker.enter, filterpart["*"])
    );
  });

  return node;
};

// Apply a filter to a document.
const applyFilter = function (doc: Doc, filter: Filter): void {
  const f: FilterPart | FilterPart[] = filter();
  let filterparts;
  if (Array.isArray(f)) {
    filterparts = f;
  } else {
    filterparts = [f];
  }
  for (const f of filterparts) {
    traverse(doc, f);
    for (const i in doc.footnotes) {
      traverse(doc.footnotes[i], f);
    }
    for (const i in doc.references) {
      traverse(doc.references[i], f);
    }
  }
};

const applyFilterToFragment = function (root: AstNode, filter: Filter): void {
  const f: FilterPart | FilterPart[] = filter();
  let filterparts;
  if (Array.isArray(f)) {
    filterparts = f;
  } else {
    filterparts = [f];
  }
  for (const f of filterparts) {
    traverse(root, f);
  }
};

function processAllNodes(doc: Doc, action: Action) {
  applyFilter(doc, () => ({ "*": action }));
}

export type { Action, FilterPart, Filter, Transform };
export { applyFilter, applyFilterToFragment, processAllNodes };

// Extra exports
export type { Walker };
export { traverse };
