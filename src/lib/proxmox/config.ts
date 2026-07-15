function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill in your Proxmox connection details.`
    );
  }
  return value;
}

export const proxmoxConfig = {
  host: () => required("PROXMOX_HOST"),
  port: () => process.env.PROXMOX_PORT ?? "8006",
  tokenId: () => required("PROXMOX_TOKEN_ID"),
  tokenSecret: () => required("PROXMOX_TOKEN_SECRET"),
  verifySsl: () => (process.env.PROXMOX_VERIFY_SSL ?? "false").toLowerCase() === "true",
  defaultNode: () => process.env.PROXMOX_DEFAULT_NODE ?? undefined,
};

export function isProxmoxConfigured(): boolean {
  return Boolean(
    process.env.PROXMOX_HOST && process.env.PROXMOX_TOKEN_ID && process.env.PROXMOX_TOKEN_SECRET
  );
}

export function proxmoxApiBase(): string {
  return `https://${proxmoxConfig.host()}:${proxmoxConfig.port()}/api2/json`;
}

export function proxmoxAuthHeader(): string {
  return `PVEAPIToken=${proxmoxConfig.tokenId()}=${proxmoxConfig.tokenSecret()}`;
}
