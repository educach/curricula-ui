#!/usr/bin/env php
<?php

$json = json_decode(file_get_contents(
  __DIR__ . '/per_example.json.back'
), true);

foreach ($json as &$group) {
  foreach ($group as &$item) {
    if (isset($item['data'])) {
      $item['data'] = (array) $item['data'];

      // Use the new isSelectable key.
      if (isset($item['data']['isSelectableGroup'])) {
        $item['data']['isSelectable'] = $item['data']['isSelectableGroup'];
        unset($item['data']['isSelectableGroup']);
      }

      // Same goes for the isGroup key.
      if (isset($item['data']['is_group'])) {
        $item['data']['isGroup'] = $item['data']['is_group'];
        unset($item['data']['is_group']);
      }

      // And the perCode key.
      if (isset($item['data']['per_code'])) {
        $item['data']['perCode'] = $item['data']['per_code'];
        unset($item['data']['per_code']);
      }

      // Add cycle information.
      if (!isset($item['data']['cycle'])) {
        $match;
        if (preg_match('/^cycles-(\d+)/', $item['id'], $match)) {
          $item['data']['cycle'] = $match[1];
        }
      }

      if (!isset($json[$item['id']])) {
        $json[$item['id']] = array();
      }

      // We first start constructing the table of titles and progressions.
      $table = array();

      if (!empty($item['data']['raw_per']['progressions'])) {
        $schoolYears = array();
        foreach ($item['data']['raw_per']['progressions'] as $progressionsData) {
          foreach ($progressionsData['items'] as $progressionsDataItem) {
            // Use this opportunity to add the progression items to the
            // database.
            foreach ($progressionsDataItem['contenus'] as $progression) {
              $json[$item['id']][$progression['id']] = array(
                'id' => 'progressions-' . $progression['id'],
                'type' => 'progression',
                'name' => [ str_replace(["\r\n", "\n", "\r"], '', $progression['texte']) ],
                'data' => array(
                  'perSchoolYears' => $progressionsData['annees'],
                ),
                'hasChildren' => false,
              );
            }

            // Add the item to the appropriate rows.
            foreach ($progressionsDataItem['lignes'] as $rowNumber) {
              $rowNumber = (int) $rowNumber;

              // We need to add the colspan information. This is deduced from
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

              $table[$rowNumber][] = array(
                'type' => 'progression',
                'colspan' => $colspan,
                'rowspan' => 1,
                'perSchoolYears' => implode('-', $progressionsData['annees']),
                'content' => array_map(function($content) {
                  return array(
                    'id' => 'progressions-' . $content['id'],
                    'value' => $content['texte'],
                  );
                }, $progressionsDataItem['contenus']),
                'isSelectable' => true,
                /* Check with FriTic; this one is really tricky...
                // Some progressions don't make any sense, like
                // "Genre conseillés:". Try to filter these out.
                'isSelectable' =>
                  count($progressionsDataItem['contenus']) > 2 ||
                  !preg_match('/:$/', trim($progressionsDataItem['contenus'][0]['texte'])),
                */
              );
            }
          }
        }

        // Now, some elements are sneaky: they are defined *twice* for the same
        // row, just not in the same place. On the official site, these are
        // supposed to be merged via colspan (if possible; sometimes a cell sits
        // between them) or rowspan. In order to check this, we iterate over
        // each row, and check the IDs. If the same IDs is present twice for the
        // same row, increase the colspan. We do the same for the cells across
        // rows, which is a bit trickier.

        // Start with the colspan. Calculate a hash for each cell. This will
        // make comparisons easier (I hope). If we find that a previous cell
        // already has the same hash, we remove the current one and make the
        // previous one span.
        foreach ($table as $rowNumber => $row) {
          $prevCell = null;
          $j = 0;
          foreach ($row as $i => $cell) {
            $cell['_hash'] = md5(serialize($cell['content']));

            // We can only check if this is not the 1st cell in the row.
            if ($prevCell) {
              // If the hashes match, remove the current cell and span the
              // previous one. Also add the school years to this one.
              if ($prevCell['_hash'] == $cell['_hash']) {
                $table[$rowNumber][$j]['perSchoolYears'] .= ' ' . $cell['perSchoolYears'];
                $table[$rowNumber][$j]['colspan']++;
                $table[$rowNumber][$i] = null;

                // Don't re-assign $prevCell and $j.
                continue;
              }
            }

            $j = $i;
            $prevCell = $cell;
          }

          // Remove empty cells.
          $table[$rowNumber] = array_filter($table[$rowNumber]);
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
            $coveredYears = array_merge($coveredYears, explode(' ', $cell['perSchoolYears']));
          }

          $missingYears = array_diff($schoolYears, $coveredYears);
          if (!empty($missingYears)) {
            // Add empty cells.
            foreach ($missingYears as $missingYear) {
              $table[$rowNumber][] = array(
                'type' => 'empty',
                'rowspan' => 1,
                'colspan' => 1,
                'perSchoolYears' => $missingYear,
                'content' => [],
                'isSelectable' => false,
              );
            }

            // Re-order the cells in the table, to make sure the empty ones pad
            // at the correct place.
            usort($table[$rowNumber], function($a, $b) {
              $aYear = (int) @reset(explode('-', $a['perSchoolYears']));
              $bYear = (int) @reset(explode('-', $b['perSchoolYears']));
              return $aYear > $bYear;
            });
          }
        }

        // Sort the table rows; we have to do it here, because otherwise the
        // rowspans will be all messed up.
        ksort($table, SORT_NUMERIC);

        // Now, finally compute the rowspans. We use a similar approach to the
        // one used for the colspans.
        $map = array();
        $j = null;
        foreach ($table as $rowNumber => $row) {
          foreach ($row as $i => $cell) {
            // Make sur we're at least in the 2nd row (starts at 1).
            if ($rowNumber > 1) {
              // Empty cells are not checked.
              if ($cell['type'] == 'empty') {
                continue;
              }

              // Do we have an indication against what to check? If not, simply
              // check against the cell "right" above.
              if (isset($map[$i]) && isset($table[$map[$i]][$i])) {
                $j = $map[$i];
              } elseif (isset($table[$rowNumber-1][$i])) {
                $j = $rowNumber-1;
              } else {
                // Edge-case. Skip.
                continue;
              }

              // Check the cells.
              if (md5(serialize($cell['content'])) == md5(serialize($table[$j][$i]['content']))) {
                $table[$j][$i]['rowspan']++;
                $table[$rowNumber][$i] = null;

                // On the next run, the current cell won't exist anymore, so
                // $table[$rowNumber-1][$i] won't work. We use a map to specify
                // against which row each column should be checked. Update it
                // now.
                $map[$i] = $j;
              } else {
                // The next row, for this column, should check against the
                // current cell.
                $map[$i] = $rowNumber;
              }
            }
          }

          // Remove empty cells.
          $table[$rowNumber] = array_filter($table[$rowNumber]);
        }
      }

      if (!empty($item['data']['raw_per']['titres'])) {
        $titleRows = array();
        foreach ($item['data']['raw_per']['titres'] as $titleData) {
          // Add the item to the appropriate rows.
          foreach ($titleData['lignes'] as $rowNumber) {
            // Store the row numbers that are in fact title rows.
            if (!isset($titleRows[$rowNumber])) {
              $titleRows[$rowNumber] = $rowNumber;
            }

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
              'isSelectable' => false,
            );
          }
        }

        // The colspan for titles are much more complicated. We need to deduce
        // the number of columns, and see if any of our rows containing titles
        // are "missing" cells. If so, we need to span.
        // First, get the maximum "width" of the table, which will define our
        // maximum colspan. For that, we iterate over each row, adding up all
        // the colspan values (default to 1). The row with the highest value
        // will be used as a reference.
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
        // span rows; they only span columns.
        foreach ($titleRows as $titleRowId) {
          $row = $table[$titleRowId];
          if (count($row) < $max) {
            // We simply let the last title span the appropriate amount of
            // columns. This should be correct in 99% of cases...
            $rowCount = count($row);
            $table[$titleRowId][$rowCount - 1]['colspan'] = $max - $rowCount + 1;
          }
        }

        // Sort the table rows again.
        ksort($table, SORT_NUMERIC);
      }

      // Now add the table to the objective item.
      if (!empty($table)) {
        $item['data']['perTable'] = $table;
        $item['data']['perSchoolYears'] = array_values($schoolYears);
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
                  'perSchoolYears' => $progressionsData['annees'],
                ),
                'hasChildren' => false,
              );
            }
          }
        }
      }
      //*/

      // Remove the raw data.
      unset($item['data']['raw_per']);
    }
  }
}

file_put_contents(__DIR__ . '/per_example.json', json_encode($json/**/, JSON_PRETTY_PRINT/**/));
