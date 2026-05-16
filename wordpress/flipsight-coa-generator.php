<?php
/**
 * FLIPSIGHT printable Certificate of Authenticity generator.
 * Install in wp-content/novamira-sandbox/flipsight-coa-generator.php.
 */

if (!defined('ABSPATH')) {
    exit;
}

function flipsight_coa_is_art_item(WC_Order_Item_Product $item): bool {
    $product = $item->get_product();

    if (!$product) {
        return false;
    }

    $sku = strtolower((string) $product->get_sku());
    if (str_starts_with($sku, 'flipsart')) {
        return true;
    }

    $parent_id = $product->is_type('variation') ? $product->get_parent_id() : $product->get_id();
    return has_term('art', 'product_cat', $parent_id) || has_term('Art', 'product_cat', $parent_id);
}

function flipsight_coa_get_order_from_admin_object($object): ?WC_Order {
    if ($object instanceof WC_Order) {
        return $object;
    }

    if ($object instanceof WP_Post) {
        return wc_get_order($object->ID) ?: null;
    }

    if (is_object($object) && method_exists($object, 'get_id')) {
        return wc_get_order($object->get_id()) ?: null;
    }

    return null;
}

add_action('add_meta_boxes', function () {
    $screens = ['shop_order'];

    if (function_exists('wc_get_page_screen_id')) {
        $screens[] = wc_get_page_screen_id('shop-order');
    }

    foreach (array_unique($screens) as $screen) {
        add_meta_box(
            'flipsight_coa_generator',
            'FLIPSART COA',
            'flipsight_coa_render_order_box',
            $screen,
            'side',
            'high'
        );
    }
}, 30);

function flipsight_coa_render_order_box($object): void {
    $order = flipsight_coa_get_order_from_admin_object($object);

    if (!$order) {
        echo '<p>No order found.</p>';
        return;
    }

    $items = [];
    foreach ($order->get_items() as $item_id => $item) {
        if ($item instanceof WC_Order_Item_Product && flipsight_coa_is_art_item($item)) {
            $items[$item_id] = $item;
        }
    }

    if (!$items) {
        echo '<p>No FLIPSART artwork found in this order.</p>';
        return;
    }

    echo '<p style="margin-top:0;">Generate a printable A4 certificate for each artwork in this order.</p>';
    echo '<div style="display:grid;gap:8px;">';

    foreach ($items as $item_id => $item) {
        $url = wp_nonce_url(
            admin_url('admin-post.php?action=flipsight_generate_coa&order_id=' . $order->get_id() . '&item_id=' . $item_id),
            'flipsight_generate_coa_' . $order->get_id() . '_' . $item_id
        );

        printf(
            '<a class="button button-primary" target="_blank" rel="noopener" href="%s">Generate COA<br><small>%s</small></a>',
            esc_url($url),
            esc_html($item->get_name())
        );
    }

    echo '</div>';
}

add_action('admin_post_flipsight_generate_coa', function () {
    if (!current_user_can('manage_woocommerce')) {
        wp_die('You do not have permission to generate certificates.');
    }

    $order_id = isset($_GET['order_id']) ? absint($_GET['order_id']) : 0;
    $item_id = isset($_GET['item_id']) ? absint($_GET['item_id']) : 0;

    if (!$order_id || !$item_id) {
        wp_die('Missing order or item.');
    }

    check_admin_referer('flipsight_generate_coa_' . $order_id . '_' . $item_id);

    $order = wc_get_order($order_id);
    $item = $order ? $order->get_item($item_id) : null;

    if (!$order || !($item instanceof WC_Order_Item_Product) || !flipsight_coa_is_art_item($item)) {
        wp_die('No FLIPSART artwork found for this certificate.');
    }

    $data = flipsight_coa_build_data($order, $item_id, $item);
    flipsight_coa_render_print_page($data);
    exit;
});

