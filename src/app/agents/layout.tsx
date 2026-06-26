import React from 'react';

// A página Agents Config vive dentro do shell global do app (Sidebar + main do
// RootLayout). Este layout é só um passthrough — antes ele criava uma segunda
// sidebar própria, que duplicava a navegação.
export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
