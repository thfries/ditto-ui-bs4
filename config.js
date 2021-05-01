const config = {
    things: {
        listConnections: {
            path: '/api/2/solutions/{{solutionId}}/connections',
            method: 'GET',
            body: null,
            unwrapJsonPath: null
        },
        retrieveConnection: {
            path: '/api/2/solutions/{{solutionId}}/connections/{{connectionId}}',
            method: 'GET',
            body: null,
            unwrapJsonPath: null
        },
        createConnection: {
            path: '/api/2/solutions/{{solutionId}}/connections',
            method: 'POST',
            body: '{{connectionJson}}',
            unwrapJsonPath: null
        },
        modifyConnection: {
            path: '/api/2/solutions/{{solutionId}}/connections/{{connectionId}}',
            method: 'PUT',
            body: '{{connectionJson}}',
            unwrapJsonPath: null
        },
        deleteConnection: {
            path: '/api/2/solutions/{{solutionId}}/connections/{{connectionId}}',
            method: 'DELETE',
            body: null,
            unwrapJsonPath: null
        }
    },
    ditto: {
        listConnections: {
            path: '/devops/piggyback/connectivity',
            method: 'POST',
            body: '{ "targetActorSelection": "/user/connectivityRoot/connectionIdsRetrieval/singleton", "headers": { "aggregate": false }, "piggybackCommand": { "type": "connectivity.commands:retrieveAllConnectionIds" } }',
            unwrapJsonPath: '?.?.connectionIds'
        },
        retrieveConnection: {
            path: '/devops/piggyback/connectivity',
            method: 'POST',
            body: '{ "targetActorSelection": "/system/sharding/connection", "headers": { "aggregate": false }, "piggybackCommand": { "type": "connectivity.commands:retrieveConnection", "connectionId": "{{connectionId}}" } }',
            unwrapJsonPath: '?.?.connection'
        },
        createConnection: {
            path: '/devops/piggyback/connectivity',
            method: 'POST',
            body: '{ "targetActorSelection": "/system/sharding/connection", "headers": { "aggregate": false }, "piggybackCommand": { "type": "connectivity.commands:createConnection", "connection": {{connectionJson}} } }',
            unwrapJsonPath: '?.?.connection' 
        },
        modifyConnection: {
            path: '/devops/piggyback/connectivity',
            method: 'POST',
            body: '{ "targetActorSelection": "/system/sharding/connection", "headers": { "aggregate": false }, "piggybackCommand": { "type": "connectivity.commands:modifyConnection", "connection": {{connectionJson}} } }',
            unwrapJsonPath: null
        },
        deleteConnection: {
            path: '/devops/piggyback/connectivity',
            method: 'POST',
            body: '{ "targetActorSelection": "/system/sharding/connection", "headers": { "aggregate": false }, "piggybackCommand": { "type": "connectivity.commands:deleteConnection", "connectionId": "{{connectionId}}" } }',
            unwrapJsonPath: null
        }
    }    
};