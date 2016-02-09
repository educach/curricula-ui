#!/usr/bin/env php
<?php

require "vendor/autoload.php";

define('PER_BASE_URL', 'https://www.plandetudes.ch/web/guest/');

use Sabre\Xml\Reader;
use Sabre\Xml\Element\KeyValue;

$reader = new Reader();
$list = [];
$parentChild = ['root' => []];
$xml = simplexml_load_file('./per.xml');

// Get the domains.
$fetchDomains = function() use (&$list, &$parentChild, &$xml, &$fetchDisciplines, &$aggregateCycleData, &$aggregateSchoolYearData) {
    $domainNodes = $xml->xpath('//code_matrix/domain');
    foreach ($domainNodes as $domainNode) {
        $domain = new stdClass();
        $domain->type = 'domain';
        $domain->name = [
            (string) $domainNode->attributes()['name'],
        ];
        $domain->id = md5($domain->name[0]);
        $domain->data = (object) [
            'cycle' => [],
            'url' => '',
            'school_year' => [],
        ];

        $parentChild[$domain->id] = [];
        $childIds = $fetchDisciplines($domainNode, $domain->id);
        $aggregateCycleData($domain, $childIds);
        $aggregateSchoolYearData($domain, $childIds);

        $list[$domain->id] = $domain;
        $parentChild['root'][] = $domain->id;
    }
};

// Get the disciplines.
$fetchDisciplines = function($domainNode, $parentId) use (&$list, &$parentChild, &$xml, &$fetchThemes, &$aggregateCycleData, &$aggregateSchoolYearData) {
    $disciplineNodes = $domainNode->xpath('discipline');

    foreach ($disciplineNodes as $disciplineNode) {
        $discipline = new stdClass();
        $discipline->type = 'discipline';
        $discipline->name = [
            (string) $disciplineNode->attributes()['name'],
        ];
        $discipline->id = md5($parentId . $discipline->name[0]);
        $discipline->data = (object) [
            'cycle' => [],
            'url' => '',
            'school_year' => [],
        ];

        $parentChild[$discipline->id] = [];
        $childIds = $fetchThemes($disciplineNode, $discipline->id);
        $aggregateCycleData($discipline, $childIds);
        $aggregateSchoolYearData($discipline, $childIds);

        $list[$discipline->id] = $discipline;
        $parentChild[$parentId][] = $discipline->id;
    }

    return $parentChild[$parentId];
};

// Get the themes.
$fetchThemes = function($disciplineNode, $parentId) use (&$list, &$parentChild, &$xml, &$fetchCycles, &$aggregateCycleData, &$aggregateSchoolYearData) {
    $themeNodes = $disciplineNode->xpath('theme');

    foreach ($themeNodes as $themeNode) {
        $theme = new stdClass();
        $theme->type = 'theme';
        $theme->name = [
            (string) $themeNode->attributes()['name'],
        ];
        $theme->id = md5($parentId . $theme->name[0]);
        $theme->data = (object) [
            'cycle' => [],
            'url' => '',
            'school_year' => [],
        ];

        $parentChild[$theme->id] = [];
        $childIds = $fetchCycles($themeNode, $theme->id);
        $aggregateCycleData($theme, $childIds);
        $aggregateSchoolYearData($theme, $childIds);

        $list[$theme->id] = $theme;
        $parentChild[$parentId][] = $theme->id;
    }

    return $parentChild[$parentId];
};

// Get the cycles.
$fetchCycles = function($themeNode, $parentId) use (&$list, &$parentChild, &$xml, &$fetchCodes, &$aggregateSchoolYearData) {
    $cycleNodes = $themeNode->xpath('cycle');

    foreach ($cycleNodes as $cycleNode) {
        $cycle = new stdClass();
        $cycle->type = 'cycle';
        $cycle->name = [
            ((string) $cycleNode->attributes()['name']),
        ];
        $cycle->id = md5($parentId . $cycle->name[0]);
        $cycle->data = (object) [
            'cycle' => [str_replace('Cycle ', '', $cycle->name[0])],
            'url' => '',
            'school_year' => [],
        ];

        $parentChild[$cycle->id] = [];
        $childIds = $fetchCodes($cycleNode, $cycle->id, $cycle->data->cycle);
        $aggregateSchoolYearData($cycle, $childIds);

        $list[$cycle->id] = $cycle;
        $parentChild[$parentId][] = $cycle->id;
    }

    return $parentChild[$parentId];
};

