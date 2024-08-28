import mermaid from "mermaid";

window.onload = () => {
  /* MERMAID */

  // Replace all <pre><code class="language-mermaid">...</code></pre> with just <pre class="mermaid"></pre>
  [...document.querySelectorAll("pre code.language-mermaid")].map((codeEl) => {
    const parent = codeEl.parentElement!;
    parent.innerHTML = codeEl.innerHTML;
    parent.className = "language-mermaid";
  });

  mermaid.run({ querySelector: ".language-mermaid" });
};
