const SVG_ARROW_DROP_RIGHT_LINE =
  '<svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M13.1717 12.0007L8.22192 7.05093L9.63614 5.63672L16.0001 12.0007L9.63614 18.3646L8.22192 16.9504L13.1717 12.0007Z"></path></svg>';
const SVG_ARROW_DROP_DOWN_LINE =
  '<svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11.9999 13.1714L16.9497 8.22168L18.3639 9.63589L11.9999 15.9999L5.63599 9.63589L7.0502 8.22168L11.9999 13.1714Z"></path></svg>';
window.onload = () => {
  /* TAB GROUPS */

  document.querySelectorAll(".tab-group").forEach((tabsEl) => {
    tabsEl.querySelectorAll(".dj-tab-heading").forEach((el) => {
      const contentCls = (el as HTMLElement).dataset.tabId;
      const groupCls = (el as HTMLElement).dataset.tabGroup;
      el.addEventListener("click", (e) => {
        tabsEl.querySelectorAll("." + groupCls).forEach((contentEl) => {
          contentEl.classList.remove("m-active");
        });
        tabsEl.querySelectorAll("." + contentCls).forEach((contentEl) => {
          contentEl.classList.add("m-active");
        });
      });
    });
  });

  /* CLOSE ON-THIS-PAGE POPOVER WHEN CLICKING LINKS INSIDE IT */

  document
    .querySelectorAll("details.DJTableOfContents")
    .forEach((popoverEl) => {
      popoverEl.querySelectorAll("a").forEach((linkEl) => {
        (linkEl as HTMLAnchorElement).addEventListener("click", (e) => {
          (popoverEl as HTMLDetailsElement).open = false;
          return true;
        });
      });
    });

  /* DJCOLLAPSE */

  document.querySelectorAll(".DJCollapse_Collapser").forEach((el) => {
    const targetID = (el as HTMLElement).dataset.collapseTarget;
    const target = el.parentElement?.querySelector(`#${targetID}`);
    if (!target) {
      console.error("Can't find", `#${targetID}`);
      return;
    }

    const iconEl = document.createElement("div");
    iconEl.className = "DJCollapse_Collapser_Marker";
    el.appendChild(iconEl);

    function applyChanges() {
      el.classList.remove("m-uncollapsed");
      el.classList.remove("m-collapsed");
      const isCollapsed = target!.classList.contains("m-collapsed");
      el.classList.add(isCollapsed ? "m-collapsed" : "m-uncollapsed");

      iconEl.innerHTML = isCollapsed
        ? SVG_ARROW_DROP_RIGHT_LINE
        : SVG_ARROW_DROP_DOWN_LINE;
    }

    el.addEventListener("click", (e) => {
      target.classList.toggle("m-collapsed");
      applyChanges();
      return true;
    });

    applyChanges();
  });

  window.dispatchEvent(new Event("dj-onload"));
};
