# Adapter authoring

Adapters should be pure functions over a `Document` and return the shared extraction shape. Match the hostname first, prefer stable structured data, cap extracted strings, and return a confidence score. Generic JSON-LD, microdata, Open Graph, and heuristic extraction remain the fallback.

Retailer-specific adapters belong under `src/adapters/<retailer>`. Add a fixture and a focused test for sale, unavailable, and variant states. Never add executable remote adapter code.
