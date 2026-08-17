/**
 * What `orders.address` / `orders.delivery_address` hold when the customer is
 * collecting the order from the shop instead of having it delivered.
 *
 * There is no `pickup` column on `orders`, so this placeholder is how a pickup
 * order is recognised — by the checkout action that writes it, by
 * `resolveDeliveryFee()`, and by staff reading the orders table.
 *
 * Deliberately *not* in `$lib/server`: the checkout page shows the same wording
 * it will be saved under, and the two must not drift apart.
 */
export const PICKUP_LABEL = 'Store Pickup';