function flipsight_coa_build_data(WC_Order $order, int $item_id, WC_Order_Item_Product $item): array {
    $product = $item->get_product();
    $parent = $product && $product->is_type('variation') ? wc_get_product($product->get_parent_id()) : $product;
    $source = $parent ?: $product;

    $sku = $product ? (string) $product->get_sku() : '';
    $title = $source ? $source->get_name() : $item->get_name();
    $size = flipsight_coa_get_size($item, $product, $source);
    $medium = flipsight_coa_get_attribute($source, 'medium') ?: 'Digital Painting on Canvas';
    $year = flipsight_coa_get_year($source);
    $edition = flipsight_coa_get_edition_data($order, $item, $product, $source, $size);
    $edition_number = $edition['number'];
    $edition_total = $edition['total'];
    $edition_text = $edition_number && $edition_total ? $edition_number . ' / ' . $edition_total : 'Numbered edition';
    $auth_id = strtoupper(str_replace(' ', '-', $sku ?: ('FLIPSART-' . $item_id)));

    if ($edition_number) {
        $auth_id .= '-ED' . str_pad((string) $edition_number, 2, '0', STR_PAD_LEFT);
    }

    return [
        'title' => $title,
        'year' => $year,
        'edition' => $edition_text,
        'edition_number' => $edition_number,
        'edition_total' => $edition_total,
        'medium' => $medium,
        'dimensions' => $size ?: 'As stated on the artwork record',
        'sku' => $sku,
        'auth_id' => $auth_id,
        'order_number' => $order->get_order_number(),
        'date' => wp_date('d.m.Y'),
    ];
}

function flipsight_coa_get_attribute(?WC_Product $product, string $needle): string {
    if (!$product) {
        return '';
    }

    foreach ($product->get_attributes() as $attribute) {
        $name = strtolower((string) $attribute->get_name());
        if (!str_contains($name, strtolower($needle))) {
            continue;
        }

        if ($attribute instanceof WC_Product_Attribute) {
            $values = wc_get_product_terms($product->get_id(), $attribute->get_name(), ['fields' => 'names']);
            if (!$values) {
                $values = $attribute->get_options();
            }
            return implode(', ', array_map('wp_strip_all_tags', $values));
        }
    }

    return '';
}

function flipsight_coa_get_year(?WC_Product $product): string {
    if (!$product) {
        return '';
    }

    $text = wp_strip_all_tags($product->get_short_description() . ' ' . $product->get_description());
    return preg_match('/\b(20[0-9]{2})\b/', $text, $match) ? $match[1] : wp_date('Y');
}

function flipsight_coa_get_size(WC_Order_Item_Product $item, ?WC_Product $product, ?WC_Product $source): string {
    $size = (string) $item->get_meta('pa_size');

    if (!$size) {
        $size = (string) $item->get_meta('Size');
    }

    if (!$size && $product && $product->is_type('variation')) {
        $attrs = $product->get_variation_attributes();
        $size = (string) ($attrs['attribute_pa_size'] ?? $attrs['attribute_size'] ?? '');
    }

    if (!$size && $source) {
        $text = wp_strip_all_tags($source->get_short_description() . ' ' . $source->get_description());
        if (preg_match('/([0-9]{2,3})\s*[xX]\s*([0-9]{2,3})(?:\s*\+\s*[0-9]{2,3}\s*[xX]\s*[0-9]{2,3})?/', $text, $match)) {
            $size = $match[0];
        }
    }

    $size = trim(str_replace(['-', '_'], ' ', $size));
    $size = preg_replace('/\s*[xX]\s*/', ' x ', $size);

    return $size ? $size . ' cm' : '';
}

function flipsight_coa_size_key(string $size): string {
    return strtolower(preg_replace('/[^0-9x]/', '', str_replace(['X', '×'], 'x', $size)));
}

function flipsight_coa_get_edition_data(WC_Order $order, WC_Order_Item_Product $item, ?WC_Product $product, ?WC_Product $source, string $size): array {
    $product_id = $product ? $product->get_id() : 0;
    $variation_id = $product && $product->is_type('variation') ? $product->get_id() : 0;
    $sold_until_order = flipsight_coa_count_sold($product_id, $variation_id, $order->get_id());
    $sold_total = flipsight_coa_count_sold($product_id, $variation_id);
    $stock = $product && $product->managing_stock() ? (int) $product->get_stock_quantity() : null;
    $total = $stock !== null ? $stock + $sold_total : 0;

    if (!$total && $source) {
        $total = flipsight_coa_parse_edition_total($source, $size);
    }

    return [
        'number' => $sold_until_order ?: null,
        'total' => $total ?: null,
    ];
}

