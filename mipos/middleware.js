export const config = { matcher: ['/', '/index.html'] };

export default function middleware(request) {
  const country = request.headers.get('x-vercel-ip-country');

  if (country === 'UY') {
    const url = new URL('/uy', request.url);
    url.search = new URL(request.url).search;
    return Response.redirect(url, 302);
  }
}
