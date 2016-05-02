#!/usr/bin/env php
<?php

$json = json_decode(file_get_contents(
  __DIR__ . '/per_example.json.back'
), true);

foreach ($json as &$group) {
  foreach ($group as &$item) {
    if (isset($item['data'])) {
      $item['data'] = (array) $item['data'];

      /*if (!empty($item['data']['raw_per']['titres'])) {

        if (!isset($json[$item['id']])) {
          $json[$item['id']] = array();
        }

        foreach ($item['data']['raw_per']['titres'] as $titleData) {
          // Only show level 1 items.
          if ((int) $titleData['niveau'] === 1) {
            $json[$item['id']][] = array(
              'id' => 'titres-' . md5(serialize($titleData['contenus'])),
              'type' => 'title',
              'name' => $titleData['contenus'],
              'data' => array(
                'is_selectable' => false,
              ),
              'hasChildren' => false,
            );
          }
        }
      }*/

      if (!empty($item['data']['raw_per']['progressions'])) {

        if (!isset($json[$item['id']])) {
          $json[$item['id']] = array();
        }

        foreach ($item['data']['raw_per']['progressions'] as $progressionsData) {
          foreach ($progressionsData['items'] as $progressionsDataItems) {
            foreach ($progressionsDataItems['contenus'] as $progression) {
              $json[$item['id']][] = array(
                'id' => 'progressions-' . $progression['id'],
                'type' => 'progression',
                'name' => [ str_replace(array("\r\n", "\n"), '', $progression['texte']) ],
                'data' => array(
                  'per_school_years' => $progressionsData['annees'],
                ),
                'hasChildren' => false,
              );
            }
          }
        }
      }
    }
  }
}

file_put_contents(__DIR__ . '/per_example.json', json_encode($json, JSON_PRETTY_PRINT));
