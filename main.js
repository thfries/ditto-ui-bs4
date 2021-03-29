var globals = {
    'api_uri': 'https://things.eu-1.bosch-iot-suite.com/api/2',
    'bearer':  ''
}

var theThing;

$(document).ready(function () {
    $('#api_uri').val(globals.api_uri);
    $('#api_uri').change(function() { globals.api_uri = $('#api_uri').val();});
    $('#bearer').val(globals.bearer);
    $('#bearer').change(function() {
        globals.bearer = $('#bearer').val();
        $.ajaxSetup({
            beforeSend: function(xhr) {
                xhr.setRequestHeader('Authorization', 'Bearer ' + globals.bearer);
            }
        })
    });

    $('#thingsTable').on('click', 'tr', function(event) {
        $(this).addClass('bg-info').siblings().removeClass('bg-info');
        refreshThing($(this).text());
    });

    $('#attributesTable').on('click', 'tr', function(event) {
        $(this).addClass('bg-info').siblings().removeClass('bg-info');
        $('#attributePath').val($(this).children(":first").text());
        $('#attributeValue').val($(this).children(":nth-child(2)").text());
    });

    $('#putAttribute').click(function() {
        putAttribute($('#attributePath').val(), $('#attributeValue').val() );
    })

    $('#featuresTable').on('click', 'tr', function(event) {
        $(this).addClass('bg-info').siblings().removeClass('bg-info');
        $('#featureId').val($(this).text());
        $('#featureValue').val(JSON.stringify(theThing.features[$(this).text()], null, 4));
    });

    $('#putFeature').click(function() {
        putFeature($('#featureId').val(), $('#featureValue').val());
    });
    
    $('#searchThings').click(searchThings);
});

var searchThings = function() {
    $.getJSON(globals.api_uri + "/search/things"
    + "?fields=thingId"
    + "&option=limit(0,200),sort(%2BthingId)")
        .done(function(searchResult) {
            $('#thingsTable').empty();
            for (t in searchResult.items) {
                $('#thingsTable')[0].insertRow().insertCell(0).innerHTML = searchResult.items[t].thingId;
            }
        });
}

var refreshThing = function(thingId) {
    $.getJSON(globals.api_uri + "/things/" + thingId + "?fields=thingId%2Cattributes%2Cfeatures%2C_created%2C_modified%2C_revision%2C_policy")
        .done(function(thing, status) {
            theThing = thing;
            // Update fields of Thing table
            $('#thingDetails').empty();
            addTableRow($('#thingDetails')[0], 'thingId', thing.thingId);
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
        });
};

var addTableRow = function(table, key, value) {
    var row = table.insertRow();
    row.insertCell(0).innerHTML = key;
    if (value) {
        row.insertCell(1).innerHTML = value;
    }

}

function putAttribute(key, value) {
    put('/attributes/', key, '"' + value + '"');
}

function putFeature(key, value) {
    put('/features/', key, value);
}

function put(type, key, value) {
    if (key) {
        if (value) {
            $.ajax(globals.api_uri + '/things/' + theThing.thingId + type + key, {
                type: 'PUT',
                contentType: 'application/json',
                data: value,
                success: function (response) {
                    refreshThing(theThing.thingId);
                }
            });
        } else {
            $.ajax(globals.api_uri + '/things/' + theThing.thingId + type + key, {
                type: 'DELETE',
                success: function (response) {
                    refreshThing(theThing.thingId);
                }
            });
        }
    }
}

