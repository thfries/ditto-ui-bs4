/* eslint-disable prefer-const */
/* eslint-disable require-jsdoc */
import * as Environments from '../environments.js';
import * as Main from '../../main.js';

const filterExamples = [
  'eq(attributes/location,"kitchen")',
  'ge(thingId,"myThing1")',
  'gt(_created,"2020-08-05T12:17")',
  'exists(features/featureId)',
  'and(eq(attributes/location,"kitchen"),eq(attributes/color,"red"))',
  'or(eq(attributes/location,"kitchen"),eq(attributes/location,"living-room"))',
  'like(attributes/key1,"known-chars-at-start*")',
];

let dom = {};

export async function ready() {
  Environments.addChangeListener(onEnvironmentChanged);

  Main.addTab(
      document.getElementById('thingsTabsItems'),
      document.getElementById('thingsTabsContent'),
      'Search Filter',
      await( await fetch('modules/things/searchFilter.html')).text(),
  );

  dom.filterList = document.getElementById('filterList');
};


function onEnvironmentChanged() {
  if (!Environments.getCurrentEnv()['filterList']) {
    Environments.getCurrentEnv().filterList = [];
  };
  updateFilterList();
};

function updateFilterList() {
  dom.filterList.innerHTML = '';
  Environments.getCurrentEnv().filterList.forEach((filter, i) => {
    Main.addTableRow(dom.filterList, filter);
  });
  $('#searchFilterEdit').autocomplete({
    source: Environments.getCurrentEnv().filterList.concat(filterExamples),
  });
};

export function toggleFilterFavourite(filter) {
  if (filter === '') {
    return;
  };
  const i = Environments.getCurrentEnv().filterList.indexOf(filter);
  if (i >= 0) {
    Environments.getCurrentEnv().filterList.splice(i, 1);
  } else {
    Environments.getCurrentEnv().filterList.push(filter);
  }
  Environments.environmentsJsonChanged();
};
