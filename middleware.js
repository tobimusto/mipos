export const config = { matcher: ['/', '/index.html'] };

export default function middleware(request) {
  const country = request.headers.get('x-vercel-ip-country');

  if (country === 'UY') {
    const url = new URL('/indexuy.html', request.url);
    return Response.redirect(url, 302);
  }
}
