import { useEffect } from "react";

export function useSeo({
  title,
  description,
  canonical,
  noindex = false,
  schema,
}: {
  title: string;
  description: string;
  canonical?: string;
  noindex?: boolean;
  schema?: object | object[];
}) {
  useEffect(() => {
    document.title = title;

    const setMeta = (selector: string, content: string) => {
      let el = document.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        const attr = selector.includes("[name=") ? "name" : "property";
        const val = selector.match(/["']([^"']+)["']/)?.[1] ?? "";
        el.setAttribute(attr, val);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', description);
    if (canonical) {
      setMeta('meta[property="og:url"]', canonical);
    }
    setMeta('meta[name="twitter:title"]', title);
    setMeta('meta[name="twitter:description"]', description);

    if (noindex) {
      setMeta('meta[name="robots"]', "noindex, nofollow");
    }

    // Canonical — only set when explicitly provided to avoid corrupted fallback URLs
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", canonical);
    }

    // Inject per-page JSON-LD schema using @graph (valid JSON-LD format)
    const schemaId = "dynamic-schema-ld";
    let scriptEl = document.getElementById(schemaId);
    if (schema) {
      if (!scriptEl) {
        scriptEl = document.createElement("script");
        scriptEl.id = schemaId;
        scriptEl.setAttribute("type", "application/ld+json");
        document.head.appendChild(scriptEl);
      }
      const schemas = Array.isArray(schema) ? schema : [schema];
      scriptEl.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@graph": schemas,
      });
    } else if (scriptEl) {
      scriptEl.remove();
    }
  }, [title, description, canonical, noindex, schema]);
}
