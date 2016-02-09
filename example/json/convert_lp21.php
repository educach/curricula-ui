#!/usr/bin/env php
<?php

require "vendor/autoload.php";

use Sabre\Xml\Reader;
use Sabre\Xml\Element\KeyValue;

$reader = new Reader();
$list = array();
$parentChild = array('root' => array());

// Prepare a custom handler for reading an XML node. See the Sabre\Xml
// documentation for more information.
$baseHandler = function($reader) use(&$list, &$parentChild) {
    $node = new \stdClass();

    // Fetch the attributes. We want the UUID attribute.
    $attributes = $reader->parseAttributes();
    $node->id = trim($attributes['uuid']);

    if (!isset($parentChild[$node->id])) {
        $parentChild[$node->id] = [];
    }

    // We derive the type from the node name.
    $node->type = strtolower(
        str_replace(array('{}', '-'), array('', '_'), trim($reader->getClark()))
    );

    if ($node->type == 'fachbereich') {
        $parentChild['root'][] = $node->id;
    }

    // Give a default name.
    $node->name = ['n/a'];

    // Default cycles.
    $node->data = (object) ['cycle' => []];

    // Fetch the descendants.
    $children = $reader->parseInnerTree();
    if (!empty($children)) {
        foreach($children as $child) {
            if (in_array($child['name'], array(
                '{}fach',
                '{}kompetenzbereich',
                '{}handlungs-themenaspekt',
                '{}kompetenz',
                '{}kompetenzstufe',
                '{}aufbau',
            ))) {
                $parentChild[$node->id][] = $child['attributes']['uuid'];
            } elseif ($child['name'] == '{}bezeichnung') {
                $node->name = [trim($child['value'][0]['value'])];
            } elseif ($child['name'] == '{}code') {
                $node->data->code = trim($child['value']);
            } elseif ($child['name'] == '{}url') {
                $node->data->url = trim($child['value']);
            } elseif ($child['name'] == '{}absaetze') {
                if (!empty($child['value'])) {
                    $node->name = [];
                    foreach ($child['value'] as $values) {
                        $node->name[] = $values['value'][0]['value'];
                    }
                }
            } elseif ($child['name'] == '{}zyklus') {
                $node->data->cycle = array_values(str_split($child['value']));
            }
        }

        if (empty($node->data->cycle)) {
            foreach ($children as $child) {
                if (!empty($child['value']->data->cycle)) {
                    $node->data->cycle = array_merge($node->data->cycle, $child['value']->data->cycle);
                }
            }
            $node->data->cycle = array_values(array_unique($node->data->cycle));
        }
    }

    if (count($parentChild[$node->id])) {
        $node->hasChildren = true;
    }

    $list[$node->id] = $node;

    return $node;
};

// Register our handler for the following node types. All others will be
// treated with the default one provided by Sabre\Xml, but we don't
// really care.
$reader->elementMap = [
    '{}fachbereich' => $baseHandler,
    '{}fach' => $baseHandler,
    '{}kompetenzbereich' => $baseHandler,
    '{}handlungs-themenaspekt' => $baseHandler,
    '{}kompetenz' => $baseHandler,
    '{}aufbau' => $baseHandler,
    '{}kompetenzstufe' => $baseHandler,
];

// Parse the data.
$reader->xml(file_get_contents('./lp21_2015_11_04.xml'));
$reader->parse();

// Export to a flat-tree structure for JSON.
$json = array();
foreach ($parentChild as $uuid => $childUuids) {
    $json[$uuid] = array();
    foreach ($childUuids as $childUuid) {
        $json[$uuid][] = $list[$childUuid];
    }
}

file_put_contents('./json/lp21_full.json', json_encode($json, JSON_PRETTY_PRINT));
