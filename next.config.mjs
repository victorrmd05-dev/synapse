/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Empacota a biblioteca de DESIGN.md no bundle serverless para que o motor
  // de injeção dinâmica (src/lib/design/brandReferences.ts) consiga ler os
  // arquivos em runtime via fs no deploy (ex: Vercel/standalone).
  // Em Next 14 esta chave vive sob `experimental`.
  experimental: {
    outputFileTracingIncludes: {
      "/api/design/**": [
        "./agentes/designer-webmaster/references/awesome-design-md/design-md/**/DESIGN.md",
      ],
    },
  },
};

export default nextConfig;
