import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/profile',
        destination: '/member/profile',
        permanent: false,
      },
      {
        source: '/spaces',
        destination: '/member/spaces',
        permanent: false,
      },
      {
        source: '/spaces/:id',
        destination: '/member/spaces/:id',
        permanent: false,
      },
      {
        source: '/my-reservations',
        destination: '/member/reservasi',
        permanent: false,
      },
      {
        source: '/my-reservations/:id',
        destination: '/member/reservasi/:id',
        permanent: false,
      },
      {
        source: '/my-reservations/:id/ticket',
        destination: '/member/reservasi/:id',
        permanent: false,
      },
      {
        source: '/member/ticket/:id',
        destination: '/member/reservasi/:id',
        permanent: false,
      },
      {
        source: '/login',
        destination: '/Auth/login',
        permanent: false,
      },
      {
        source: '/register',
        destination: '/Auth/register',
        permanent: false,
      },
      {
        source: '/registeradmin',
        destination: '/Auth/registeradmin',
        permanent: false,
      },
      {
        source: '/admin',
        destination: '/admin/dashboard',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
