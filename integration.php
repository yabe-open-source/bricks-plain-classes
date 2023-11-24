<?php

/*
 * This file is part of the Yabe Open Source package.
 *
 * (c) Joshua <suabahasa@gmail.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare(strict_types=1);

use Automatic_CSS\Model\Config\Classes;
use CoreFramework\Helper;

add_action('wp_enqueue_scripts', 'yos_brx_plain_classes_integration', 1_000_001);

function yos_brx_plain_classes_integration()
{
    if (!function_exists('bricks_is_builder_main') || !bricks_is_builder_main()) {
        return;
    }

    yos_brx_plain_classes_integration_core_framework();
    yos_brx_plain_classes_integration_acss();
}

// Core Framework (CF) integration
function yos_brx_plain_classes_integration_core_framework()
{
    if (!class_exists(Helper::class)) {
        return;
    }

    $classes = json_encode((new Helper())->getClassNames(['group_by_category' => false]));

    wp_add_inline_script('yos-brx-plain-classes', <<<JS
        document.addEventListener('DOMContentLoaded', function () {
            wp.hooks.addFilter('yos-brx-plain-classes-autocomplete-items', 'yos_brx_plain_classes_core_framework', function (items) {
                return [...items, ...Object.values({$classes}).map((value) => ({ value: value }))];
            });
        });
    JS, 'after');
}

// Automatic.css (ACSS) integration
function yos_brx_plain_classes_integration_acss()
{
    if (!class_exists(Classes::class)) {
        return;
    }

    $classes = json_encode((new Classes())->load());

    wp_add_inline_script('yos-brx-plain-classes', <<<JS
        document.addEventListener('DOMContentLoaded', function () {
            wp.hooks.addFilter('yos-brx-plain-classes-autocomplete-items', 'yos_brx_plain_classes_acss', function (items) {
                return [...items, ...Object.values({$classes}).map((value) => ({ value: value }))];
            });
        });
    JS, 'after');
}