function flipsight_coa_count_sold(int $product_id, int $variation_id = 0, int $until_order_id = 0): int {
    $orders = wc_get_orders([
        'status' => ['processing', 'completed', 'on-hold'],
        'limit' => -1,
        'orderby' => 'date',
        'order' => 'ASC',
        'return' => 'objects',
    ]);

    $count = 0;

    foreach ($orders as $order) {
        if ($until_order_id && $order->get_id() > $until_order_id) {
            continue;
        }

        foreach ($order->get_items() as $line) {
            if (!($line instanceof WC_Order_Item_Product)) {
                continue;
            }

            $line_product_id = (int) $line->get_product_id();
            $line_variation_id = (int) $line->get_variation_id();
            $matches = $variation_id ? $line_variation_id === $variation_id : $line_product_id === $product_id;

            if ($matches) {
                $count += (int) $line->get_quantity();
            }
        }
    }

    return $count;
}

function flipsight_coa_parse_edition_total(WC_Product $product, string $size): int {
    $text = wp_strip_all_tags($product->get_short_description() . ' ' . $product->get_description());
    $key = flipsight_coa_size_key($size);

    if ($key && preg_match_all('/([0-9]+)\s+in\s+([0-9]{2,3})\s*[xX]\s*([0-9]{2,3})/', $text, $matches, PREG_SET_ORDER)) {
        foreach ($matches as $match) {
            $candidate = $match[2] . 'x' . $match[3];
            if ($candidate === $key) {
                return (int) $match[1];
            }
        }
    }

    if (preg_match('/Edition of\s+([0-9]+)/i', $text, $match)) {
        return (int) $match[1];
    }

    return 0;
}

