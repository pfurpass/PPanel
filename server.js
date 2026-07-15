const { createServer } = require("node:http");
const { parse } = require("node:url");
const next = require("next");
const { WebSocketServer, WebSocket } = require("ws");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const CONSOLE_WS_RE = /^\/ws\/console\/([^/]+)\/(qemu|lxc)\/(\d+)$/;

function proxmoxWsUrl(node, type, vmid, query) {
  const host = process.env.PROXMOX_HOST;
  const pveport = process.env.PROXMOX_PORT || "8006";
  const port = query.get("port");
  const ticket = query.get("ticket");
  return `wss://${host}:${pveport}/api2/json/nodes/${encodeURIComponent(node)}/${type}/${vmid}/vncwebsocket?port=${encodeURIComponent(
    port
  )}&vncticket=${encodeURIComponent(ticket)}`;
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res, parse(req.url, true));
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (req, socket, head) => {
    const { pathname, query } = parse(req.url, true);
    const match = pathname && pathname.match(CONSOLE_WS_RE);

    if (!match) {
      const nextUpgrade = app.getUpgradeHandler?.();
      if (nextUpgrade) {
        nextUpgrade(req, socket, head);
      } else {
        socket.destroy();
      }
      return;
    }

    const [, node, type, vmid] = match;
    const searchParams = new URLSearchParams(query);
    const tokenId = process.env.PROXMOX_TOKEN_ID;
    const tokenSecret = process.env.PROXMOX_TOKEN_SECRET;
    const verifySsl = (process.env.PROXMOX_VERIFY_SSL || "false").toLowerCase() === "true";

    if (!process.env.PROXMOX_HOST || !tokenId || !tokenSecret) {
      socket.destroy();
      return;
    }

    const upstreamUrl = proxmoxWsUrl(node, type, vmid, searchParams);
    const upstream = new WebSocket(upstreamUrl, "binary", {
      headers: { Authorization: `PVEAPIToken=${tokenId}=${tokenSecret}` },
      rejectUnauthorized: verifySsl,
    });

    upstream.on("open", () => {
      wss.handleUpgrade(req, socket, head, (client) => {
        client.on("message", (data) => {
          if (upstream.readyState === WebSocket.OPEN) upstream.send(data);
        });
        upstream.on("message", (data) => {
          if (client.readyState === WebSocket.OPEN) client.send(data);
        });

        const cleanup = () => {
          if (client.readyState === WebSocket.OPEN) client.close();
          if (upstream.readyState === WebSocket.OPEN) upstream.close();
        };
        client.on("close", cleanup);
        client.on("error", cleanup);
        upstream.on("close", cleanup);
        upstream.on("error", cleanup);
      });
    });

    upstream.on("error", (err) => {
      console.error("Proxmox VNC upstream error:", err.message);
      socket.destroy();
    });
  });

  server.listen(port, () => {
    console.log(`> PPanel ready on http://${hostname}:${port}`);
  });
});
