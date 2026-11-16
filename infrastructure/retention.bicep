param audience string
param actionGroupId string
param enabled bool = false

var jobNames = ['retention', 'retention-watch']

resource workflows 'Microsoft.Logic/workflows@2019-05-01' = [for (name, index) in jobNames: {
  name: 'logic-binso-one-${name}-prod'
  location: 'switzerlandnorth'
  identity: index == 0 ? { type: 'SystemAssigned' } : null
  properties: {
    state: enabled ? 'Enabled' : 'Disabled'
    definition: {
      '$schema': 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#'
      contentVersion: '1.0.0.0'
      triggers: {
        Schedule: {
          type: 'Recurrence'
          recurrence: index == 0 ? {
            frequency: 'Day'
            interval: 1
            timeZone: 'W. Europe Standard Time'
            schedule: { hours: [3], minutes: [17] }
          } : {
            frequency: 'Hour'
            interval: 6
          }
        }
      }
      actions: {
        Request: {
          type: 'Http'
          inputs: union({
            method: index == 0 ? 'POST' : 'GET'
            uri: index == 0 ? 'https://one.binso.ch/api/jobs/retention' : 'https://one.binso.ch/api/health/retention'
            retryPolicy: {
              type: 'fixed'
              count: 2
              interval: 'PT1M'
            }
          }, index == 0 ? {
            authentication: {
              type: 'ManagedServiceIdentity'
              audience: audience
            }
          } : {})
        }
      }
    }
  }
}]

resource alerts 'Microsoft.Insights/metricAlerts@2018-03-01' = [for (name, index) in jobNames: {
  name: 'alrt-binso-one-prod-${name}'
  location: 'global'
  properties: {
    description: index == 0 ? 'Authentication retention job failed' : 'Authentication retention has no verified success within 36 hours or the status check failed'
    severity: 2
    enabled: enabled
    scopes: [workflows[index].id]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'FailedWorkflowRuns'
          criterionType: 'StaticThresholdCriterion'
          metricNamespace: 'Microsoft.Logic/workflows'
          metricName: 'RunsFailed'
          timeAggregation: 'Total'
          operator: 'GreaterThan'
          threshold: 0
        }
      ]
    }
    actions: [{ actionGroupId: actionGroupId }]
  }
}]

output principalId string = workflows[0].identity.principalId
