<?php

/**
 * @wordpress-plugin
 * Plugin Name:         Yabe Open Source - Bricks Plain Classes
 * Plugin URI:          https://os.yabe.land
 * Description:         Bricks builder editor: Quick Plain Classes
 * Version:             1.0.0
 * Requires at least:   6.0
 * Requires PHP:        7.4
 * Author:              Rosua
 * Author URI:          https://rosua.org
 * Donate link:         https://ko-fi.com/Q5Q75XSF7
 * Text Domain:         yos-brx-plain-classes
 * Domain Path:         /languages
 *
 * @package             Yabe Open Source
 * @author              Joshua Gugun Siagian <suabahasa@gmail.com>
 */

/*
 * This file is part of the Yabe Open Source package.
 *
 * (c) Joshua <suabahasa@gmail.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare(strict_types=1);

add_action('wp_enqueue_scripts', 'yos_brx_plain_classes', 1_000_001);

function yos_brx_plain_classes()
{
    if (!function_exists('bricks_is_builder_main') || !bricks_is_builder_main()) {
        return;
    }

    add_filter('script_loader_tag', function ($tag, $handle) {
        if ('yos-brx-plain-classes' !== $handle) {
            return $tag;
        }

        return str_replace(' src', ' type="module" defer src', $tag);
    }, 1_000_001, 2);

    wp_enqueue_style(
        'yos-brx-plain-classes',
        plugins_url('builder.css', __FILE__),
        ['bricks-builder',],
        (string) filemtime(__DIR__ . '/builder.css')
    );

    wp_enqueue_script(
        'yos-brx-plain-classes',
        plugins_url('builder.js', __FILE__),
        ['wp-hooks', 'bricks-builder',],
        (string) filemtime(__DIR__ . '/builder.js'),
        true
    );
}

require_once __DIR__ . '/integration.php';