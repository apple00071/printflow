import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/admin/', '/api/', '/shop/'],
    },
    sitemap: 'https://www.printflow.co.in/sitemap.xml',
  }
}
