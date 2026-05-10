<?php
/**
 * FLIPSIGHT WooCommerce add-to-cart return handler.
 *
 * Add this to a small site plugin or the active WooCommerce checkout theme's
 * functions.php. It lets Astro links append ?return_to=https://flipsight.be/shop
 * after WooCommerce adds the product to the cart, while blocking open redirects.
 */
add_filter('woocommerce_add_to_cart_redirect', function ($url) {
    if (empty($_REQUEST['return_to'])) {
        return $url;
    }

    $return_to = esc_url_raw(wp_unslash($_REQUEST['return_to']));
    $allowed_hosts = array('flipsight.be', 'www.flipsight.be');
    $host = wp_parse_url($return_to, PHP_URL_HOST);

    if (in_array($host, $allowed_hosts, true)) {
        return $return_to;
    }

    return $url;
});
