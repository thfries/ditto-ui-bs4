var settings = {
    local_ditto: {
        api_uri: 'http://localhost:8080',
        solutionId: null,
        bearer:  null,
        usernamePassword: null,
        useBasicAuth: 'true'
    },
    cloud_things_aws: {
        api_uri: 'https://things.eu-1.bosch-iot-suite.com',
        solutionId: null,
        bearer:  null,
        usernamePassword: null,
        useBasicAuth: 'false'
    }
};

var theEnv = 'local_ditto';
var theThing;
var thePolicy;
var thePolicyEntry;
var connectionIdList;
var theConnection;

$(document).ready(function () {

    $('.table').on('click', 'tr', function() {
        $(this).addClass('bg-info').siblings().removeClass('bg-info');
    });

    // Things -----------------------------------
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

    $('#thingsTable').on('click', 'tr', function(event) {
        refreshThing($(this).text());
    });

    // Attributes -------------------------------
    $('#attributesTable').on('click', 'tr', function(event) {
        $('#attributePath').val($(this).children(":first").text());
        $('#attributeValue').val($(this).children(":nth-child(2)").text());
    });

    $('#putAttribute').click(function() {
        var value = $('#attributeValue').val();
        modifyThing(value ? 'PUT' : 'DELETE', '/attributes/', $('#attributePath').val(), value);
    });

    // Features ---------------------------------
    $('#featuresTable').on('click', 'tr', function(event) {
        var featureId = $(this).text();
        $('#featureId').val(featureId);
        $('#featureDefinition').val(theThing.features[featureId].definition);
        $('#featureProperties').val(JSON.stringify(theThing.features[featureId].properties, null, 4));
        $('#featureDesireProperties').val(JSON.stringify(theThing.features[featureId].desiredProperties, null, 4));
    });

    $('#putFeature').click(function() {
        var featureObject = {};
        if ($('#featureDefinition').val()) { featureObject.definition = $('#featureDefinition').val().split(',');};
        if ($('#featureProperties').val()) { featureObject.properties = JSON.parse($('#featureProperties').val());};
        if ($('#featureDesiredProperties').val()) { featureObject.desiredProperties = JSON.parse($('#featureDesiredProperties').val());};
        var featureValue = JSON.stringify(featureObject) === '{}' ? null : JSON.stringify(featureObject);
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
        var subject = $(this).children(":first").text();
        $('#policySubjectId').val(subject);
        $('#policySubjectValue').val(JSON.stringify(thePolicy.entries[thePolicyEntry].subjects[subject]));
    });

    $('#policyResourcesTable').on('click', 'tr', function(event) {
        var ressource = $(this).children(":first").text();
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
            var withJavaScript = theConnection.mappingDefinitions.hasOwnProperty('javascript');
            $('#connectionId').val(theConnection.id);
            $('#connectionJson').val(JSON.stringify(theConnection, null, 4));
            $('#connectionIncomingScript').val(withJavaScript ? theConnection.mappingDefinitions.javascript.options.incomingScript : '');
            $('#connectionOutgoingScript').val(withJavaScript ? theConnection.mappingDefinitions.javascript.options.outgoingScript : '');
        }, $(this)[0].id);
    });

    $('#connectionIncomingScript').change(function() {
        theConnection.mappingDefinitions.javascript.options.incomingScript = $('#connectionIncomingScript').val();
        $('#connectionJson').val(JSON.stringify(theConnection, null, 4));
    });
    $('#connectionOutgoingScript').change(function() {
        theConnection.mappingDefinitions.javascript.options.outgoingScript = $('#connectionOutgoingScript').val();
        $('#connectionJson').val(JSON.stringify(theConnection, null, 4));
    });
    $('#connectionJson').change(function() {
        theConnection = JSON.parse($('#connectionJson').val());
    });

    $('#modifyConnection').click(function() {
        if ($('#connectionJson').val()) {
            callConnectionsAPI(config[env()].modifyConnection, showSuccess, $('#connectionId').val()); 
        } else {
            callConnectionsAPI(config[env()].deleteConnection, loadConnections, $('#connectionId').val()); 
        };
    });

    // Settings ----------------------------------
    fillSettingsEnvTable();
    fillSettingsTable();

    $('#settingsEnvTable').on('click', 'tr', function(event) {
        theEnv = $(this).children(":first").text();
        fillSettingsTable();
        setAuthHeader();
    });

    $('#settingsTable').on('click', 'tr', function(event) {
        var key = $(this).children(":first").text();
        $('#settingsKey').val(key);
        $('#settingsValue').val(settings[theEnv][key]);
    });

    $('#saveSetting').click(function() {
        var key = $('#settingsKey').val(); 
        settings[theEnv][key] = $('#settingsValue').val();
        if (key === 'usernamePassword') {
            settings[theEnv][key] = window.btoa(settings[theEnv][key]);
        };
        fillSettingsTable();
        setAuthHeader();
    })

    setAuthHeader();
});

var searchThings = function() {
    $.getJSON(settings[theEnv].api_uri + "/api/2/search/things"
    + "?fields=thingId"
    + "&option=sort(%2BthingId)")
        .done(function(searchResult) {
            $('#thingsTable').empty();
            for (t in searchResult.items) {
                $('#thingsTable')[0].insertRow().insertCell(0).innerHTML = searchResult.items[t].thingId;
            }
        }).fail(showError);
};

