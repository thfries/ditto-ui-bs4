'use strict';

import { config } from './config.js';
import { JSONPath } from "https://cdn.jsdelivr.net/npm/jsonpath-plus@5.0.3/dist/index-browser-esm.min.js";

let settings = {
    local_ditto: {
        api_uri: 'http://localhost:8080',
        solutionId: null,
        bearer:  null,
        usernamePassword: 'ditto:ditto',
        useBasicAuth: true
    },
    cloud_things_aws: {
        api_uri: 'https://things.eu-1.bosch-iot-suite.com',
        solutionId: null,
        bearer:  null,
        usernamePassword: null,
        useBasicAuth: false
    }
};

let theEnv;
let theThing;
let theAttribute;
let theFeature;
let thePolicy;
let thePolicyEntry;
let connectionIdList;
let theConnection;

let thingJsonEditor;

$(document).ready(function () {

    $(".nav-item").on("click", function(){
        $(this).addClass("active").siblings().removeClass("active");
     });

    $('.table').on('click', 'tr', function() {
        $(this).addClass('bg-info').siblings().removeClass('bg-info');
    });

    // Things -----------------------------------
    thingJsonEditor = ace.edit("thingJsonEditor");
    thingJsonEditor.session.setMode("ace/mode/json");

    // make ace editor resize when user changes height
    $(".resizable_pane").mouseup(function(event) {
        let oldHeight = $(this).data('oldHeight');
        if (oldHeight && oldHeight != $(this).height()) {
            window.dispatchEvent(new Event('resize'))
        }
        $(this).data('oldHeight', $(this).height());
    });

    $('#searchThings').click(searchThings);
    $('#createThing').click(function() {
        $.ajax(settings[theEnv].api_uri + '/api/2/things', {
            type: 'POST',
            contentType: 'application/json',
            data: '{}',
            success: function(data, textStatus, xhr) {
                showSuccess(data, textStatus, xhr);
                searchThings();
            },
            error: showError
        });
    });

    $('#putThing').click(function() {
        let thingId = $('#thingId').val();
        let thingJson = thingJsonEditor.getValue();
        if (!thingId) { showError(null, 'Error', 'thingId must not be empty'); return; };
        callDittoREST(
            thingJson ? 'PUT' : 'DELETE',
            '/things/' + thingId,
            thingJson,
            function() { thingJson ? refreshThing(thingId) : searchThings(); }
        );
    });

    $('#thingsTable').on('click', 'tr', function(event) {
        refreshThing($(this)[0].id);
    });

    // Attributes -------------------------------
    $('#attributesTable').on('click', 'tr', function(event) {
        theAttribute = $(this).children(":first").text();
        refreshAttribute(theThing, theAttribute);
    });

    $('#putAttribute').click(function() {
        let value = $('#attributeValue').val();
        modifyThing(value ? 'PUT' : 'DELETE', '/attributes/', $('#attributePath').val(), value);
    });

    // Features ---------------------------------
    $('#featuresTable').on('click', 'tr', function(event) {
        theFeature = $(this).text();
        refreshFeature(theThing, theFeature);
    });

    $('#putFeature').click(function() {
        let featureObject = {};
        if ($('#featureDefinition').val()) { featureObject.definition = $('#featureDefinition').val().split(',');};
        if ($('#featureProperties').val()) { featureObject.properties = JSON.parse($('#featureProperties').val());};
        if ($('#featureDesiredProperties').val()) { featureObject.desiredProperties = JSON.parse($('#featureDesiredProperties').val());};
        let featureValue = JSON.stringify(featureObject) === '{}' ? null : JSON.stringify(featureObject);
        modifyThing(featureValue ? 'PUT' : 'DELETE', '/features/', $('#featureId').val(), featureValue === '{}' ? null : featureValue);
    });

    $('#messageFeature').click(messageFeature);
    
    // Policies ---------------------------------
    $('#refreshPolicy').click(refreshPolicy);

    $('#policyEntriesTable').on('click', 'tr', function(event) {
        thePolicyEntry = $(this).text();
        $('#thePolicyEntry').val(thePolicyEntry);
        refillPolicySubjectsAndRessources();
    });

    $('#createPolicyEntry').click(function() { return addOrDeletePolicyEntry('PUT');});
    $('#deletePolicyEntry').click(function() { return addOrDeletePolicyEntry('DELETE');});

    $('#policySubjectsTable').on('click', 'tr', function(event) {
        let subject = $(this).children(":first").text();
        $('#policySubjectId').val(subject);
        $('#policySubjectValue').val(JSON.stringify(thePolicy.entries[thePolicyEntry].subjects[subject]));
    });

    $('#policyResourcesTable').on('click', 'tr', function(event) {
        let ressource = $(this).children(":first").text();
        $('#policyResourceId').val(ressource);
        $('#policyResourceValue').val(JSON.stringify(thePolicy.entries[thePolicyEntry].resources[ressource]));
    });

    $('#putPolicySubject').click(function() {
        modifyPolicyEntry('/subjects/', $('#policySubjectId').val(), $('#policySubjectValue').val());
    });

    $('#putPolicyResource').click(function () {
        modifyPolicyEntry('/resources/', $('#policyResourceId').val(), $('#policyResourceValue').val());
    });

    // Connections ---------------------------------
    let connectionEditor = ace.edit("connectionEditor");
    connectionEditor.session.setMode("ace/mode/json");
    let incomingEditor = ace.edit("connectionIncomingScript");
    incomingEditor.session.setMode("ace/mode/javascript");
    let outgoingEditor = ace.edit("connectionOutgoingScript");
    outgoingEditor.session.setMode("ace/mode/javascript");

    $('#loadConnections').click(loadConnections);
    
    $('#createConnection').click(function() {
        if (env() === 'things') {
            delete theConnection['id'];            
        }
        callConnectionsAPI(config[env()].createConnection, function(newConnection) {
            connectionIdList.push(newConnection.id);
            addTableRow($('#connectionsTable')[0], newConnection.id);
        });
    });

    $('#connectionsTable').on('click', 'tr', function(event) {
        callConnectionsAPI(config[env()].retrieveConnection, function(connection) {
            theConnection = connection;
            let withJavaScript = theConnection.mappingDefinitions && theConnection.mappingDefinitions.javascript;
            $('#connectionId').val(theConnection.id);
            connectionEditor.setValue(JSON.stringify(theConnection, null, 2));
            incomingEditor.setValue(withJavaScript ? theConnection.mappingDefinitions.javascript.options.incomingScript : '', -1);
            outgoingEditor.setValue(withJavaScript ? theConnection.mappingDefinitions.javascript.options.outgoingScript : '', -1);
        }, $(this)[0].id);
    });

    incomingEditor.on('blur', function() {
        theConnection.mappingDefinitions.javascript.options.incomingScript = incomingEditor.getValue();
        connectionEditor.setValue(JSON.stringify(theConnection, null, 2));
    });
    outgoingEditor.on('blur', function() {
        theConnection.mappingDefinitions.javascript.options.outgoingScript = outgoingEditor.getValue();
        connectionEditor.setValue(JSON.stringify(theConnection, null, 2));
    });
    connectionEditor.on('blur', function() {
        theConnection = JSON.parse(connectionEditor.getValue());
    });

    $('#modifyConnection').click(function() {
        if ($('#connectionJson').val()) {
            callConnectionsAPI(config[env()].modifyConnection, showSuccess, $('#connectionId').val()); 
        } else {
            callConnectionsAPI(config[env()].deleteConnection, loadConnections, $('#connectionId').val()); 
        };
    });

    // Settings ----------------------------------
    let settingsEditor = ace.edit("settingsEditor");
    settingsEditor.session.setMode("ace/mode/json");

    settingsEditor.setValue(JSON.stringify(settings, null, 2), -1);
    updateSettings(settingsEditor);
    settingsEditor.on('blur', function() { return updateSettings(settingsEditor);});

    $('#environmentSelector').on('change', function() {
        theEnv = this.value;
        setAuthHeader();
    });

    setAuthHeader();
});