function flipsight_coa_render_print_page(array $data): void {
    nocache_headers();
    header('Content-Type: text/html; charset=' . get_bloginfo('charset'));

    $logo = get_site_icon_url(96) ?: '';
    ?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
  <meta charset="<?php bloginfo('charset'); ?>">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>COA - <?php echo esc_html($data['title']); ?></title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #e8e7e2; color: #f5f3ed; font-family: Helvetica, Arial, sans-serif; }
    .tools { position: fixed; top: 14px; right: 14px; display: flex; gap: 8px; z-index: 5; }
    .tools button { border: 1px solid #111; background: #f5f3ed; color: #111; padding: 10px 14px; font: 700 11px/1 Helvetica, Arial, sans-serif; letter-spacing: .16em; text-transform: uppercase; cursor: pointer; }
    .sheet { width: 210mm; min-height: 297mm; margin: 18px auto; padding: 18mm 17mm; background: #050505; position: relative; overflow: hidden; }
    .sheet:before { content: ""; position: absolute; inset: 12mm; border: 1px solid rgba(245,243,237,.16); pointer-events: none; }
    .sheet:after { content: ""; position: absolute; inset: -70mm -80mm auto auto; width: 180mm; height: 180mm; border-radius: 50%; border: 1px solid rgba(245,243,237,.08); box-shadow: 0 0 0 28mm rgba(245,243,237,.025), 0 0 0 58mm rgba(245,243,237,.018); pointer-events: none; }
    .content { position: relative; z-index: 1; min-height: 261mm; display: flex; flex-direction: column; }
    header { display: flex; justify-content: space-between; align-items: start; border-bottom: 1px solid rgba(245,243,237,.34); padding-bottom: 9mm; }
    .brand { display: grid; gap: 4mm; }
    .brand img { width: 14mm; height: 14mm; object-fit: contain; filter: invert(1); }
    .meta { color: rgba(245,243,237,.62); font: 700 8px/1.5 Helvetica, Arial, sans-serif; letter-spacing: .16em; text-transform: uppercase; }
    h1 { margin: 15mm 0 6mm; max-width: 112mm; font: 700 38px/.93 Helvetica, Arial, sans-serif; letter-spacing: -.03em; }
    .intro { max-width: 118mm; margin: 0 0 14mm; color: rgba(245,243,237,.66); font-size: 10px; line-height: 1.7; }
    .badge { border: 1px solid rgba(245,243,237,.24); padding: 5mm; min-width: 43mm; align-self: center; }
    .badge strong { display: block; font-size: 16px; line-height: 1; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9mm 12mm; }
    .field { border-bottom: 1px solid rgba(245,243,237,.56); padding-bottom: 3mm; min-height: 17mm; }
    .label { display: block; color: rgba(245,243,237,.58); font: 700 7px/1 Helvetica, Arial, sans-serif; letter-spacing: .13em; text-transform: uppercase; margin-bottom: 3mm; }
    .value { display: block; font-size: 13px; line-height: 1.35; }
    .wide { grid-column: 1 / -1; }
    .text { margin-top: 9mm; display: grid; gap: 5mm; color: rgba(245,243,237,.70); font-size: 8.5px; line-height: 1.6; }
    .text strong { color: #f5f3ed; display: block; margin-bottom: 1.5mm; font-size: 7px; letter-spacing: .14em; text-transform: uppercase; }
    footer { margin-top: auto; padding-top: 10mm; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 16mm; margin-top: 10mm; }
    .signature { border-top: 1px solid rgba(245,243,237,.62); padding-top: 3mm; }
    .small { color: rgba(245,243,237,.58); font-size: 7px; letter-spacing: .12em; text-transform: uppercase; }
    @media print {
      body { background: #050505; }
      .tools { display: none; }
      .sheet { margin: 0; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="tools">
    <button onclick="window.print()">Print / save PDF</button>
  </div>
  <main class="sheet">
    <div class="content">
      <header>
        <div class="brand">
          <?php if ($logo) : ?><img src="<?php echo esc_url($logo); ?>" alt="FLIPSIGHT"><?php endif; ?>
          <div class="meta">FLIPSIGHT / FLIPSART</div>
        </div>
        <div class="meta">Certificate of Authenticity</div>
      </header>

      <div style="display:flex;justify-content:space-between;gap:18mm;">
        <div>
          <h1>Certificate of Authenticity</h1>
          <p class="intro">This certificate confirms the authenticity of the artwork described below. It belongs to the stated edition and should remain with the work as part of its provenance.</p>
        </div>
        <div class="badge">
          <span class="meta">COA</span>
          <strong><?php echo esc_html($data['edition']); ?></strong>
          <span class="small"><?php echo esc_html($data['auth_id']); ?></span>
        </div>
      </div>

      <section class="grid">
        <div class="field">
          <span class="label">Artwork title</span>
          <span class="value"><?php echo esc_html($data['title']); ?></span>
        </div>
        <div class="field">
          <span class="label">Artwork ID</span>
          <span class="value"><?php echo esc_html($data['auth_id']); ?></span>
        </div>
        <div class="field">
          <span class="label">Year</span>
          <span class="value"><?php echo esc_html($data['year']); ?></span>
        </div>
        <div class="field">
          <span class="label">Edition</span>
          <span class="value"><?php echo esc_html($data['edition']); ?></span>
        </div>
        <div class="field">
          <span class="label">Dimensions</span>
          <span class="value"><?php echo esc_html($data['dimensions']); ?></span>
        </div>
        <div class="field">
          <span class="label">Medium</span>
          <span class="value"><?php echo esc_html($data['medium']); ?></span>
        </div>
      </section>

      <section class="text">
        <p><strong>Provenance</strong>This work is part of the FLIPSART series, derived from the visual world of FLIPSIGHT. The series expands selected music, event and release visuals into collectible physical artworks.</p>
        <p><strong>Rights</strong>The purchase of this artwork concerns the physical object only. No copyright, reproduction right, commercial usage right, digital exploitation right or right to create derivative works is transferred to the buyer. All intellectual property rights remain with FLIPSIGHT and/or the relevant rights holder, with all rights reserved.</p>
        <p><strong>Authenticity</strong>FLIPSIGHT certifies that the artwork described above is authentic and part of the stated edition. No additional copies will be produced outside this edition, except for artist proofs, prototypes or archival proofs where explicitly indicated.</p>
      </section>

      <footer>
        <div class="meta">Authenticated by FLIPSIGHT / FLIPSART</div>
        <p class="small">Hand-finished, reviewed and issued in Antwerp, Belgium.</p>
        <div class="signatures">
          <div class="signature">
            <div class="small">Date: <?php echo esc_html($data['date']); ?></div>
          </div>
          <div class="signature">
            <div class="small">FLIPSIGHT stamp / initials</div>
          </div>
        </div>
      </footer>
    </div>
  </main>
</body>
</html>
    <?php
}
