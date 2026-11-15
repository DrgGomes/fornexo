import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fornexo",
    short_name: "Fornexo",
    description: "Dropshipping para fornecedores e revendedores",
    start_url: "/entrar",
    display: "standalone",
    background_color: "#f6f6f7",
    theme_color: "#ffffff",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
