/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: [
      'hebbkx1anhila5yf.public.blob.vercel-storage.com',
      'ucarecdn.com',
      'oaidalleapiprodscus.blob.core.windows.net',
      'qivccyxywtxeyqswpohc.supabase.co'
    ],
  },
};

module.exports = nextConfig;
