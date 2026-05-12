<?php
/**
 * FLIPSIGHT WooCommerce add-to-cart return handler.
 *
 * Add this to a small site plugin or the active WooCommerce checkout theme's
 * functions.php. It sends add-to-cart requests to the WooCommerce cart.
 * Optional return_to URLs are still supported for safe FLIPSIGHT frontend links.
 *
 * The allowed_redirect_hosts filter is required because WooCommerce uses
 * wp_safe_redirect(). Without this, WordPress falls back to wp-admin for
 * cross-domain redirects and visitors see the login screen.
 */
add_filter('allowed_redirect_hosts', function ($hosts) {
    $hosts[] = 'flipsight.be';
    $hosts[] = 'www.flipsight.be';
    return array_values(array_unique($hosts));
});

add_filter('woocommerce_add_to_cart_redirect', function ($url) {
    if (!empty($_REQUEST['return_to'])) {
        $return_to = esc_url_raw(wp_unslash($_REQUEST['return_to']));
        $allowed_hosts = array('flipsight.be', 'www.flipsight.be');
        $host = wp_parse_url($return_to, PHP_URL_HOST);

        if (in_array($host, $allowed_hosts, true) && function_exists('WC') && WC()->session) {
            WC()->session->set('flipsight_continue_shopping_url', $return_to);
        }
    }

    return function_exists('wc_get_cart_url') ? wc_get_cart_url() : $url;
});
