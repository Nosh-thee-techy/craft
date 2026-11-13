# PayPal Invoicing API — address fields (checked before wiring)

Source: [PayPal Invoicing API v2](https://developer.paypal.com/docs/api/invoicing/v2/) (docs reachable 13 Nov 2026).

## What the API accepts

Both **invoicer** and **primary_recipients[].billing_info** support an `address` object:

| Field | Meaning |
|---|---|
| `address_line_1` | Street / road (required when address present) |
| `address_line_2` | Building / suite (optional) |
| `admin_area_2` | City / town |
| `admin_area_1` | State / county / province |
| `postal_code` | Postal code (often empty for Kenya landmark addresses) |
| `country_code` | ISO-3166-1 alpha-2 (e.g. `KE`) |

There is **no** official “landmark” or “estate” field. Landmark/estate belong in `address_line_1` / `address_line_2` as free text.

## CRAFT wiring rule

- Store typed CRAFT fields + immutable `seller_location_snapshot` locally.
- When sending to PayPal, map: estate/road → `address_line_1`, building/landmark → `address_line_2`, town → `admin_area_2`, county → `admin_area_1`, country → `country_code`.
- Never capture GPS or IP for location.
