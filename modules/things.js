import { JSONPath } from "https://cdn.jsdelivr.net/npm/jsonpath-plus@5.0.3/dist/index-browser-esm.min.js";

import { getCurrentEnv } from './environments.js';
import * as Main from '../main.js';
import * as Policies from './policies.js';
import * as Features from './features.js';

export let theThing;
let theAttribute;


let searchTimeout;
let theFieldIndex = -1;

let thingJsonEditor = ace.edit("thingJsonEditor");;

export function ready() {
    thingJsonEditor.session.setMode("ace/mode/json");

    $('#searchFavourite').click(() => {
        $('#favIcon').toggleClass('fas');
        toggleFilterFavourite($('#filterEdit').val());
    }) 
    $('#searchThings').click(() => {
        searchThings();
    });
    $('#filterEdit').on('keyup', function (e) {
        if (e.key === 'Enter' || e.keyCode === 13) {
            searchThings();
        } else {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (getCurrentEnv().filterList.indexOf($('#filterEdit').val()) >= 0) {
                    $('#favIcon').addClass('fas');
                } else {
                    $('#favIcon').removeClass('fas');
                }
            }, 1000);
        }
    });
    $('#filterEdit').on('click', function() {
        if ($(this)[0].selectionStart == $(this)[0].selectionEnd) {
            $(this).select();
        };
    });
    $('#createThing').click(function() {
        $.ajax(getCurrentEnv().api_uri + '/api/2/things', {
            type: 'POST',
            contentType: 'application/json',
            data: '{}',
            success: function(data, textStatus, xhr) {
                Main.showSuccess(data, textStatus, xhr);
                searchThings();
            },
            error: Main.showError
        });
    });

    $('#putThing').click(clickModifyThing('PUT'));
    $('#deleteThing').click(clickModifyThing('DELETE'));

    $('#thingsTable').on('click', 'tr', function(event) {
        refreshThing($(this)[0].id);
    });

    $('#fieldList').on('click', 'tr', function() {
        console.log(theFieldIndex);
        if (theFieldIndex == $(this).index()) {
            theFieldIndex = -1;
        } else {
            theFieldIndex = $(this).index();
            $('#fieldActive')[0].active = getCurrentEnv().fieldList[theFieldIndex].active;
            $('#fieldPath').val(getCurrentEnv().fieldList[theFieldIndex].path);
        }
        // getCurrentEnv().fieldList[$(this).index()].active = !getCurrentEnv().fieldList[$(this).index()].active;
        console.log('theFieldIndex: ' + theFieldIndex);
    });
    
    $('#fieldActive').click(function() {
        if (theFieldIndex < 0) { return; };
        getCurrentEnv().fieldList[theFieldIndex].active = !getCurrentEnv().fieldList[theFieldIndex].active;
        updateFieldList();
    });

    $('#fieldUpdate').click(function() {
        if ($('#fieldPath').val() === "") { return;};
        if (theFieldIndex < 0) {
            getCurrentEnv().fieldList.push({
                active: true,
                path: $('#fieldPath').val()
            });
            theFieldIndex = getCurrentEnv().fieldList.length - 1;
        } else {
            getCurrentEnv().fieldList[theFieldIndex].path = $('#fieldPath').val();
        }
        updateFieldList();
    });

    $('#fieldDelete').click(function() {
        if (theFieldIndex < 0) { return;}
        getCurrentEnv().fieldList.splice(theFieldIndex, 1);
        updateFieldList();
        theFieldIndex = -1;
    })

    $('#fieldUp').click(function() {
        if (theFieldIndex <= 0) { return;}
        let movedItem = getCurrentEnv().fieldList[theFieldIndex];
        getCurrentEnv().fieldList.splice(theFieldIndex, 1);
        theFieldIndex--;
        getCurrentEnv().fieldList.splice(theFieldIndex, 0, movedItem);        
        updateFieldList();
    });

    $('#fieldDown').click(function() {
        if (theFieldIndex < 0 || theFieldIndex === getCurrentEnv().fieldList.length - 1) { return;}
        let movedItem = getCurrentEnv().fieldList[theFieldIndex];
        getCurrentEnv().fieldList.splice(theFieldIndex, 1);
        theFieldIndex++;
        getCurrentEnv().fieldList.splice(theFieldIndex, 0, movedItem);        
        updateFieldList();
    });

    // Attributes -------------------------------
    $('#attributesTable').on('click', 'tr', function(event) {
        theAttribute = $(this).children(":first").text();
        refreshAttribute(theThing, theAttribute);
    });

    $('#putAttribute').click(clickAttribute('PUT'));
    $('#deleteAttribute').click(clickAttribute('DELETE'));
}

function toggleFilterFavourite(filter) {
    if (filter === '') { return; };
    let i = getCurrentEnv().filterList.indexOf(filter);
    if (i >= 0) {
        getCurrentEnv().filterList.splice(i, 1);
    } else {
        getCurrentEnv().filterList.push(filter);
    }
    updateFilterList();
};