var refreshThing = function(thingId) {
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
            if (thing.attributes) {
                for (var key of Object.keys(thing.attributes)) {
                    addTableRow($('#attributesTable')[0], key, thing.attributes[key]);
                };
            }
            
            // Update features table
            $('#featuresTable').empty();
            if (thing.features) {
                for (var key of Object.keys(thing.features)) {
                    addTableRow($('#featuresTable')[0], key);
                };
            }
            
            // Update policy
            $('#thePolicyId').val(thePolicy.policyId);
            refreshPolicy();
        }).fail(showError);
};

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

var messageFeature = function() {
    var subject = $('#messageFeatureSubject').val();
    var feature = $('#featureId').val();
    var payload = $('#messageFeaturePayload').val();
    if (subject && feature && payload) {
        $.post(settings[theEnv].api_uri + '/api/2/things/' + theThing.thingId + '/features/' + feature + '/inbox/messages/' + subject + '?timeout=' + $('#messageTimeout').val(),
            payload,
            showSuccess
        );
    } else {
        showError(null, 'Error', 'FeatureId or Subject or Payload is empty');
    }
};

var refreshPolicy = function() {
    var policyId = thePolicy ? thePolicy.policyId : $('#thePolicyId').val();
    if (policyId === '') { showError(null, 'Error', 'policyId is empty'); return; }
    $.getJSON(settings[theEnv].api_uri + '/api/2/policies/' + policyId)
        .done(function(policy, status, xhr) {
            showSuccess(null, status, xhr);
            thePolicy = policy;
            $('#policyEntriesTable').empty();
            for (var key of Object.keys(thePolicy.entries)) {
                addTableRow($('#policyEntriesTable')[0], key, null, key === thePolicyEntry);
                if (key === thePolicyEntry) {
                    refillPolicySubjectsAndRessources();
                }
            };
        }).fail(showError);       
};

function refillPolicySubjectsAndRessources() {
    $('#policySubjectsTable').empty();
    for (var key of Object.keys(thePolicy.entries[thePolicyEntry].subjects)) {
        addTableRow($('#policySubjectsTable')[0], key, JSON.stringify(thePolicy.entries[thePolicyEntry].subjects[key]));
    }
    $('#policyResourcesTable').empty();
    for (var key of Object.keys(thePolicy.entries[thePolicyEntry].resources)) {
        addTableRow($('#policyResourcesTable')[0], key, JSON.stringify(thePolicy.entries[thePolicyEntry].resources[key]));
    }
};

var addOrDeletePolicyEntry = function(method) {
    var label = $('#thePolicyEntry').val();
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

var loadConnections = function() {
    callConnectionsAPI(config[env()].listConnections, function(connections) {
        connectionIdList = [];
        $('#connectionsTable').empty();
        for (var c = 0; c < connections.length; c++) {
            var id = env() === 'things' ? connections[c].id : connections[c];
            connectionIdList.push(id);
            var row = $('#connectionsTable')[0].insertRow();
            row.id = id;
            row.insertCell(0).innerHTML = id;
            callConnectionsAPI(config[env()].retrieveStatus, updateConnectionRow(row, 'liveStatus', -1), id);
            callConnectionsAPI(config[env()].retrieveConnection, updateConnectionRow(row, 'name', 0), id);
        };
    });
};

var updateConnectionRow = function (targetRow, fieldToExtract, index) {
    return function(data) {
        targetRow.insertCell(index).innerHTML = data[fieldToExtract];
    };
};

function callConnectionsAPI(params, successCallback, connectionId) {
    if (env() === 'things' && !settings[theEnv].solutionId) { showError(null, 'Error', 'SolutionId is empty'); return; };
    $.ajax(settings[theEnv].api_uri + params.path.replace('{{solutionId}}', settings[theEnv].solutionId).replace('{{connectionId}}', connectionId), {
        type: params.method,
        data: params.body ? params.body.replace('{{connectionId}}', connectionId).replace('{{connectionJson}}', JSON.stringify(theConnection)) : null,
        contentType: 'application/json',
        success: function(data, status, xhr) {
            if(data['?'] && data['?']['?'].status >= 400) {
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

function fillSettingsEnvTable() {
    $('#settingsEnvTable').empty();
    for (var key of Object.keys(settings)) {
        addTableRow($('#settingsEnvTable')[0], key, null, key === theEnv);
    };
}

function fillSettingsTable() {
    $('#settingsTable').empty();
    for (var key of Object.keys(settings[theEnv])) {
        addTableRow($('#settingsTable')[0], key, settings[theEnv][key] ? truncate(settings[theEnv][key],50) : ' ');
    };
};

function env() {
    return settings[theEnv].api_uri.startsWith('https://things') ? 'things' : 'ditto';
};

var addTableRow = function(table, key, value, selected) {
    var row = table.insertRow();
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
    var auth = settings[theEnv].useBasicAuth === 'true' ? 'Basic ' + settings[theEnv].usernamePassword : 'Bearer ' + settings[theEnv].bearer;
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
    $('#errorBody').text(xhr ? (xhr.responseJSON ? JSON.stringify(xhr.responseJSON, null, 2) : xhr.responseText) : message);
    $('#errorToast').toast('show');
}

function showSuccess(data, status, xhr) {
    $('#successHeader').text(xhr.status ? xhr.status : status);
    $('#successBody').text(status);
    $('#successToast').toast('show');
}
