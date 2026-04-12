"""
SEO technical support:
  - GET /robots.txt       — crawl rules  (3.2)
  - GET /sitemap.xml      — public URL index  (3.1)
  - GET /api/v1/seo/mentor/{mentor_id}/jsonld — JSON-LD structured data  (3.4)

HTTP-status conventions (3.3) are enforced via shared exception handlers
registered in main.py.
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response as FastAPIResponse, status
from fastapi.responses import PlainTextResponse, Response
from sqlalchemy.orm import Session

import crud
from database import get_db

router = APIRouter(tags=["seo"])

SITE_URL = "https://yogavibe.example.com"

_PUBLIC_ROUTES = [
    "/",
    "/auth/login",
    "/auth/register",
]

@router.get("/robots.txt", response_class=PlainTextResponse, include_in_schema=False)
def robots_txt(response: FastAPIResponse) -> str:
    """Serve robots.txt with crawl directives."""
    # 4.3 Cache for 1 day in CDN/browsers
    response.headers["Cache-Control"] = "public, max-age=86400"
    disallow_prefixes = [
        "/mentors",           # user dashboard (requires auth)
        "/booking/",          # booking flows
        "/mentor/dashboard",
        "/mentor/profile/",
        "/admin/",
        "/api/",
    ]
    disallow_lines = "\n".join(f"Disallow: {p}" for p in disallow_prefixes)

    return (
        "User-agent: *\n"
        "Allow: /\n"
        "Allow: /auth/login\n"
        "Allow: /auth/register\n"
        f"{disallow_lines}\n"
        "\n"
        f"Sitemap: {SITE_URL}/sitemap.xml\n"
    )

@router.get("/sitemap.xml", response_class=Response, include_in_schema=False)
def sitemap_xml() -> Response:
    """Return a static sitemap for public indexable pages."""
    lastmod = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Priority weights per route type
    priority_map = {
        "/": "1.0",
        "/auth/login": "0.3",
        "/auth/register": "0.3",
    }
    changefreq_map = {
        "/": "weekly",
        "/auth/login": "monthly",
        "/auth/register": "monthly",
    }

    url_entries = []
    for route in _PUBLIC_ROUTES:
        priority = priority_map.get(route, "0.5")
        changefreq = changefreq_map.get(route, "monthly")
        url_entries.append(
            f"  <url>\n"
            f"    <loc>{SITE_URL}{route}</loc>\n"
            f"    <lastmod>{lastmod}</lastmod>\n"
            f"    <changefreq>{changefreq}</changefreq>\n"
            f"    <priority>{priority}</priority>\n"
            f"  </url>"
        )

    xml_body = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(url_entries)
        + "\n</urlset>\n"
    )

    return Response(
        content=xml_body,
        media_type="application/xml",
        headers={"Cache-Control": "public, max-age=3600"},  # 4.3 cache 1 hour
    )


# ---------------------------------------------------------------------------
# 3.4  JSON-LD structured data — Person (yoga mentor)
# ---------------------------------------------------------------------------
@router.get(
    "/api/v1/seo/mentor/{mentor_id}/jsonld",
    summary="JSON-LD structured data for a mentor profile",
    response_model=None,
)
def mentor_jsonld(
    mentor_id: int,
    db: Session = Depends(get_db),
):
    """
    Returns Schema.org JSON-LD markup for a mentor as a Person + Offer.
    Intended to be embedded in the page <script type="application/ld+json">.
    """
    mentor = crud.mentor_crud.get_mentor(db, mentor_id)

    if mentor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ментор с id={mentor_id} не найден",
        )

    if not mentor.is_available:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail=f"Ментор с id={mentor_id} больше не доступен",
        )

    profile_url = f"{SITE_URL}/mentors/{mentor_id}"
    photo: Optional[str] = mentor.photo_url

    jsonld: dict = {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": mentor.name,
        "description": mentor.description or "",
        "url": profile_url,
        "address": {
            "@type": "PostalAddress",
            "addressLocality": mentor.city,
            "addressCountry": "RU",
        },
        "hasOccupation": {
            "@type": "Occupation",
            "name": "Инструктор по йоге",
            "description": mentor.yoga_style or "",
            "occupationLocation": {
                "@type": "City",
                "name": mentor.city,
            },
        },
        "makesOffer": {
            "@type": "Offer",
            "name": f"Индивидуальные занятия йогой — {mentor.yoga_style}",
            "price": str(mentor.price),
            "priceCurrency": "RUB",
            "availability": "https://schema.org/InStock",
            "seller": {
                "@type": "Person",
                "name": mentor.name,
            },
        },
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": str(round(mentor.rating, 1)),
            "bestRating": "5",
            "worstRating": "1",
            "ratingCount": "1",
        },
    }

    if photo:
        jsonld["image"] = photo

    return jsonld