// Get the objective codes.
$fetchCodes = function($cycleNode, $parentId, $cycles) use (&$list, &$parentChild, &$xml, &$fetchSubtitles, &$aggregateSchoolYearData) {
    // Get the code.
    $objectiveCode = (string) $cycleNode;
    $codeNode = $xml->xpath('//objectiv_codes/code[@code="' . str_replace('&', '&amp;', $objectiveCode) . '"]');

    if (!empty($codeNode)) {
        $codeNode = $codeNode[0];

        $code = new stdClass();
        $code->type = 'code';
        $code->name = [
            ((string) $codeNode->children()[0]) . " ($objectiveCode)",
        ];
        $code->id = md5($parentId . $code->name[0]);
        $attributes = $codeNode->attributes();
        $code->data = (object) [
            'cycle' => $cycles,
            'url' => isset($attributes['url_part']) ?
                PER_BASE_URL . $attributes['url_part'] :
                '',
            'school_year' => [],
        ];

        $parentChild[$code->id] = [];

        // Fetch the parent node for the upcoming subtitles. They are in a
        // different tree.
        $subtitleParentNode = $xml->xpath('//subtitles/code[@code="' . str_replace('&', '&amp;', $objectiveCode) . '"]');
        if (!empty($subtitleParentNode)) {
            $childIds = $fetchSubtitles($subtitleParentNode[0], $code->id, $cycles);
            $aggregateSchoolYearData($code, $childIds);
        }

        $list[$code->id] = $code;
        $parentChild[$parentId][] = $code->id;
    }

    return $parentChild[$parentId];
};

// Fetch the subtitles.
$fetchSubtitles = function($parentNode, $parentId, $cycles) use (&$list, &$parentChild, &$xml, &$fetchSubtitles, &$fetchDetails, &$aggregateSchoolYearData) {
    $subtitleNodes = $parentNode->xpath('./subtitle');

    foreach ($subtitleNodes as $subtitleNode) {
        $subtitle = new stdClass();
        $subtitle->type = 'subtitle';
        $subtitle->name = [
            (string) $subtitleNode->children()[0],
        ];
        $subtitle->id = md5($parentId . $subtitle->name[0]);
        $attributes = $subtitleNode->attributes();
        $subtitle->data = (object) [
            'cycle' => $cycles,
            'url' => isset($attributes['url_part']) ?
                PER_BASE_URL . $attributes['url_part'] :
                '',
            'school_year' => [],
        ];

        $parentChild[$subtitle->id] = [];
        // Subtitle can have child-subtitles.
        $childIds = $fetchSubtitles($subtitleNode, $subtitle->id, $cycles);
        $childIds = array_merge($fetchDetails($subtitleNode, $subtitle->id, $cycles), $childIds);
        $aggregateSchoolYearData($subtitle, $childIds);

        $list[$subtitle->id] = $subtitle;
        $parentChild[$parentId][] = $subtitle->id;
    }

    return $parentChild[$parentId];
};

// Fetch the details.
$fetchDetails = function($parentNode, $parentId, $cycles) use (&$list, &$parentChild, &$xml) {
    $detailNodes = $parentNode->xpath('./details');

    foreach ($detailNodes as $detailNode) {
        $detail = new stdClass();
        $detail->type = 'detail';
        $detail->name = [
            (string) $detailNode->children()[0],
        ];
        $detail->id = md5($parentId . $detail->name[0]);
        $attributes = $detailNode->attributes();
        $detail->data = (object) [
            'cycle' => $cycles,
            'url' => isset($attributes['url_part']) ?
                PER_BASE_URL . $attributes['url_part'] :
                '',
            'school_year' => array_map(function($item) {
                $matches;
                preg_match('/^(\d+)[^\d]*(\d+)?/', (string) $item, $matches);
                if (!isset($matches[2])) {
                    return $matches[1];
                }
                return $matches[1] . '-' . $matches[2];
            }, $detailNode->xpath('./school_year')),
        ];

        $parentChild[$detail->id] = [];

        $list[$detail->id] = $detail;
        $parentChild[$parentId][] = $detail->id;
    }

    return $parentChild[$parentId];
};

// Aggregate cycle data.
$aggregateCycleData = function(&$element, $childIds) use (&$list) {
    foreach ($childIds as $childId) {
        $child = $list[$childId];
        $element->data->cycle = array_merge($element->data->cycle, $child->data->cycle);
    }
    $element->data->cycle = array_unique($element->data->cycle);
};


// Aggregate school year data.
$aggregateSchoolYearData = function(&$element, $childIds) use (&$list) {
    foreach ($childIds as $childId) {
        $child = $list[$childId];
        $element->data->school_year = array_merge($element->data->school_year, $child->data->school_year);
    }
    $element->data->school_year = array_unique($element->data->school_year);
};

$fetchDomains();


// Export to a flat-tree structure for JSON.
$json = [];
foreach ($parentChild as $uuid => $childUuids) {
    $json[$uuid] = [];
    foreach ($childUuids as $childUuid) {
        $json[$uuid][] = $list[$childUuid];
    }
}

file_put_contents('./json/per_full.json', json_encode($json, JSON_PRETTY_PRINT));
