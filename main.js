var settings = {
    'api_uri': 'https://things.eu-1.bosch-iot-suite.com/api/2',
    'bearer':  null,
    'solutionId': null
}

var theThing;
var thePolicy;
var thePolicyEntry;
var theConnections;
var connectionIndex;

$(document).ready(function () {
    // Things -----------------------------------
    $('#searchThings').click(searchThings);

    $('#thingsTable').on('click', 'tr', function(event) {
        $(this).addClass('bg-info').siblings().removeClass('bg-info');
        refreshThing($(this).text());
    });

    // Attributes -------------------------------
    $('#attributesTable').on('click', 'tr', function(event) {
        $(this).addClass('bg-info').siblings().removeClass('bg-info');
        $('#attributePath').val($(this).children(":first").text());
        $('#attributeValue').val($(this).children(":nth-child(2)").text());
    });

    $('#putAttribute').click(function() {
        modifyThing('/attributes/', $('#attributePath').val(), $('#attributeValue').val());
    })

    // Features ---------------------------------
    $('#featuresTable').on('click', 'tr', function(event) {
        $(this).addClass('bg-info').siblings().removeClass('bg-info');
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
        modifyThing('/features/', $('#featureId').val(), JSON.stringify(featureObject));
    });

    $('#messageFeature').click(messageFeature);
    
    // Policies ---------------------------------
    $('#policyEntriesTable').on('click', 'tr', function(event) {
        $(this).addClass('bg-info').siblings().removeClass('bg-info');
        thePolicyEntry = $(this).text();
        $('#thePolicyEntry').val(thePolicyEntry);
        refillPolicySubjectsAndRessources();
    });

    $('#refreshPolicy').click(function() { refreshPolicy($('#thePolicyId').val());})
    $('#createPolicyEntry').click(function() { return addOrDeletePolicyEntry('PUT');});
    $('#deletePolicyEntry').click(function() { return addOrDeletePolicyEntry('DELETE');});

    $('#policySubjectsTable').on('click', 'tr', function(event) {
        $(this).addClass('bg-info').siblings().removeClass('bg-info');
        var subject = $(this).children(":first").text();
        $('#policySubjectId').val(subject);
        $('#policySubjectValue').val(JSON.stringify(thePolicy.entries[thePolicyEntry].subjects[subject]));
    });

    $('#policyResourcesTable').on('click', 'tr', function(event) {
        $(this).addClass('bg-info').siblings().removeClass('bg-info');
        var ressource = $(this).children(":first").text();
        $('#policyResourceId').val(ressource);
        $('#policyResourceValue').val(JSON.stringify(thePolicy.entries[thePolicyEntry].resources[ressource]));
    });

    $('#putPolicySubject').click(function() {
        modifyPolicyEntry('/subjects/', $('#policySubjectId').val(), $('#policySubjectValue').val());
    });

    $('#putPolicyResource').click(function () {
        modifyPolicyEntry('/resources/', $('#policyResourceId').val(), $('#policyResourceValue').val());
    })

    // Connections ---------------------------------
    $('#loadConnections').click(loadConnections);    
    $('#connectionsTable').on('click', 'tr', function(event) {
        $(this).addClass('bg-info').siblings().removeClass('bg-info');
        connectionIndex = $(this).index();
        $('#connectionId').val(theConnections[connectionIndex].id);
        $('#connectionJson').val(JSON.stringify(theConnections[connectionIndex], null, 4));
        if (theConnections[connectionIndex].mappingDefinitions.hasOwnProperty('javascript')) {
            $('#connectionIncomingScript').val(theConnections[connectionIndex].mappingDefinitions.javascript.options.incomingScript);
            $('#connectionOutgoingScript').val(theConnections[connectionIndex].mappingDefinitions.javascript.options.outgoingScript);
        } else {
            $('#connectionIncomingScript').val('');
            $('#connectionOutgoingScript').val('');
        }
    });

    $('#connectionIncomingScript').change(function() {
        theConnections[connectionIndex].mappingDefinitions.javascript.options.incomingScript = $('#connectionIncomingScript').val();
    })

    $('#modifyConnection').click(modifyConnection);

    // Settings ----------------------------------
    fillSettings();

    $('#settingsTable').on('click', 'tr', function(event) {
        $(this).addClass('bg-info').siblings().removeClass('bg-info');
        var key = $(this).children(":first").text();
        $('#settingsKey').val(key);
        $('#settingsValue').val(settings[key]);
    });

    $('#saveSetting').click(function() {
        var key = $('#settingsKey').val(); 
        settings[key] = $('#settingsValue').val();
        fillSettings();
        if (key === 'bearer') {
            setBearerHeader();
        }
    })

    if (settings.bearer) {
        setBearerHeader();
    }
});

