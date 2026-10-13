export function pageHead(title: string, description: string) {
  return { meta: [
    { title: `${title} — Pontual+` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — Pontual+` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] };
}