<?php
/**
 * Public FLIPSART edition display data for Astro and WooCommerce.
 * Only exposes user-facing labels that are already intended to appear on product pages.
 */

if (!defined('ABSPATH')) {
    return;
}

add_action('rest_api_init', function () {
    register_rest_route('flipsight/v1', '/art-editions', [
        'methods' => 'GET',
        'callback' => 'flipsight_get_art_edition_display_for_astro',
        'permission_callback' => '__return_true',
    ]);
});

function flipsight_art_sold_quantity(int $product_id, ?int $variation_id = null): int
{
    $orders = wc_get_orders([
        'limit' => -1,
        'status' => ['processing', 'completed'],
        'return' => 'objects',
    ]);

    $sold = 0;

    foreach ($orders as $order) {
        foreach ($order->get_items() as $item) {
            if ($variation_id) {
                if ((int) $item->get_variation_id() === $variation_id) {
                    $sold += (int) $item->get_quantity();
                }
                continue;
            }

            if ((int) $item->get_product_id() === $product_id && (int) $item->get_variation_id() === 0) {
                $sold += (int) $item->get_quantity();
            }
        }
    }

    return $sold;
}

function flipsight_art_manual_sold_quantity(WC_Product $product): int
{
    return max(0, (int) $product->get_meta('_flipsight_manual_sold_quantity', true));
}

function flipsight_art_edition_display_row(WC_Product $product, int $product_id, ?int $variation_id = null): array
{
    $stock_quantity = $product->get_stock_quantity();
    $sold_quantity = flipsight_art_sold_quantity($product_id, $variation_id)
        + flipsight_art_manual_sold_quantity($product);
    $edition_total = is_numeric($stock_quantity) ? ((int) $stock_quantity + $sold_quantity) : null;
    $edition_number = $product->is_in_stock() && is_numeric($edition_total) ? ($sold_quantity + 1) : null;
    $edition_label = ($edition_number && $edition_total) ? sprintf('Ed. %d/%d', $edition_number, $edition_total) : 'Edition unavailable';

    return [
        'productId' => $product_id,
        'variationId' => $variation_id,
        'displayPrice' => html_entity_decode(wp_strip_all_tags(wc_price((float) $product->get_price())), ENT_QUOTES, 'UTF-8'),
        'editionLabel' => $edition_label,
        'availabilityLabel' => $product->is_in_stock() ? 'Available' : 'Sold out',
    ];
}

add_filter('woocommerce_available_variation', function (array $data, $product, $variation): array {
    if (!$product instanceof WC_Product_Variable || !$variation instanceof WC_Product_Variation) {
        return $data;
    }

    if (!has_term('art', 'product_cat', $product->get_id())) {
        return $data;
    }

    $edition = flipsight_art_edition_display_row($variation, $product->get_id(), $variation->get_id());
    if ($edition['editionLabel'] === 'Edition unavailable') {
        return $data;
    }

    $data['variation_description'] = ($data['variation_description'] ?? '') . sprintf(
        '<p class="fs-limited-edition-meta"><strong>%s</strong> next available</p>',
        esc_html($edition['editionLabel'])
    );

    return $data;
}, 20, 3);

function flipsight_get_art_edition_display_for_astro(): WP_REST_Response
{
    $products = wc_get_products([
        'limit' => -1,
        'status' => ['publish'],
        'category' => ['art'],
        'return' => 'objects',
    ]);

    $items = [];

    foreach ($products as $product) {
        if ($product instanceof WC_Product_Variable) {
            foreach ($product->get_children() as $variation_id) {
                $variation = wc_get_product($variation_id);
                if (!$variation instanceof WC_Product_Variation) {
                    continue;
                }

                $items[] = flipsight_art_edition_display_row($variation, $product->get_id(), $variation_id);
            }
            continue;
        }

        if ($product instanceof WC_Product_Simple) {
            $items[] = flipsight_art_edition_display_row($product, $product->get_id(), null);
        }
    }

    return rest_ensure_response($items);
}