export function updateFieldList() {
    $('#fieldList').empty();
    for (let i = 0; i < getCurrentEnv().fieldList.length; i++) {
        let field = getCurrentEnv().fieldList[i];
        Main.addTableRow($('#fieldList')[0], field.active, field.path, $('#fieldPath').val() === field.path);
    }
};

export function updateFilterList() {
    $('#filterList').empty();
    getCurrentEnv().filterList.forEach((filter,i) => {
        Main.addTableRow($('#filterList')[0], filter);
    });
    $('#filterEdit').autocomplete({
        source: getCurrentEnv().filterList
    });
};


export function searchThings() {
    let filter = $('#filterEdit').val();
    let fields = getCurrentEnv().fieldList.filter( f => f.active).map( f => f.path);
    $.getJSON(getCurrentEnv().api_uri + "/api/2/search/things"
    + "?fields=thingId"
    + (fields != '' ? "," + fields : '')
    + (filter != '' ? "&filter=" + encodeURIComponent(filter) : '')
    + "&option=sort(%2BthingId)")
        .done(function(searchResult) {
            $('#thingsTable').empty();
            searchResult.items.forEach((item, t) => {
                let row = $('#thingsTable')[0].insertRow();
                row.id = item.thingId;
                row.insertCell(0).innerHTML = item.thingId;
                fields.forEach((key, i) => {
                    let path = key.replace(/\//g, '.');
                    if (path.charAt(0) != '.') {
                        path = '$.' + path;
                    }
                    let elem = JSONPath({json: item, path: path});
                    row.insertCell(-1).innerHTML = elem.length != 0 ? elem[0] : '';
                });
            });
            $('#filter-examples').append($('<option>', {text: filter}));
        }).fail(Main.showError);
};

function clickModifyThing(method) {
    return function() {
        if (!$('#thingId').val()) { Main.showError(null, 'Error', 'thingId is empty'); return; }
        Main.callDittoREST(
            method,
            '/things/' + $('#thingId').val(),
            method === 'PUT' ? thingJsonEditor.getValue() : null,
            function() { method === 'PUT' ? refreshThing(thingId) : searchThings(); }
        );
    };
};

export function refreshThing(thingId) {
    $.getJSON(getCurrentEnv().api_uri + "/api/2/things/" + thingId + "?fields=thingId%2Cattributes%2Cfeatures%2C_created%2C_modified%2C_revision%2C_policy")
        .done(function(thing, status, xhr) {
            Main.showSuccess(null, status, xhr);
            theThing = thing;
            Policies.onThingChanged(thing);

            // Update fields of Thing table
            $('#thingDetails').empty();
            Main.addTableRow($('#thingDetails')[0], 'thingId', thing.thingId);
            Main.addTableRow($('#thingDetails')[0], 'policyId', thing._policy.policyId);
            Main.addTableRow($('#thingDetails')[0], 'revision', thing._revision);
            Main.addTableRow($('#thingDetails')[0], 'created', thing._created);
            Main.addTableRow($('#thingDetails')[0], 'modified', thing._modified);
            
            // Update attributes table
            $('#attributesTable').empty();
            let count = 0;
            let thingHasAttribute = false;
            if (thing.attributes) {
                for (let key of Object.keys(thing.attributes)) {
                    if (key === theAttribute) {
                        refreshAttribute(thing, key);
                        thingHasAttribute = true;
                    };
                    Main.addTableRow($('#attributesTable')[0], key, JSON.stringify(thing.attributes[key]), key === theAttribute);
                    count++;
                };
            }
            $('#attributeCount').text(count > 0 ? count : "");
            if (!thingHasAttribute) {
                theAttribute = false;
                refreshAttribute();
            }
            
            Features.refreshThing(thing);

            // Update edit thing area
            let thingCopy = theThing;
            delete thingCopy['_revision'];
            delete thingCopy['_created'];
            delete thingCopy['_modified'];
            delete thingCopy['_policy'];
            thingCopy.policyId = Policies.thePolicy.policyId;
            $('#thingId').val(theThing.thingId);
            thingJsonEditor.setValue(JSON.stringify(thingCopy, null, 2));
            
            // Update policy
            $('#thePolicyId').val(Policies.thePolicy.policyId);
            Policies.refreshPolicy();
        }).fail(Main.showError);
};

function clickAttribute (method) {
    return function() {
        if (!theThing) { Main.showError(null, 'Error', 'No Thing selected'); return; };
        if (!$('#attributePath').val()) { Main.showError(null, 'Error', 'AttributePath is empty'); return; };
        Main.callDittoREST(
            method,
            '/things/' + theThing.thingId + '/attributes/' + $('#attributePath').val(),
            method === 'PUT' ? '"' + $('#attributeValue').val() + '"' : null,
            function() { refreshThing(theThing.thingId); }
        );
    };
};

function refreshAttribute(thing, attribute) {
    $('#attributePath').val(thing ? attribute : '');
    $('#attributeValue').val(thing ? JSON.stringify(thing.attributes[attribute]) : '');
}


