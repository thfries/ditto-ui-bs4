/* eslint-disable prefer-const */
/* eslint-disable require-jsdoc */
import * as Environments from '../environments/environments.js';
import * as Utils from '../utils.js';
import * as Things from './things.js';

const filterExamples = [
  'eq(attributes/location,"kitchen")',
  'ge(thingId,"myThing1")',
  'gt(_created,"2020-08-05T12:17")',
  'exists(features/featureId)',
  'and(eq(attributes/location,"kitchen"),eq(attributes/color,"red"))',
  'or(eq(attributes/location,"kitchen"),eq(attributes/location,"living-room"))',
  'like(attributes/key1,"known-chars-at-start*")',
];

let dom = {
  filterList: null,
};

export async function ready() {
  Environments.addChangeListener(onEnvironmentChanged);

  Utils.addTab(
      document.getElementById('thingsTabsItems'),
      document.getElementById('thingsTabsContent'),
      'Search Filter',
      await( await fetch('modules/things/searchFilter.html')).text(),
  );

  Utils.getAllElementsById(dom);

  dom.filterList.addEventListener('click', (event) => {
    Things.setSearchFilterEdit(event.target.textContent);
  });

  dom.filterList.addEventListener('dblclick', (event) => {
    Things.setSearchFilterEdit(event.target.textContent);
    Things.searchThings(event.target.textContent);
  });
};


function onEnvironmentChanged() {
  if (!Environments.current()['filterList']) {
    Environments.current().filterList = [];
  };
  updateFilterList();
};

function updateFilterList() {
  dom.filterList.innerHTML = '';
  Environments.current().filterList.forEach((filter, i) => {
    Utils.addTableRow(dom.filterList, filter);
  });
  // $('#searchFilterEdit').autocomplete({
  //   source: Environments.getCurrentEnv().filterList.concat(filterExamples),
  // });
};

export function toggleFilterFavourite(filter) {
  if (filter === '') {
    return;
  };
  const i = Environments.current().filterList.indexOf(filter);
  if (i >= 0) {
    Environments.current().filterList.splice(i, 1);
  } else {
    Environments.current().filterList.push(filter);
  }
  Environments.environmentsJsonChanged();
};
