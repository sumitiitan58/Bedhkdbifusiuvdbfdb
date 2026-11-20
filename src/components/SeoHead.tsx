import { useEffect } from 'react';
import { BRAND_CONFIG } from '../assets/brand';

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
    const origin =
      typeof window !== 'undefined' && window.location.origin.startsWith('http')
        ? window.location.origin
        : 'https://prepskm.in';
    const canonicalUrl = `https://prepskm.in${canonicalPath === '/' ? '/' : canonicalPath}`;
    const resolvedOgImage = ogImage ?? `${origin}${BRAND_CONFIG.ogImagePath}`;

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
    upsertMeta('name', 'twitter:card', 'summary_large_image');
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
