<?php
/**
 * FLIPSIGHT music metadata for the Astro storefront.
 *
 * Install in wp-content/novamira-sandbox/flipsight-music-meta.php.
 */

add_action('rest_api_init', function () {
    register_rest_route('flipsight/v1', '/music-meta', [
        'methods' => 'GET',
        'permission_callback' => '__return_true',
        'callback' => function () {
            if (!function_exists('wc_get_products')) {
                return [];
            }

            $products = wc_get_products([
                'limit' => -1,
                'status' => ['publish'],
                'type' => ['simple', 'variable'],
                'orderby' => 'date',
                'order' => 'DESC',
            ]);

            $items = [];

            foreach ($products as $product) {
                $sku = strtoupper((string) $product->get_sku());
                if (!preg_match('/^FLIPS(\\d|W)/', $sku)) {
                    continue;
                }

                $gallery = [];
                foreach ($product->get_gallery_image_ids() as $image_id) {
                    $url = wp_get_attachment_image_url($image_id, 'full');
                    if ($url) {
                        $gallery[] = $url;
                    }
                }

                $meta_gallery = get_post_meta($product->get_id(), '_flipsight_music_gallery', true);
                $append_meta_gallery = wc_string_to_bool(get_post_meta($product->get_id(), '_flipsight_music_gallery_append', true));
                if ($append_meta_gallery && is_array($meta_gallery)) {
                    $gallery = array_values(array_unique(array_filter(array_merge($gallery, $meta_gallery))));
                } elseif (empty($gallery) && is_array($meta_gallery)) {
                    $gallery = array_values(array_filter($meta_gallery));
                }

                $items[] = [
                    'productId' => $product->get_id(),
                    'slug' => $product->get_slug(),
                    'sku' => $sku,
                    'artist' => implode(' / ', wc_get_product_terms($product->get_id(), 'pa_artist', ['fields' => 'names'])),
                    'bandcampAlbumId' => get_post_meta($product->get_id(), '_flipsight_bandcamp_album_id', true),
                    'bandcampUrl' => get_post_meta($product->get_id(), '_flipsight_bandcamp_url', true),
                    'gallery' => $gallery,
                    'availabilityLabel' => get_post_meta($product->get_id(), '_flipsight_availability_label', true),
                ];
            }

            return rest_ensure_response($items);
        },
    ]);
});
