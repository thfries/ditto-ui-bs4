/* eslint-disable require-jsdoc */
import * as Environments from '../environments/environments.js';
import * as Utils from '../utils.js';
import * as Things from './things.js';

// const filterExamples = [
//   'eq(attributes/location,"kitchen")',
//   'ge(thingId,"myThing1")',
//   'gt(_created,"2020-08-05T12:17")',
//   'exists(features/featureId)',
//   'and(eq(attributes/location,"kitchen"),eq(attributes/color,"red"))',
//   'or(eq(attributes/location,"kitchen"),eq(attributes/location,"living-room"))',
//   'like(attributes/key1,"known-chars-at-start*")',
// ];

let keyStrokeTimeout;

const dom = {
  filterList: null,
  favIcon: null,
  searchFilterEdit: null,
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
    checkIfFavourite();
    Things.searchThings(event.target.textContent);
  });

  document.getElementById('searchThings').onclick = searchTriggered;

  document.getElementById('searchFavourite').onclick = () => {
    dom.favIcon.classList.toggle('bi-star');
    dom.favIcon.classList.toggle('bi-star-fill');
    toggleFilterFavourite(dom.searchFilterEdit.value);
  };

  dom.searchFilterEdit.onkeyup = (event) => {
    if (event.key === 'Enter' || event.code === 13) {
      searchTriggered();
    } else {
      clearTimeout(keyStrokeTimeout);
      keyStrokeTimeout = setTimeout(checkIfFavourite, 1000);
    }
  };
};

function onEnvironmentChanged() {
  if (!Environments.current()['filterList']) {
    Environments.current().filterList = [];
  };
  updateFilterList();
};

function searchTriggered() {
  const filter = dom.searchFilterEdit.value;
  const regex = /^(eq\(|ne\(|gt\(|ge\(|lt\(|le\(|in\(|like\(|exists\(|and\(|or\(|not\().*/;
  if (filter === '' || regex.test(filter)) {
    Things.searchThings(filter);
  } else {
    Things.getThings([filter]);
  }
}

function updateFilterList() {
  dom.filterList.innerHTML = '';
  Environments.current().filterList.forEach((filter, i) => {
    Utils.addTableRow(dom.filterList, filter);
  });
  // $('#searchFilterEdit').autocomplete({
  //   source: Environments.getCurrentEnv().filterList.concat(filterExamples),
  // });
};

function toggleFilterFavourite(filter) {
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

function checkIfFavourite() {
  if (Environments.current().filterList.indexOf(dom.searchFilterEdit.value) >= 0) {
    dom.favIcon.classList.replace('bi-star', 'bi-star-fill');
  } else {
    dom.favIcon.classList.replace('bi-star-fill', 'bi-star');
  }
}

