import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  ogType?: 'website' | 'article' | 'profile';
  ogImage?: string;
  robots?: string;
  noindex?: boolean;
}

const SITE_NAME = 'YogaVibe';
const SITE_URL =
  (typeof window !== 'undefined'
    ? window.location.origin
    : 'https://yogavibe.example.com'
  ).replace(/\/$/, '');
const DEFAULT_OG_IMAGE = '/assets/images/background_img.jpg';

const ensureMetaTag = (attr: 'name' | 'property', value: string): HTMLMetaElement => {
  const selector = `meta[${attr}="${value}"]`;
  let tag = document.head.querySelector(selector) as HTMLMetaElement | null;

  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, value);
    document.head.appendChild(tag);
  }

  return tag;
};

const ensureCanonicalTag = (): HTMLLinkElement => {
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;

  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }

  return link;
};

const toAbsoluteUrl = (pathOrUrl: string): string => {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const normalizedPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${SITE_URL}${normalizedPath}`;
};

export const useSeo = ({
  title,
  description,
  canonicalPath,
  ogType = 'website',
  ogImage = DEFAULT_OG_IMAGE,
  robots,
  noindex = false,
}: SeoConfig): void => {
  const location = useLocation();

  useEffect(() => {
    const canonical = toAbsoluteUrl(canonicalPath || location.pathname);
    const absoluteImage = toAbsoluteUrl(ogImage);
    const robotsValue = robots || (noindex ? 'noindex, nofollow' : 'index, follow');
    const finalTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;

    document.title = finalTitle;

    ensureMetaTag('name', 'description').setAttribute('content', description);
    ensureMetaTag('name', 'robots').setAttribute('content', robotsValue);

    ensureMetaTag('property', 'og:title').setAttribute('content', finalTitle);
    ensureMetaTag('property', 'og:description').setAttribute('content', description);
    ensureMetaTag('property', 'og:type').setAttribute('content', ogType);
    ensureMetaTag('property', 'og:url').setAttribute('content', canonical);
    ensureMetaTag('property', 'og:site_name').setAttribute('content', SITE_NAME);
    ensureMetaTag('property', 'og:locale').setAttribute('content', 'ru_RU');
    ensureMetaTag('property', 'og:image').setAttribute('content', absoluteImage);

    ensureMetaTag('name', 'twitter:card').setAttribute('content', 'summary_large_image');
    ensureMetaTag('name', 'twitter:title').setAttribute('content', finalTitle);
    ensureMetaTag('name', 'twitter:description').setAttribute('content', description);
    ensureMetaTag('name', 'twitter:image').setAttribute('content', absoluteImage);

    ensureCanonicalTag().setAttribute('href', canonical);
  }, [canonicalPath, description, location.pathname, noindex, ogImage, ogType, robots, title]);
};
