# PPanel

Ein schlankes Admin-Interface für deinen Proxmox VE Cluster — im Look eines modernen Hosting-Control-Panels (dunkles Theme, orange Akzente, Karten-Layout), unter der Haube spricht es direkt mit der offiziellen Proxmox REST-API.

## Funktionen

- **Dashboard** mit Cluster-Auslastung (CPU/RAM/Disk), Node-Status, laufenden/gestoppten Gästen
- **Virtuelle Maschinen** (QEMU/KVM) und **Container** (LXC) als durchsuchbare Karten mit Live-Status, Ressourcennutzung, Start/Stop/Reboot/Shutdown
- **Detailseite** je VM/Container mit vollständiger Konfiguration und eingebetteter **VNC-Konsole** (noVNC) direkt im Browser
- **Erstellen-Assistent** für neue VMs (aus ISO) und Container (aus LXC-Template)
- **Storage**- und **Nodes**-Übersicht mit Belegungsanzeige

Alle Aktionen (Start/Stop/Reboot/Erstellen/Konsole) wirken **live** auf deinen echten Proxmox-Server über die REST-API — es gibt keinen Mock-Modus.

## Einrichtung

1. Abhängigkeiten installieren:

   ```bash
   npm install
   ```

2. Proxmox-API-Token anlegen:

   In der Proxmox-Weboberfläche unter **Datacenter → Permissions → API Tokens** einen neuen Token für einen Benutzer (z.B. `root@pam`) erstellen. Notiere dir Token-ID (`user@realm!tokenname`) und das Secret.

   Empfohlen: Dem Token per **Permissions → Add** eigene Rechte geben (statt "Privilege Separation" zu deaktivieren), mindestens:
   `VM.Audit`, `VM.PowerMgmt`, `VM.Console`, `VM.Allocate`, `VM.Config.Disk`, `Datastore.Audit`, `Datastore.AllocateSpace`, `Sys.Audit`.

3. `.env.local` aus der Vorlage erstellen:

   ```bash
   cp .env.example .env.local
   ```

   und die Werte eintragen (`PROXMOX_HOST`, `PROXMOX_TOKEN_ID`, `PROXMOX_TOKEN_SECRET`, ggf. `PROXMOX_PORT`/`PROXMOX_VERIFY_SSL`).

4. Entwicklungsserver starten:

   ```bash
   npm run dev
   ```

   Öffne [http://localhost:3000](http://localhost:3000).

## Architektur

- **Next.js App Router** (TypeScript, Tailwind CSS v4)
- `src/lib/proxmox/` — Server-seitiger Proxmox-API-Client (Auth per `PVEAPIToken`-Header, TLS-Verify optional abschaltbar für selbstsignierte Proxmox-Zertifikate)
- `src/app/api/` — Next.js Route-Handler, die als Proxy zur Proxmox-API dienen (Zugangsdaten bleiben serverseitig, Frontend sieht sie nie)
- `server.js` — Custom Node-Server, weil die VNC-Konsole einen echten WebSocket-Proxy braucht: der Browser verbindet sich mit `/ws/console/...` auf diesem Server, der die Verbindung serverseitig (mit `Authorization`-Header, den Browser-WebSockets nicht setzen können) zum Proxmox-`vncwebsocket`-Endpunkt weiterreicht.

## Hinweis zur Konsole

Die VNC-Konsole nutzt [noVNC](https://github.com/novnc/noVNC) und den offiziellen Proxmox-`vncproxy`/`vncwebsocket`-Ablauf. Da dies gegen deinen eigenen Proxmox-Server läuft, teste die Konsolen-Funktion einmal gegen deine Umgebung — je nach Proxmox-Version/Netzwerksetup (Firewall, Reverse-Proxy vor PPanel) kann die WebSocket-Verbindung angepasst werden müssen.
