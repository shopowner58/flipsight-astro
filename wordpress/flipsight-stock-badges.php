<?php
/**
 * FLIPSIGHT stock badges for WooCommerce vinyl releases.
 *
 * Install in wp-content/novamira-sandbox/flipsight-stock-badges.php.
 */

if (!defined('ABSPATH')) {
    exit;
}

function flipsight_stock_badges_get_badge($product = null) {
    if (!$product instanceof WC_Product) {
        global $product;
    }

    if (!$product instanceof WC_Product) {
        return null;
    }

    $sku = strtoupper((string) $product->get_sku());
    if (!preg_match('/^FLIPSW?\\d{3}$/', $sku)) {
        return null;
    }

    $quantity = $product->get_stock_quantity();
    $managing_stock = $product->get_manage_stock();
    $sold_out = !$product->is_in_stock() || $product->get_stock_status() === 'outofstock';

    if ($managing_stock && $quantity !== null && (int) $quantity <= 0) {
        $sold_out = true;
    }

    if ($sold_out) {
        return [
            'text' => __('Sold out', 'flipsight'),
            'class' => 'is-sold-out',
        ];
    }

    if ($managing_stock && $quantity !== null && (int) $quantity < 51) {
        return [
            'text' => __('Low in stock', 'flipsight'),
            'class' => 'is-low-stock',
        ];
    }

    return null;
}

function flipsight_stock_badges_render($context = 'loop') {
    $badge = flipsight_stock_badges_get_badge();

    if (!$badge) {
        return;
    }

    printf(
        '<span class="flipsight-stock-badge flipsight-stock-badge--%s %s">%s</span>',
        esc_attr($context),
        esc_attr($badge['class']),
        esc_html($badge['text'])
    );
}

add_action('woocommerce_before_shop_loop_item_title', function () {
    flipsight_stock_badges_render('loop');
}, 8);

add_action('woocommerce_single_product_summary', function () {
    flipsight_stock_badges_render('single');
}, 4);

add_filter('woocommerce_get_availability', function ($availability, $product) {
    $badge = flipsight_stock_badges_get_badge($product);

    if ($badge) {
        $availability['availability'] = $badge['text'];
        $availability['class'] = $badge['class'];
    }

    return $availability;
}, 20, 2);

add_action('wp_head', function () {
    ?>
    <style>
        .woocommerce ul.products li.product {
            position: relative;
        }

        .flipsight-stock-badge {
            align-items: center;
            border-radius: 0;
            display: inline-flex;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.12em;
            line-height: 1;
            padding: 10px 12px;
            text-transform: uppercase;
            z-index: 5;
        }

        .flipsight-stock-badge--loop {
            left: 12px;
            position: absolute;
            top: 12px;
        }

        .flipsight-stock-badge--single {
            margin-bottom: 14px;
        }

        .flipsight-stock-badge.is-sold-out,
        .stock.is-sold-out {
            background: #111110;
            color: #f8f8f4;
        }

        .flipsight-stock-badge.is-low-stock,
        .stock.is-low-stock {
            background: #253f7f;
            color: #ffffff;
        }
    </style>
    <?php
});
