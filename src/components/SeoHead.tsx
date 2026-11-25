import { useEffect } from 'react';
import { BRAND_CONFIG } from '../assets/brand';

import { CANONICAL_ORIGIN } from '../utils/seoHelpers';

interface SeoHeadProps {
  title: string;
  description: string;
  canonicalPath: string;
  keywords?: string;
  ogImage?: string;
  noIndex?: boolean;
  jsonLd?: Record<string, unknown>;
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function SeoHead({
  title,
  description,
  canonicalPath,
  keywords,
  ogImage,
  noIndex = false,
  jsonLd,
}: SeoHeadProps) {
  useEffect(() => {
    document.title = title;
    const normalizedPath = canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`;
    const canonicalUrl = `${CANONICAL_ORIGIN}${normalizedPath === '/' ? '/' : normalizedPath}`;
    const resolvedOgImage = ogImage ?? `${CANONICAL_ORIGIN}${BRAND_CONFIG.ogImagePath}`;

    upsertMeta('name', 'description', description);
    if (keywords) {
      upsertMeta('name', 'keywords', keywords);
    }
    upsertMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow');
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:site_name', BRAND_CONFIG.name);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:image', resolvedOgImage);
    upsertMeta('property', 'og:image:alt', `${title} — ${BRAND_CONFIG.name}`);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:site', BRAND_CONFIG.creatorHandle);
    upsertMeta('name', 'twitter:creator', BRAND_CONFIG.creatorHandle);
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', resolvedOgImage);

    let canonicalLink = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonicalUrl;

    // Remove static pre-rendered route JSON-LD before applying current SPA route JSON-LD
    document.getElementById('prepskm-ssr-ld')?.remove();

    const ldId = 'prepskm-route-jsonld';
    const existingScript = document.getElementById(ldId);
    if (jsonLd) {
      const script = existingScript ?? document.createElement('script');
      script.id = ldId;
      script.setAttribute('type', 'application/ld+json');
      script.textContent = JSON.stringify(jsonLd);
      if (!existingScript) {
        document.head.appendChild(script);
      }
    } else if (existingScript) {
      existingScript.remove();
    }
  }, [title, description, canonicalPath, keywords, ogImage, noIndex, jsonLd]);

  return null;
}
