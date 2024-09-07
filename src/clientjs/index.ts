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
    el.addEventListener("click", (e) => {
      const target = el.parentElement?.querySelector(`#${targetID}`);
      if (!target) {
        console.error("Can't find", `#${targetID}`);
        return;
      }
      target.classList.toggle("m-collapsed");
      el.classList.remove("m-uncollapsed");
      el.classList.remove("m-collapsed");
      el.classList.add(
        target.classList.contains("m-collapsed")
          ? "m-collapsed"
          : "m-uncollapsed"
      );
      return true;
    });
  });

  window.dispatchEvent(new Event("dj-onload"));
};
