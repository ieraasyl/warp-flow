# warp-flow

[Flow Launcher](https://www.flowlauncher.com/) plugin to control **Cloudflare WARP** on Windows via `warp-cli.exe`: connect, disconnect, and show colocation / tunnel stats.

**Repository:** [github.com/ieraasyl/warp-flow](https://github.com/ieraasyl/warp-flow)

## Requirements

- Windows with [Cloudflare WARP](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) installed
- [Node.js](https://nodejs.org/) 18+ (build only)

## Usage

- Action keyword: **`warp`**
- Results: **Connect**, **Disconnect**, **WARP colocation** (uses `warp-cli stats`, with `warp-cli warp-stats` fallback)
- Filter colocation with substrings such as `colo`, `location`, `where`, `pop`, `edge`

Optional setting: path to `warp-cli.exe` (default: `C:\Program Files\Cloudflare\Cloudflare WARP\warp-cli.exe`).

## Build and install

```bash
npm install
npm run build
```

Copy the project folder (including `main.js`, `plugin.json`, `Images/`, `SettingsTemplate.yaml`) into:

`%APPDATA%\FlowLauncher\Plugins\WARP\`

Then use **Reload Plugin Data** in Flow Launcher.

## Plugin Store

Available in the Flow Launcher plugin store — search for **WARP**.

## License

MIT — see [LICENSE](LICENSE).
