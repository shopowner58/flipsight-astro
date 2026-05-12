<?php
/**
 * FLIPSIGHT Google Analytics 4 tracking.
 *
 * Install in wp-content/novamira-sandbox/flipsight-google-analytics.php.
 */

add_action('wp_head', function () {
    if (is_admin()) {
        return;
    }

    $measurement_id = 'G-KYSG676RPD';
    ?>
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=<?php echo esc_attr($measurement_id); ?>"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '<?php echo esc_js($measurement_id); ?>');
    </script>
    <?php
}, 20);

add_action('wp_footer', function () {
    if (is_admin() || !function_exists('is_cart') || !function_exists('is_checkout')) {
        return;
    }

    if (is_cart()) {
        ?>
        <script>
          if (typeof gtag === 'function') {
            gtag('event', 'view_cart');
          }
        </script>
        <?php
        return;
    }

    if (is_checkout() && !is_order_received_page()) {
        ?>
        <script>
          if (typeof gtag === 'function') {
            gtag('event', 'begin_checkout');
          }
        </script>
        <?php
    }
}, 20);

add_action('woocommerce_thankyou', function ($order_id) {
    if (!$order_id || !function_exists('wc_get_order')) {
        return;
    }

    $order = wc_get_order($order_id);
    if (!$order) {
        return;
    }

    $items = [];
    foreach ($order->get_items() as $item) {
        $product = $item->get_product();
        $items[] = [
            'item_id' => $product ? $product->get_sku() : (string) $item->get_product_id(),
            'item_name' => $item->get_name(),
            'price' => (float) $order->get_item_total($item, false),
            'quantity' => (int) $item->get_quantity(),
        ];
    }
    ?>
    <script>
      if (typeof gtag === 'function') {
        gtag('event', 'purchase', {
          transaction_id: <?php echo wp_json_encode((string) $order->get_order_number()); ?>,
          value: <?php echo wp_json_encode((float) $order->get_total()); ?>,
          tax: <?php echo wp_json_encode((float) $order->get_total_tax()); ?>,
          shipping: <?php echo wp_json_encode((float) $order->get_shipping_total()); ?>,
          currency: <?php echo wp_json_encode($order->get_currency()); ?>,
          items: <?php echo wp_json_encode($items); ?>
        });
      }
    </script>
    <?php
}, 20);
