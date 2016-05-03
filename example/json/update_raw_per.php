#!/usr/bin/env php
<?php

$json = json_decode(file_get_contents(
  __DIR__ . '/per_example.json.back'
), true);

foreach ($json as &$group) {
  foreach ($group as &$item) {
    if (isset($item['data'])) {
      $item['data'] = (array) $item['data'];

      // We first start constructing the table of titles and progressions.
      $table = array();

      if (!empty($item['data']['raw_per']['progressions'])) {
        $schoolYears = array();
        foreach ($item['data']['raw_per']['progressions'] as $progressionsData) {
          foreach ($progressionsData['items'] as $progressionsDataItem) {
            // Add the item to the appropriate rows.
            foreach ($progressionsDataItem['lignes'] as $rowNumber) {
              // we need to add the colspan information. This is deduced from
              // the school years. School years are grouped in columns:
              // - Cycle 1: 1-2 and 3-4
              // - Cycle 2: 5-6 and 7-8
              // - Cycle 3: 9, 10 and 11
              // This means we can treat 1, 3, 5, 7, 9, 10 and 11 as
              // "representatives" of their respective columns.
              $colspan = 0;
              foreach ($progressionsData['annees'] as $year) {
                if (in_array($year, [1, 3, 5, 7, 9, 10, 11])) {
                  $colspan++;

                  // Use this opportunity to store the school years.
                  if (!isset($schoolYears[$year])) {
                    switch ($year) {
                      case 1:
                        $schoolYears[$year] = '1-2';
                        break;
                      case 3:
                        $schoolYears[$year] = '3-4';
                        break;
                      case 5:
                        $schoolYears[$year] = '5-6';
                        break;
                      case 7:
                        $schoolYears[$year] = '7-8';
                        break;
                      default:
                        $schoolYears[$year] = (string) $year;
                        break;
                    }
                  }
                }
              }

              // @todo Rowspan!!
              $table[$rowNumber][] = array(
                'type' => 'progression',
                'colspan' => $colspan,
                'school_years' => implode('-', $progressionsData['annees']),
                'content' => array_map(function($content) {
                  return array(
                    'id' => $content['id'],
                    'value' => $content['texte'],
                  );
                }, $progressionsDataItem['contenus']),
                // Some progressions don't make any sense, like
                // "Genre conseillés:". Try to filter these out.
                'is_selectable' => true,
                /* Check with FriTic; this one is really tricky...
                'is_selectable' =>
                  count($progressionsDataItem['contenus']) > 2 ||
                  !preg_match('/:$/', trim($progressionsDataItem['contenus'][0]['texte'])),
                */
              );
            }
          }
        }

        // Add empty cells where needed. Some rows don't have enough cells to
        // span the entire width, and the existing cells are not *supposed* to
        // span. Add empty cells to pad them. We deduce this by looking at the
        // school years.
        // We check each row. If a row misses a cell for a specific school year,
        // we add an empty cell, but *only* if the previous cell doesn't have
        // a cell spanning multiple rows... yeah, it's super-complex...
        $schoolYears = array_values($schoolYears);
        foreach ($table as $rowNumber => $row) {
          $coveredYears = array();
          foreach ($row as $cell) {
            $coveredYears[] = $cell['school_years'];
          }

          $missingYears = array_diff($schoolYears, $coveredYears);
          if (!empty($missingYears)) {
            // Add empty cells.
            foreach ($missingYears as $missingYear) {
              $table[$rowNumber][] = array(
                'type' => 'empty',
                'colspan' => 1,
                'school_years' => $missingYear,
                'content' => [],
                'is_selectable' => false,
              );
            }

            // Re-order the cells in the table, to make sure the empty ones pad
            // at the correct place.
            usort($table[$rowNumber], function($a, $b) {
              $aYear = (int) @reset(explode('-', $a['school_years']));
              $bYear = (int) @reset(explode('-', $b['school_years']));
              return $aYear > $bYear;
            });
          }
        }

      }

      if (!empty($item['data']['raw_per']['titres'])) {
        $titleRows = array();
        foreach ($item['data']['raw_per']['titres'] as $titleData) {
          // Add the item to the appropriate rows.
          foreach ($titleData['lignes'] as $rowNumber) {
            $titleRows[$rowNumber] = $rowNumber;
            $table[$rowNumber][] = array(
              'type' => 'title',
              // Titles never span rows. Colspans are computed below, but given
              // a default value of 1.
              'rowspan' => 1,
              'colspan' => 1,
              'content' => array_map(function($content) {
                return array(
                  'value' => $content,
                );
              }, $titleData['contenus']),
              'level' => (int) $titleData['niveau'],
              'is_selectable' => false,
            );
          }
        }

        // The colspan for titles are much more complicated. We simply need to
        // deduce the number of columns, and see if any of our rows containing
        // titles are "missing" cells. If so, we need to span.
        // First, get the maximum "width" of the table, which will define our
        // maximum colspan.
        $max = 0;
        foreach ($table as $row) {
          $colspanTotal = 0;
          foreach ($row as $cell) {
            $colspanTotal += !empty($cell['colspan']) ? $cell['colspan'] : 1;
          }
          $max = max($max, $colspanTotal);
        }

        // Now, iterate over all rows containing titles, and make sure we set
        // the correct colspan values. It is useful to note that titles *never*
        // span rows; only columns.
        foreach ($titleRows as $titleRowId) {
          $row =& $table[$titleRowId];
          if (count($row) < $max) {
            // Using end() here doesn't work, as we cannot get the cell by
            // reference using end().
            $lastCell =& $row[count($row) - 1];
            $lastCell['colspan'] = $max - count($row) + 1;
          }
        }

        // Sort the table rows.
        ksort($table);

        // Now add the table to the objective item.
        $item['data']['per_table'] = $table;


        /*
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
                'per_table' => $table,
              ),
              'hasChildren' => false,
            );
          }
        }
        */
      }

      /*
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
      //*/
    }
  }
}

file_put_contents(__DIR__ . '/per_example.json', json_encode($json, JSON_PRETTY_PRINT));
