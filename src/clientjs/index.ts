import mermaid from "mermaid";

window.onload = () => {
  /* MERMAID */

  // It would probably be better to run Mermaid at build time and generate static SVGs,
  // but this is a good test of the client-side JS workflow, so this is how it is for
  // now.

  // Replace all <pre><code class="language-mermaid">...</code></pre> with just <pre class="mermaid"></pre>
  [...document.querySelectorAll("pre code.language-mermaid")].map((codeEl) => {
    const parent = codeEl.parentElement!;
    parent.innerHTML = codeEl.innerHTML;
    parent.className = "language-mermaid";
  });

  mermaid.run({ querySelector: ".language-mermaid" });
};