let searchThings = function() {
    let filter = $('#search-filter').val();
    let fields = $('#search-fields').val();
    $.getJSON(settings[theEnv].api_uri + "/api/2/search/things"
    + "?fields=thingId"
    + (fields != '' ? "," + fields : '')
    + (filter != '' ? "&filter=" + encodeURIComponent(filter) : '')
    + "&option=sort(%2BthingId)")
        .done(function(searchResult) {
            $('#thingsTable').empty();
            for (let t in searchResult.items) {
                let item = searchResult.items[t];
                let row = $('#thingsTable')[0].insertRow();
                row.id = item.thingId;
                row.insertCell(0).innerHTML = item.thingId;
                for (let key of fields.split(',')) {
                    let elem = JSONPath({json: item, path: key.replace(/\//g, '.')});
                    row.insertCell(-1).innerHTML = elem;
                }
            }
            $('#filter-examples').append($('<option>', {text: filter}));
        }).fail(showError);
};

let refreshThing = function(thingId) {
    $.getJSON(settings[theEnv].api_uri + "/api/2/things/" + thingId + "?fields=thingId%2Cattributes%2Cfeatures%2C_created%2C_modified%2C_revision%2C_policy")
        .done(function(thing, status, xhr) {
            showSuccess(null, status, xhr);
            theThing = thing;
            thePolicy = thing._policy;
            // Update fields of Thing table
            $('#thingDetails').empty();
            addTableRow($('#thingDetails')[0], 'thingId', thing.thingId);
            addTableRow($('#thingDetails')[0], 'policyId', thePolicy.policyId);
            addTableRow($('#thingDetails')[0], 'revision', thing._revision);
            addTableRow($('#thingDetails')[0], 'created', thing._created);
            addTableRow($('#thingDetails')[0], 'modified', thing._modified);
            
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
                    addTableRow($('#attributesTable')[0], key, JSON.stringify(thing.attributes[key]), key === theAttribute);
                    count++;
                };
            }
            $('#attributeCount').text(count > 0 ? count : "");
            if (!thingHasAttribute) {
                theAttribute = false;
                refreshAttribute();
            }
            
            // Update features table
            $('#featuresTable').empty();
            count = 0;
            let thingHasFeature = false
            if (thing.features) {
                for (let key of Object.keys(thing.features)) {
                    if (key === theFeature) {
                        refreshFeature(thing, key);
                        thingHasFeature = true;
                    };
                    addTableRow($('#featuresTable')[0], key, null, key === theFeature);
                    count++;
                };
            }
            $('#featureCount').text(count > 0 ? count : "");
            if (!thingHasFeature) {
                theFeature = false;
                refreshFeature();
            }

            // Update edit thing area
            let thingCopy = theThing;
            delete thingCopy['_revision'];
            delete thingCopy['_created'];
            delete thingCopy['_modified'];
            delete thingCopy['_policy'];
            thingCopy.policyId = thePolicy.policyId;
            $('#thingId').val(theThing.thingId);
            thingJsonEditor.setValue(JSON.stringify(thingCopy, null, 2));
            
            // Update policy
            $('#thePolicyId').val(thePolicy.policyId);
            refreshPolicy();
        }).fail(showError);
};

function refreshAttribute(thing, attribute) {
    $('#attributePath').val(thing ? attribute : '');
    $('#attributeValue').val(thing ? JSON.stringify(thing.attributes[attribute]) : '');
}

function refreshFeature(thing, feature) {
    $('#featureId').val(thing ? feature : '');
    $('#featureDefinition').val(thing ? thing.features[feature].definition : '');
    $('#featureProperties').val(thing ? JSON.stringify(thing.features[feature].properties, null, 4) : '');
    $('#featureDesireProperties').val(thing ? JSON.stringify(thing.features[feature].desiredProperties, null, 4) : '');
}

function modifyThing(method, type, key, value) {
    if (!theThing) { showError(null, 'Error', 'No Thing selected'); return; }
    if (!key) { showError(null, 'Error', 'FeatureId is empty'); return; } 
    if (type === '/attributes/') {
        value = '"' + value + '"';
    };
    $.ajax(settings[theEnv].api_uri + '/api/2/things/' + theThing.thingId + type + key, {
        type: method,
        contentType: 'application/json',
        data: value,
        success: function() { refreshThing(theThing.thingId); },
        error: showError
    });
};

let messageFeature = function() {
    let subject = $('#messageFeatureSubject').val();
    let feature = $('#featureId').val();
    let timeout = $('#messageTimeout').val();
    let payload = $('#messageFeaturePayload').val();
    if (subject && feature && payload) {
        $('#messageFeatureResponse').val('');
        $.post(settings[theEnv].api_uri + '/api/2/things/' + theThing.thingId + '/features/' + feature + '/inbox/messages/' + subject + '?timeout=' + timeout,
            payload,
            function(data, status, xhr) {
                showSuccess(data, status, xhr);
                if (timeout > 0) {
                    $('#messageFeatureResponse').val(JSON.stringify(data, null, 2));
                };
            }
        );
    } else {
        showError(null, 'Error', 'FeatureId or Subject or Payload is empty');
    }
};

let refreshPolicy = function() {
    let policyId = thePolicy ? thePolicy.policyId : $('#thePolicyId').val();
    if (policyId === '') { showError(null, 'Error', 'policyId is empty'); return; }
    $.getJSON(settings[theEnv].api_uri + '/api/2/policies/' + policyId)
        .done(function(policy, status, xhr) {
            showSuccess(null, status, xhr);
            thePolicy = policy;
            $('#policyEntriesTable').empty();
            for (let key of Object.keys(thePolicy.entries)) {
                addTableRow($('#policyEntriesTable')[0], key, null, key === thePolicyEntry);
                if (key === thePolicyEntry) {
                    refillPolicySubjectsAndRessources();
                }
            };
        }).fail(showError);       
};

function refillPolicySubjectsAndRessources() {
    $('#policySubjectsTable').empty();
    for (let key of Object.keys(thePolicy.entries[thePolicyEntry].subjects)) {
        addTableRow($('#policySubjectsTable')[0], key, JSON.stringify(thePolicy.entries[thePolicyEntry].subjects[key]));
    }
    $('#policyResourcesTable').empty();
    for (let key of Object.keys(thePolicy.entries[thePolicyEntry].resources)) {
        addTableRow($('#policyResourcesTable')[0], key, JSON.stringify(thePolicy.entries[thePolicyEntry].resources[key]));
    }
};

let addOrDeletePolicyEntry = function(method) {
    let label = $('#thePolicyEntry').val();
    if (label && !(label === thePolicyEntry)) {
        $.ajax(settings[theEnv].api_uri + '/api/2/policies/' + thePolicy.policyId + '/entries/' + label, {
            type: method,
            data: JSON.stringify({ subjects: {}, resources: {}}),
            contentType: 'application/json',
            success: refreshPolicy,
            error: showError
        });
    } else {
        showError(null, 'Error', 'Entry already exists or is empty');
    }
};

function modifyPolicyEntry(type, key, value) {
    if (thePolicyEntry && key) {
        if (value) {
            $.ajax(settings[theEnv].api_uri + '/api/2/policies/' + thePolicy.policyId + '/entries/' + thePolicyEntry + type + key, {
                type: 'PUT',
                contentType: 'application/json',
                data: value,
                success: refreshPolicy,
                error: showError
            })
        } else {
            $.ajax(settings[theEnv].api_uri + '/api/2/policies/' + thePolicy.policyId + '/entries/' + thePolicyEntry + type + key, {
                type: 'DELETE',
                success: refreshPolicy,
                error: showError
            })
        }
    } else {
        showError(null, 'Error', 'No Policy Entry selected or Subject or Ressource is empty');
    }
};

let loadConnections = function() {
    callConnectionsAPI(config[env()].listConnections, function(connections) {
        connectionIdList = [];
        $('#connectionsTable').empty();
        for (let c = 0; c < connections.length; c++) {
            let id = env() === 'things' ? connections[c].id : connections[c];
            connectionIdList.push(id);
            let row = $('#connectionsTable')[0].insertRow();
            row.id = id;
            row.insertCell(0).innerHTML = id;
            callConnectionsAPI(config[env()].retrieveStatus, updateConnectionRow(row, 'liveStatus', -1), id);
            callConnectionsAPI(config[env()].retrieveConnection, updateConnectionRow(row, 'name', 0), id);
        };
    });
};

let updateConnectionRow = function (targetRow, fieldToExtract, index) {
    return function(data) {
        targetRow.insertCell(index).innerHTML = data[fieldToExtract];
    };
};

function callDittoREST(method, path, body, success) {
    $.ajax(settings[theEnv].api_uri + '/api/2' + path, {
        type: method,
        contentType: 'application/json',
        data: body,
        success: success,
        error: showError
    });
};

function callConnectionsAPI(params, successCallback, connectionId) {
    if (env() === 'things' && !settings[theEnv].solutionId) { showError(null, 'Error', 'SolutionId is empty'); return; };
    $.ajax(settings[theEnv].api_uri + params.path.replace('{{solutionId}}', settings[theEnv].solutionId).replace('{{connectionId}}', connectionId), {
        type: params.method,
        data: params.body ? params.body.replace('{{connectionId}}', connectionId).replace('{{connectionJson}}', JSON.stringify(theConnection)) : null,
        contentType: 'application/json',
        success: function(data, status, xhr) {
            if(data && data['?'] && data['?']['?'].status >= 400) {
                showError(null, data['?']['?'].status, JSON.stringify(data['?']['?'].payload));
            } else {
                if (params.unwrapJsonPath) {
                    params.unwrapJsonPath.split('.').forEach(function(node) {
                        data = data[node];
                    });
                };
                successCallback(data, status, xhr);
            }
        },
        error: showError
    });
};

function updateSettings(editor) {
    settings = JSON.parse(editor.getValue());
    $("#environmentSelector").empty();
    if (theEnv && !settings[theEnv]) { theEnv = null;};
    for (let key of Object.keys(settings)) {
        if (!theEnv) { theEnv = key; }
        $('#environmentSelector').append($('<option></option>').text(key));
    };
    $('#environmentSelector').val(theEnv);
}

function fillSettingsTable() {
    $('#settingsTable').empty();
    for (let key of Object.keys(settings[theEnv])) {
        addTableRow($('#settingsTable')[0], key, settings[theEnv][key] ? truncate(settings[theEnv][key],50) : ' ');
    };
};

function env() {
    return settings[theEnv].api_uri.startsWith('https://things') ? 'things' : 'ditto';
};

let addTableRow = function(table, key, value, selected) {
    let row = table.insertRow();
    row.insertCell(0).innerHTML = key;
    if (value) {
        row.insertCell(1).innerHTML = value;
    }
    if (selected) {
        row.classList.add('bg-info');
    }
    
};

function setAuthHeader() {
    if (!settings[theEnv].bearer && !settings[theEnv].usernamePassword) { return; };
    let auth = settings[theEnv].useBasicAuth ? 'Basic ' + window.btoa(settings[theEnv].usernamePassword) : 'Bearer ' + settings[theEnv].bearer;
    $.ajaxSetup({
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', auth);
        }
    });
};

function truncate(str, n) {
    return (str && str.length > n) ? str.substr(0, n-1) + '&hellip;' : str;
};

function showError(xhr, status, message) {
    $('#errorHeader').text(xhr ? xhr.status : status);
    $('#errorBody').text(xhr ? (xhr.responseJSON ? JSON.stringify(xhr.responseJSON, null, 2) : xhr.statusText) : message);
    $('#errorToast').toast('show');
}

function showSuccess(data, status, xhr) {
    $('#successHeader').text(xhr.status ? xhr.status : status);
    $('#successBody').text(status);
    $('#successToast').toast('show');
}
