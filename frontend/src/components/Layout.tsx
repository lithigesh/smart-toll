'use client';

import { Navbar } from '@/components/Navbar';
import { ReactNode } from 'react';

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 pt-16">
        <main className="container mx-auto px-4 py-6 md:px-6 md:py-8 max-w-7xl">
          {children}
        </main>
      </div>
    </>
  );
}