var searchThings = function() {
    $.getJSON(settings.api_uri + "/search/things"
    + "?fields=thingId"
    + "&option=sort(%2BthingId)")
        .done(function(searchResult) {
            $('#thingsTable').empty();
            for (t in searchResult.items) {
                $('#thingsTable')[0].insertRow().insertCell(0).innerHTML = searchResult.items[t].thingId;
            }
        });
};

var refreshThing = function(thingId) {
    thingId = thingId || theThing.thingId;
    $.getJSON(settings.api_uri + "/things/" + thingId + "?fields=thingId%2Cattributes%2Cfeatures%2C_created%2C_modified%2C_revision%2C_policy")
        .done(function(thing, status) {
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
            for (var key of Object.keys(thing.attributes)) {
                addTableRow($('#attributesTable')[0], key, thing.attributes[key]);
            };
            
            // Update features table
            $('#featuresTable').empty();
            for (var key of Object.keys(thing.features)) {
                addTableRow($('#featuresTable')[0], key);
            };
            
            // Update policy
            $('#thePolicyId').val(thePolicy.policyId);
            refreshPolicy();
        });
};

function modifyThing(type, key, value) {
    if (key) {
        if (value) {
            if (type === '/attributes/') {
                value = '"' + value + '"';
            }
            $.ajax(settings.api_uri + '/things/' + theThing.thingId + type + key, {
                type: 'PUT',
                contentType: 'application/json',
                data: value,
                success: refreshThing
            });
        } else {
            $.ajax(settings.api_uri + '/things/' + theThing.thingId + type + key, {
                type: 'DELETE',
                success: refreshThing
            });
        }
    }
};

var messageFeature = function() {
    var subject = $('#messageFeatureSubject').val();
    var feature = $('#featureId').val();
    var payload = $('#messageFeaturePayload').val();
    if (subject && feature && payload) {
        $.post(settings.api_uri + '/things/' + theThing.thingId + '/features/' + feature + '/inbox/messages/' + subject + '?timeout=' + $('#messageTimeout').val(),
            payload,
            function() {console.log('message sent')}
        );
    }
};

var refreshPolicy = function(policyId) {
    policyId = policyId || thePolicy.policyId;
    $('#policyEntriesTable').empty();
    $.getJSON(settings.api_uri + '/policies/' + policyId)
        .done(function(policy, status) {
            thePolicy = policy;
            for (var key of Object.keys(thePolicy.entries)) {
                addTableRow($('#policyEntriesTable')[0], key, null, key === thePolicyEntry);
                if (key === thePolicyEntry) {
                    refillPolicySubjectsAndRessources();
                }
            };
        })
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
    if (label) {
        $.ajax(settings.api_uri + '/policies/' + thePolicy.policyId + '/entries/' + label, {
            type: method,
            data: JSON.stringify({ subjects: {}, resources: {}}),
            contentType: 'application/json',
            success: refreshPolicy,
            error: function(errorObject) {console.log(errorObject);}
        });
    }
};

function modifyPolicyEntry(type, key, value) {
    if (thePolicyEntry && key) {
        if (value) {
            $.ajax(settings.api_uri + '/policies/' + thePolicy.policyId + '/entries/' + thePolicyEntry + type + key, {
                type: 'PUT',
                contentType: 'application/json',
                data: value,
                success: function (response) {
                    refreshPolicy();
                }
            })
        } else {
            $.ajax(settings.api_uri + '/policies/' + thePolicy.policyId + '/entries/' + thePolicyEntry + type + key, {
                type: 'DELETE',
                success: function (response) {
                    refreshPolicy();
                }
            })
        }
    } else {
        alert('No Policy Entry selected or no key is set!');
    }
};

var loadConnections = function() {
    $.getJSON(settings.api_uri + '/solutions/' + settings.solutionId + '/connections')
        .done(function(connections) {
            theConnections = connections;
            $('#connectionsTable').empty();
            for (var c = 0; c < connections.length; c++) {
                var row = $('#connectionsTable')[0].insertRow();
                row.insertCell(0).innerHTML = connections[c].name;
                row.insertCell(1).innerHTML = connections[c].connectionStatus;
            }
        });

}

var modifyConnection = function() {
    $.ajax(settings.api_uri + '/solutions/' + settings.solutionId + '/connections/' + theConnections[connectionIndex].id, {
        type: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(theConnections[connectionIndex]),
        success: function (response) {
            $('#connectionJson').val(JSON.stringify(theConnections[connectionIndex], null, 4));
        }
    })
}

function fillSettings() {
    $('#settingsTable').empty();
    for (var key of Object.keys(settings)) {
        addTableRow($('#settingsTable')[0], key, truncate(settings[key],50));
    };
}

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

function setBearerHeader() {
    $.ajaxSetup({
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', 'Bearer ' + settings.bearer);
        }
    });
};

function truncate(str, n) {
    return (str && str.length > n) ? str.substr(0, n-1) + '&hellip;' : str;
};

