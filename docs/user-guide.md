# User guide

1. Open a product page.
2. Confirm the detected title and price in the PriceRadar overlay.
3. Select **Track this price**.
4. Open the popup to review tracked products.

Screenshots will be added after the full dashboard phase.

Run locally
Open PowerShell in:
cd "C:\Users\anike\OneDrive\Desktop\PriceTracker"
Install dependencies:
npm.cmd install
Build the extension:
npm.cmd run build


Test it manually
Open a product page containing a visible price.
The PriceRadar overlay should appear.
Click Track this price.
Open the extension popup.
The tracked item and current price should be listed.
To inspect the service worker, open chrome://extensions, find PriceRadar, and click Service worker.
Run automated checks

npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build