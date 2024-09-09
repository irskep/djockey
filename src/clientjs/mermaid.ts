import mermaid from "mermaid";

window.addEventListener("dj-onload", () => {
  const IS_DARK_MODE =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  // Replace all <pre><code class="language-mermaid">...</code></pre> with just <pre class="mermaid"></pre>
  [...document.querySelectorAll("pre code.language-mermaid")].map((codeEl) => {
    const parent = codeEl.parentElement!;
    parent.innerHTML = codeEl.innerHTML;
    parent.className = "language-mermaid";
  });

  mermaid.initialize({
    theme: IS_DARK_MODE ? "dark" : "default",
    darkMode: IS_DARK_MODE,
  });

  mermaid.run({ querySelector: ".language-mermaid" });
});
